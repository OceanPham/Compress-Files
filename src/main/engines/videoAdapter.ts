import fs from 'node:fs'
import path from 'node:path'
import {
  AudioTrackInfo,
  CompressionJob,
  convertToBytes,
  JobProgressInfo,
  JobResultInfo,
  JobStatus,
  SubtitleTrackInfo,
  VideoProbeInfo
} from '../../shared/types'
import { getBinaryPath, runManagedProcess } from '../utils/binaries'
import {
  allocateUniqueOutputPath,
  buildPlannedOutputPath,
  cleanupJobTempDir,
  createJobTempDir,
  finalizeTempFileToOutput,
  releaseReservedOutputPath
} from '../utils/fileSafety'

const SUPPORTED_INPUT_VIDEO_CODECS = new Set([
  'h264',
  'hevc',
  'vp8',
  'vp9',
  'av1',
  'mpeg4',
  'mpeg2video',
  'mpeg1video',
  'prores',
  'mjpeg',
  'wmv3',
  'vc1',
  'theora',
  'dnxhd'
])

function parseFraction(rateStr: string | undefined): number {
  if (!rateStr || rateStr === '0/0') return 0
  const parts = rateStr.split('/')
  if (parts.length === 2) {
    const num = Number(parts[0])
    const den = Number(parts[1])
    if (den > 0 && Number.isFinite(num)) return Number((num / den).toFixed(3))
  }
  const val = Number(rateStr)
  return Number.isFinite(val) ? val : 0
}

async function generateVideoThumbnailDataUrl(
  filePath: string,
  durationSec: number
): Promise<string | undefined> {
  try {
    const ffmpegPath = getBinaryPath('ffmpeg')
    const seekSec = durationSec > 2 ? Math.min(5, Math.floor(durationSec * 0.15)) : 0
    const tmpThumb = path.join(
      path.dirname(filePath),
      `.fc_tmp_thumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    )
    try {
      const res = await runManagedProcess({
        exePath: ffmpegPath,
        args: [
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          String(seekSec),
          '-i',
          filePath,
          '-frames:v',
          '1',
          '-vf',
          "scale='min(320,iw)':-2",
          '-q:v',
          '5',
          '-y',
          tmpThumb
        ],
        timeoutMs: 8000
      })
      if (res.exitCode === 0 && fs.existsSync(tmpThumb)) {
        const buf = fs.readFileSync(tmpThumb)
        return `data:image/jpeg;base64,${buf.toString('base64')}`
      }
    } finally {
      if (fs.existsSync(tmpThumb)) {
        try {
          fs.unlinkSync(tmpThumb)
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore thumbnail errors
  }
  return undefined
}

export async function probeVideoFile(filePath: string): Promise<{
  probe?: VideoProbeInfo
  unsupportedReason?: string
}> {
  const ffprobePath = getBinaryPath('ffprobe')
  let stdoutJson = ''

  const res = await runManagedProcess({
    exePath: ffprobePath,
    args: [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath
    ],
    timeoutMs: 15000,
    onStdoutLine: (line) => {
      stdoutJson += line + '\n'
    }
  })

  if (res.exitCode !== 0 || !stdoutJson.trim()) {
    return {
      unsupportedReason: 'File video bị hỏng hoặc không thể phân tích cấu trúc container bằng ffprobe.'
    }
  }

  let parsed: any
  try {
    parsed = JSON.parse(stdoutJson)
  } catch {
    return {
      unsupportedReason: 'Dữ liệu metadata ffprobe trả về không hợp lệ.'
    }
  }

  const streams: any[] = Array.isArray(parsed.streams) ? parsed.streams : []
  const formatObj: any = parsed.format || {}

  const videoStreams = streams.filter(
    (s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1
  )
  if (videoStreams.length === 0) {
    return {
      unsupportedReason: 'File không chứa luồng hình ảnh (video stream) hợp lệ.'
    }
  }

  const vStream = videoStreams[0]
  const codecName = String(vStream.codec_name || '').toLowerCase()
  if (!SUPPORTED_INPUT_VIDEO_CODECS.has(codecName)) {
    return {
      unsupportedReason: `Codec video "${codecName || 'unknown'}" nằm ngoài danh sách codec đã kiểm chứng.`
    }
  }

  const pixFmt = String(vStream.pix_fmt || 'yuv420p').toLowerCase()
  const rawBits = Number(vStream.bits_per_raw_sample || 0)
  const bitDepth =
    rawBits >= 10 ||
    pixFmt.includes('10le') ||
    pixFmt.includes('10be') ||
    pixFmt.includes('12le') ||
    pixFmt.includes('p010')
      ? 10
      : 8

  const colorTransfer = String(vStream.color_transfer || '').toLowerCase()
  const colorPrimaries = String(vStream.color_primaries || '').toLowerCase()
  const hasDovi =
    Array.isArray(vStream.side_data_list) &&
    vStream.side_data_list.some((sd: any) =>
      String(sd.side_data_type || '').toLowerCase().includes('dovi')
    )

  const isHdr =
    colorTransfer === 'smpte2084' ||
    colorTransfer === 'arib-std-b67' ||
    colorPrimaries === 'bt2020' ||
    hasDovi

  if (isHdr || bitDepth > 8) {
    return {
      unsupportedReason: `Video nguồn là ${isHdr ? 'HDR / Dolby Vision' : `${bitDepth}-bit`} (${pixFmt}, ${colorTransfer || '10-bit'}). Ứng dụng từ chối tự động hạ bit-depth hoặc chuyển HDR sang SDR để tránh làm sai lệch màu sắc.`
    }
  }

  const width = Number(vStream.width || 0)
  const height = Number(vStream.height || 0)
  const durationSec = Number(formatObj.duration || vStream.duration || 0)

  if (width <= 0 || height <= 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
    return {
      unsupportedReason: 'Video không có thông số thời lượng (duration) hoặc kích thước khung hình hợp lệ.'
    }
  }

  // Rotation detection
  let rotation = 0
  if (vStream.tags?.rotate) {
    rotation = Number(vStream.tags.rotate) || 0
  } else if (Array.isArray(vStream.side_data_list)) {
    const rotData = vStream.side_data_list.find(
      (sd: any) => typeof sd.rotation === 'number'
    )
    if (rotData) rotation = Number(rotData.rotation) || 0
  }

  const rFps = parseFraction(vStream.r_frame_rate)
  const avgFps = parseFraction(vStream.avg_frame_rate)
  const fps = avgFps > 0 ? avgFps : rFps > 0 ? rFps : 30
  const isVfr = rFps > 0 && avgFps > 0 && Math.abs(rFps - avgFps) > 1.5

  const audioTracks: AudioTrackInfo[] = streams
    .filter((s) => s.codec_type === 'audio')
    .map((s) => ({
      streamIndex: Number(s.index),
      codec: String(s.codec_name || 'unknown').toLowerCase(),
      channels: Number(s.channels || 2),
      sampleRate: Number(s.sample_rate || 44100),
      bitrateKbps: s.bit_rate ? Math.round(Number(s.bit_rate) / 1000) : undefined,
      language: s.tags?.language,
      title: s.tags?.title
    }))

  const subtitleTracks: SubtitleTrackInfo[] = streams
    .filter((s) => s.codec_type === 'subtitle')
    .map((s) => ({
      streamIndex: Number(s.index),
      codec: String(s.codec_name || 'unknown').toLowerCase(),
      language: s.tags?.language,
      title: s.tags?.title
    }))

  const thumbnailDataUrl = await generateVideoThumbnailDataUrl(filePath, durationSec)

  return {
    probe: {
      kind: 'video',
      container: String(formatObj.format_name || path.extname(filePath).slice(1)).split(',')[0],
      videoCodec: codecName,
      width,
      height,
      rotation,
      durationSec,
      fps,
      isVfr,
      pixelFormat: pixFmt,
      bitDepth,
      isHdr,
      colorTransfer: colorTransfer || undefined,
      colorPrimaries: colorPrimaries || undefined,
      sampleAspectRatio: vStream.sample_aspect_ratio,
      audioTracks,
      subtitleTracks,
      totalBitrateKbps: formatObj.bit_rate
        ? Math.round(Number(formatObj.bit_rate) / 1000)
        : undefined,
      thumbnailDataUrl
    }
  }
}

function buildScaleFilter(
  probe: VideoProbeInfo,
  maxResolutionCap: 'keep' | number
): string {
  // Respect display orientation when capping resolution
  const isRotated90 = Math.abs(probe.rotation) === 90 || Math.abs(probe.rotation) === 270
  const displayW = isRotated90 ? probe.height : probe.width
  const displayH = isRotated90 ? probe.width : probe.height
  const shortSide = Math.min(displayW, displayH)

  if (maxResolutionCap === 'keep' || shortSide <= maxResolutionCap) {
    // Ensure even dimensions required by H.264 yuv420p
    return "scale='trunc(iw/2)*2:trunc(ih/2)*2'"
  }

  const ratio = maxResolutionCap / shortSide
  const targetW = Math.max(2, Math.floor((displayW * ratio) / 2) * 2)
  const targetH = Math.max(2, Math.floor((displayH * ratio) / 2) * 2)
  return `scale=${targetW}:${targetH}`
}

export async function executeVideoJob(
  job: CompressionJob,
  probe: VideoProbeInfo,
  onProgress: (p: JobProgressInfo) => void,
  onLog: (line: string) => void,
  signal: AbortSignal
): Promise<{ status: JobStatus; result?: JobResultInfo; reason?: string }> {
  const startTime = Date.now()
  const sourcePath = job.primarySourcePath
  const config = job.configSnapshot.video
  const ffmpegPath = getBinaryPath('ffmpeg')

  if (!fs.existsSync(sourcePath)) {
    return { status: 'failed', reason: 'File video nguồn không còn tồn tại trên ổ đĩa.' }
  }
  const currentStat = fs.statSync(sourcePath)
  if (currentStat.size !== job.inputSizeBytes) {
    return {
      status: 'failed',
      reason: 'File video nguồn đã bị thay đổi trong khi chờ xử lý.'
    }
  }

  // Validate subtitle compatibility before running
  const TEXT_SUBTITLE_CODECS = new Set(['subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text'])
  if (config.subtitlePolicy === 'mov_text' && probe.subtitleTracks.length > 0) {
    const selectedSub =
      config.selectedSubtitleStreamIndex !== undefined
        ? probe.subtitleTracks.find((s) => s.streamIndex === config.selectedSubtitleStreamIndex)
        : probe.subtitleTracks[0]

    if (selectedSub && !TEXT_SUBTITLE_CODECS.has(selectedSub.codec)) {
      return {
        status: 'unsupported',
        reason: `Track phụ đề đã chọn dùng định dạng ảnh bitmap (${selectedSub.codec}), container MP4 (mov_text) không hỗ trợ trực tiếp. Vui lòng chọn chế độ "Bỏ phụ đề" trong cấu hình Video để tiếp tục.`
      }
    }
  }

  const plannedPath = buildPlannedOutputPath(
    sourcePath,
    '.mp4',
    job.configSnapshot,
    job.relativeFolder
  )
  const tempDir = createJobTempDir(path.dirname(plannedPath), job.id)

  try {
    // Select audio stream
    const hasAudio = probe.audioTracks.length > 0 && config.audioMode !== 'none'
    const chosenAudioTrack = hasAudio
      ? probe.audioTracks.find((a) => a.streamIndex === config.selectedAudioStreamIndex) ||
        probe.audioTracks[0]
      : undefined

    // Determine audio args
    const canCopyAudio =
      chosenAudioTrack &&
      config.mode === 'quality' &&
      config.audioMode === 'auto_copy_or_aac' &&
      ['aac', 'mp3'].includes(chosenAudioTrack.codec) &&
      (!chosenAudioTrack.bitrateKbps || chosenAudioTrack.bitrateKbps <= config.audioBitrateKbps + 32)

    const buildAudioArgs = (forceAacEncode = false): string[] => {
      if (!chosenAudioTrack) {
        return ['-an']
      }
      if (canCopyAudio && !forceAacEncode) {
        return ['-map', `0:${chosenAudioTrack.streamIndex}`, '-c:a', 'copy']
      }
      return [
        '-map',
        `0:${chosenAudioTrack.streamIndex}`,
        '-c:a',
        'aac',
        '-b:a',
        `${config.audioBitrateKbps}k`,
        '-ac',
        String(Math.min(2, chosenAudioTrack.channels || 2))
      ]
    }

    const buildSubtitleArgs = (): string[] => {
      if (config.subtitlePolicy !== 'mov_text' || probe.subtitleTracks.length === 0) {
        return ['-sn']
      }
      const chosenSub =
        probe.subtitleTracks.find((s) => s.streamIndex === config.selectedSubtitleStreamIndex) ||
        probe.subtitleTracks[0]
      if (!chosenSub) return ['-sn']
      return ['-map', `0:${chosenSub.streamIndex}`, '-c:s', 'mov_text']
    }

    const buildFilterAndTimingArgs = (resCap: 'keep' | number): string[] => {
      const filters: string[] = [buildScaleFilter(probe, resCap)]
      if (config.maxFps !== 'keep' && probe.fps > config.maxFps) {
        filters.push(`fps=${config.maxFps}`)
      }
      const args = ['-vf', filters.join(',')]
      if (config.maxFps === 'keep') {
        args.push('-fps_mode', 'passthrough')
      }
      return args
    }

    const runFfmpegWithProgress = async (
      args: string[],
      phase: JobProgressInfo['phase'],
      pass?: number,
      totalPasses?: number,
      detailPrefix = 'Đang mã hóa video'
    ): Promise<{ exitCode: number; cancelled: boolean; stderrTail: string[] }> => {
      const fullArgs = ['-hide_banner', '-nostats', '-progress', 'pipe:1', ...args]
      const res = await runManagedProcess({
        exePath: ffmpegPath,
        args: fullArgs,
        cwd: tempDir,
        signal,
        timeoutMs: 30 * 60 * 1000,
        onStdoutLine: (line) => {
          if (line.startsWith('out_time_us=') || line.startsWith('out_time_ms=')) {
            const rawUs = Number(line.split('=')[1])
            if (Number.isFinite(rawUs) && rawUs >= 0 && probe.durationSec > 0) {
              const sec = rawUs / 1_000_000
              const pct = Math.max(0, Math.min(99, Math.round((sec / probe.durationSec) * 100)))
              onProgress({
                phase,
                percent: pct,
                pass,
                totalPasses,
                detailText: `${detailPrefix} (${pct}%)`
              })
            }
          }
        },
        onStderrLine: (line) => {
          onLog(line)
        }
      })
      return res
    }

    const tempOut = path.join(tempDir, 'output.mp4')

    // =========================================================================
    // MODE 1: TARGET SIZE (2-Pass with Bitrate Budget & Resolution Floor)
    // =========================================================================
    if (config.mode === 'target_size') {
      const targetBytes = convertToBytes(config.targetSizeValue, config.targetSizeUnit)
      // Reserve 3% or min 48 KB for MP4 container/moov atom overhead
      const containerOverheadBytes = Math.max(48 * 1024, Math.round(targetBytes * 0.03))
      const effectiveBudgetBits = Math.max(0, (targetBytes - containerOverheadBytes) * 8)

      const audioKbps = chosenAudioTrack ? Math.min(config.audioBitrateKbps, 128) : 0
      const audioBits = audioKbps * 1000 * probe.durationSec
      const availableVideoBits = effectiveBudgetBits - audioBits
      const rawVideoKbps = Math.floor(availableVideoBits / probe.durationSec / 1000)

      if (rawVideoKbps < config.targetMinVideoBitrateKbps) {
        return {
          status: 'target_unmet',
          reason: `Ngân sách dung lượng (${config.targetSizeValue} ${config.targetSizeUnit} cho video dài ${probe.durationSec.toFixed(1)}s) chỉ cho phép bitrate hình ảnh ~${Math.max(0, rawVideoKbps)} kbps, thấp hơn giới hạn tối thiểu (${config.targetMinVideoBitrateKbps} kbps). Không cắt ngắn video hoặc tự ý hạ chất lượng sâu hơn ngưỡng cho phép.`
        }
      }

      // Choose appropriate resolution cap for the target bitrate
      const isRotated90 = Math.abs(probe.rotation) === 90 || Math.abs(probe.rotation) === 270
      const sourceShortSide = Math.min(
        isRotated90 ? probe.height : probe.width,
        isRotated90 ? probe.width : probe.height
      )
      let initialResCap: 'keep' | number =
        config.maxResolution === 'keep' ? sourceShortSide : Math.min(sourceShortSide, config.maxResolution)

      if (rawVideoKbps < 900 && initialResCap > 720 && config.targetMinResolution <= 720) {
        initialResCap = 720
      }
      if (rawVideoKbps < 450 && initialResCap > 480 && config.targetMinResolution <= 480) {
        initialResCap = 480
      }

      const passLogPrefix = path.join(tempDir, 'ffmpeg2pass')
      let successTempFile: string | null = null
      let attemptsUsed = 0

      for (let attempt = 1; attempt <= 2; attempt++) {
        attemptsUsed = attempt
        const factor = attempt === 1 ? 0.96 : 0.84
        const attemptVideoKbps = Math.max(
          config.targetMinVideoBitrateKbps,
          Math.floor(rawVideoKbps * factor)
        )
        const resCapForAttempt =
          attempt === 2 && initialResCap > config.targetMinResolution
            ? config.targetMinResolution
            : initialResCap

        const filterArgs = buildFilterAndTimingArgs(resCapForAttempt)
        const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null'

        // PASS 1
        onProgress({
          phase: 'pass1',
          percent: 0,
          pass: 1,
          totalPasses: 2,
          attempt,
          maxAttempts: 2,
          detailText: `Pass 1/2 (Phân tích chuyển động ở ${attemptVideoKbps} kbps)...`
        })

        const pass1Res = await runFfmpegWithProgress(
          [
            '-y',
            '-i',
            sourcePath,
            '-map',
            '0:v:0',
            ...filterArgs,
            '-c:v',
            'libx264',
            '-b:v',
            `${attemptVideoKbps}k`,
            '-maxrate',
            `${Math.round(attemptVideoKbps * 1.15)}k`,
            '-bufsize',
            `${Math.round(attemptVideoKbps * 2)}k`,
            '-preset',
            config.encoderPreset,
            '-pix_fmt',
            'yuv420p',
            '-pass',
            '1',
            '-passlogfile',
            passLogPrefix,
            '-an',
            '-sn',
            '-f',
            'null',
            nullSink
          ],
          'pass1',
          1,
          2,
          `Pass 1/2 (Lần ${attempt})`
        )

        if (pass1Res.cancelled || signal.aborted) {
          return { status: 'cancelled', reason: 'Đã hủy tiến trình mã hóa video.' }
        }
        if (pass1Res.exitCode !== 0) {
          return {
            status: 'failed',
            reason: `FFmpeg lỗi ở Pass 1 (code ${pass1Res.exitCode}): ${pass1Res.stderrTail.slice(-2).join(' | ')}`
          }
        }

        // PASS 2
        const attemptOut = path.join(tempDir, `output_attempt_${attempt}.mp4`)
        onProgress({
          phase: 'pass2',
          percent: 0,
          pass: 2,
          totalPasses: 2,
          attempt,
          maxAttempts: 2,
          detailText: `Pass 2/2 (Mã hóa hoàn chỉnh ở ${attemptVideoKbps} kbps)...`
        })

        const audioArgsPass2 = chosenAudioTrack
          ? [
              '-map',
              `0:${chosenAudioTrack.streamIndex}`,
              '-c:a',
              'aac',
              '-b:a',
              `${audioKbps}k`,
              '-ac',
              String(Math.min(2, chosenAudioTrack.channels || 2))
            ]
          : ['-an']

        const pass2Res = await runFfmpegWithProgress(
          [
            '-y',
            '-i',
            sourcePath,
            '-map',
            '0:v:0',
            ...filterArgs,
            '-c:v',
            'libx264',
            '-b:v',
            `${attemptVideoKbps}k`,
            '-maxrate',
            `${Math.round(attemptVideoKbps * 1.15)}k`,
            '-bufsize',
            `${Math.round(attemptVideoKbps * 2)}k`,
            '-preset',
            config.encoderPreset,
            '-pix_fmt',
            'yuv420p',
            '-pass',
            '2',
            '-passlogfile',
            passLogPrefix,
            ...audioArgsPass2,
            ...buildSubtitleArgs(),
            '-movflags',
            '+faststart',
            attemptOut
          ],
          'pass2',
          2,
          2,
          `Pass 2/2 (Lần ${attempt})`
        )

        if (pass2Res.cancelled || signal.aborted) {
          return { status: 'cancelled', reason: 'Đã hủy tiến trình mã hóa video.' }
        }
        if (pass2Res.exitCode !== 0 || !fs.existsSync(attemptOut)) {
          return {
            status: 'failed',
            reason: `FFmpeg lỗi ở Pass 2 (code ${pass2Res.exitCode}): ${pass2Res.stderrTail.slice(-2).join(' | ')}`
          }
        }

        const outSize = fs.statSync(attemptOut).size
        if (outSize <= targetBytes) {
          successTempFile = attemptOut
          break
        }
      }

      if (!successTempFile) {
        return {
          status: 'target_unmet',
          reason: `Sau ${attemptsUsed} lượt mã hóa 2-pass, dung lượng video vẫn vượt giới hạn ${config.targetSizeValue} ${config.targetSizeUnit} trong ngưỡng cấu hình tối thiểu cho phép. Giữ nguyên file gốc.`
        }
      }

      fs.copyFileSync(successTempFile, tempOut)
    } else {
      // =========================================================================
      // MODE 2: QUALITY PRESET MODE (CRF)
      // =========================================================================
      const filterArgs = buildFilterAndTimingArgs(config.maxResolution)
      let warningMessage: string | undefined

      const runSinglePassEncode = async (useHw: boolean): Promise<{
        exitCode: number
        cancelled: boolean
        stderrTail: string[]
      }> => {
        const videoCodecArgs = useHw
          ? ['-c:v', 'h264_nvenc', '-cq', String(config.crf), '-preset', 'p4', '-pix_fmt', 'yuv420p']
          : [
              '-c:v',
              'libx264',
              '-crf',
              String(config.crf),
              '-preset',
              config.encoderPreset,
              '-pix_fmt',
              'yuv420p'
            ]

        return runFfmpegWithProgress(
          [
            '-y',
            '-i',
            sourcePath,
            '-map',
            '0:v:0',
            ...filterArgs,
            ...videoCodecArgs,
            ...buildAudioArgs(false),
            ...buildSubtitleArgs(),
            '-movflags',
            '+faststart',
            tempOut
          ],
          'encoding',
          1,
          1,
          useHw ? 'Đang mã hóa bằng phần cứng (GPU)' : 'Đang mã hóa H.264 (CPU)'
        )
      }

      let encRes = await runSinglePassEncode(config.useHardwareEncoder)
      if (!encRes.cancelled && encRes.exitCode !== 0 && config.useHardwareEncoder) {
        onLog('[VideoAdapter] Hardware encoder không khả dụng trên thiết bị này, chuyển về libx264 chuẩn.')
        warningMessage = 'Bộ mã hóa phần cứng GPU không khả dụng, đã tự động dùng bộ mã hóa chuẩn libx264.'
        encRes = await runSinglePassEncode(false)
      }

      if (encRes.cancelled || signal.aborted) {
        return { status: 'cancelled', reason: 'Đã hủy tiến trình mã hóa video.' }
      }
      if (encRes.exitCode !== 0 || !fs.existsSync(tempOut)) {
        return {
          status: 'failed',
          reason: `Mã hóa video thất bại (exit ${encRes.exitCode}): ${encRes.stderrTail.slice(-2).join(' | ')}`
        }
      }
      if (warningMessage) {
        onLog(warningMessage)
      }
    }

    // =========================================================================
    // POST-ENCODE VERIFICATION (ffprobe + decode check)
    // =========================================================================
    onProgress({
      phase: 'validating',
      percent: 96,
      detailText: 'Đang kiểm chứng cấu trúc stream, thời lượng và giải mã thử...'
    })

    const outStat = fs.statSync(tempOut)
    if (outStat.size === 0) {
      return { status: 'failed', reason: 'File video đầu ra có kích thước 0 byte.' }
    }

    const { probe: outProbe, unsupportedReason: outProbeErr } = await probeVideoFile(tempOut)
    if (!outProbe || outProbeErr) {
      return {
        status: 'failed',
        reason: `File video đầu ra không vượt qua bước kiểm tra ffprobe: ${outProbeErr || 'unknown'}`
      }
    }

    // Check duration consistency (within 1.5s tolerance)
    if (Math.abs(outProbe.durationSec - probe.durationSec) > 1.5) {
      return {
        status: 'failed',
        reason: `Thời lượng video đầu ra (${outProbe.durationSec.toFixed(1)}s) lệch bất thường so với nguồn (${probe.durationSec.toFixed(1)}s).`
      }
    }

    // Check audio presence if expected
    if (chosenAudioTrack && outProbe.audioTracks.length === 0) {
      return {
        status: 'failed',
        reason: 'Video đầu ra bị thiếu luồng âm thanh (audio stream) so với yêu cầu.'
      }
    }

    // Fast decode verification of output stream
    const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null'
    const decodeVerify = await runManagedProcess({
      exePath: ffmpegPath,
      args: ['-v', 'error', '-i', tempOut, '-t', '3', '-f', 'null', nullSink],
      timeoutMs: 15000,
      signal
    })
    if (decodeVerify.exitCode !== 0) {
      return {
        status: 'failed',
        reason: `Kiểm tra giải mã luồng đầu ra thất bại: ${decodeVerify.stderrTail.join(' ')}`
      }
    }

    // Savings / format conversion evaluation
    const isContainerChanged = !['mp4', 'mov'].includes(probe.container.toLowerCase()) || probe.videoCodec !== 'h264'
    const isResized = outProbe.width < probe.width || outProbe.height < probe.height

    if (outStat.size >= job.inputSizeBytes && config.mode === 'quality') {
      if (!isContainerChanged && !isResized) {
        return {
          status: 'no_savings',
          reason: `Video nguồn đã có bitrate rất tối ưu (${outStat.size} B >= nguồn ${job.inputSizeBytes} B). Giữ nguyên file gốc.`,
          result: {
            outputPath: sourcePath,
            outputSizeBytes: job.inputSizeBytes,
            savedBytes: 0,
            savedPercent: 0,
            durationMs: Date.now() - startTime,
            finalWidth: probe.width,
            finalHeight: probe.height,
            keptOriginalAsFinal: true,
            validationSummary: 'Video nguồn đã tối ưu tốt ở mức chất lượng này (No Savings).'
          }
        }
      }

      const allocatedPath = allocateUniqueOutputPath(plannedPath, [sourcePath])
      try {
        finalizeTempFileToOutput(tempOut, allocatedPath, [sourcePath])
      } finally {
        releaseReservedOutputPath(allocatedPath)
      }

      const diffBytes = job.inputSizeBytes - outStat.size
      const diffPercent = Number(((diffBytes / job.inputSizeBytes) * 100).toFixed(1))

      return {
        status: 'converted_not_smaller',
        reason: 'Đã chuyển sang MP4 (H.264) hợp lệ nhưng dung lượng lớn hơn nguồn.',
        result: {
          outputPath: allocatedPath,
          outputSizeBytes: outStat.size,
          savedBytes: diffBytes,
          savedPercent: diffPercent,
          durationMs: Date.now() - startTime,
          finalWidth: outProbe.width,
          finalHeight: outProbe.height,
          validationSummary: `MP4 H.264 (${outProbe.width}x${outProbe.height}, ${outProbe.durationSec.toFixed(1)}s) đã kiểm chứng decode & đồng bộ.`
        }
      }
    }

    const allocatedPath = allocateUniqueOutputPath(plannedPath, [sourcePath])
    try {
      finalizeTempFileToOutput(tempOut, allocatedPath, [sourcePath])
    } finally {
      releaseReservedOutputPath(allocatedPath)
    }

    const savedBytes = job.inputSizeBytes - outStat.size
    const savedPercent = Number(((savedBytes / job.inputSizeBytes) * 100).toFixed(1))

    return {
      status: 'completed',
      result: {
        outputPath: allocatedPath,
        outputSizeBytes: outStat.size,
        savedBytes,
        savedPercent,
        durationMs: Date.now() - startTime,
        finalWidth: outProbe.width,
        finalHeight: outProbe.height,
        validationSummary: `MP4 H.264 (${outProbe.width}x${outProbe.height}, ${outProbe.durationSec.toFixed(1)}s${outProbe.audioTracks.length ? ', AAC/Audio OK' : ''}) đã kiểm chứng ffprobe & decode.`
      }
    }
  } finally {
    cleanupJobTempDir(tempDir)
  }
}

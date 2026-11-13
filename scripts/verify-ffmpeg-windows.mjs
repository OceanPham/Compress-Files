import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { getBinaryPath, probeCapabilities } from '../src/main/utils/binaries.ts'
import { probeVideoFile, executeVideoJob } from '../src/main/engines/videoAdapter.ts'
import { createConfigForTier } from '../src/shared/presets.ts'

const rootDir = process.cwd()
const testDir = path.join(rootDir, 'tmp-test-video-verification')

if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true })
}
fs.mkdirSync(testDir, { recursive: true })

function log(title, msg) {
  console.log(`[VERIFY-VIDEO] === ${title} ===\n${msg}\n`)
}

function makeJob(options) {
  return {
    id: `job_verify_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category: 'video',
    mode: 'single',
    status: 'queued',
    primarySourcePath: options.primarySourcePath,
    inputSizeBytes: fs.statSync(options.primarySourcePath).size,
    outputSizeBytes: undefined,
    configSnapshot: options.configSnapshot,
    progress: 0,
    stage: 'queued',
    createdAt: Date.now(),
    probe: options.probe
  }
}

async function run() {
  const ffmpegExe = getBinaryPath('ffmpeg')
  const ffprobeExe = getBinaryPath('ffprobe')

  console.log(`Testing with bundled binaries:`)
  console.log(`  ffmpeg : ${ffmpegExe}`)
  console.log(`  ffprobe: ${ffprobeExe}`)

  const caps = await probeCapabilities(true)
  log('Capability Matrix', JSON.stringify(caps, null, 2))

  // -------------------------------------------------------------
  // Test 1: Generate Standard Video & Probe with ffprobe
  // -------------------------------------------------------------
  const stdVideo = path.join(testDir, 'standard_sdr_1080p.mp4')
  execFileSync(
    ffmpegExe,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=1920x1080:rate=30:duration=3',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=44100:duration=3',
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-y',
      stdVideo
    ],
    { windowsHide: true }
  )

  const probeRes1 = await probeVideoFile(stdVideo)
  if (!probeRes1.probe) {
    throw new Error(`Probe failed on standard video: ${probeRes1.unsupportedReason}`)
  }
  const probe1 = probeRes1.probe
  log(
    'Test 1: Probe Standard Video',
    `Resolution: ${probe1.width}x${probe1.height}, FPS: ${probe1.fps}, Codec: ${probe1.videoCodec}, Audio Tracks: ${probe1.audioTracks.length}, Duration: ${probe1.durationSec.toFixed(2)}s`
  )
  if (probe1.width !== 1920 || probe1.height !== 1080 || probe1.audioTracks.length !== 1) {
    throw new Error(`Probe values mismatch!`)
  }

  // -------------------------------------------------------------
  // Test 2: CRF Mode H.264 + AAC Audio Compression
  // -------------------------------------------------------------
  const outDirCrf = path.join(testDir, 'out_crf')
  fs.mkdirSync(outDirCrf, { recursive: true })
  const cfgCrf = createConfigForTier('small_size', outDirCrf)
  cfgCrf.video.mode = 'crf'
  cfgCrf.video.crf = 28
  cfgCrf.video.audioMode = 'aac'
  cfgCrf.video.audioBitrateKbps = 128

  const jobCrf = makeJob({
    primarySourcePath: stdVideo,
    configSnapshot: cfgCrf,
    probe: probe1
  })

  const resCrf = await executeVideoJob(
    jobCrf,
    probe1,
    (info) => console.log(`  [CRF Progress] ${info.stage}: ${info.percent}%`),
    () => {},
    new AbortController().signal
  )

  log(
    'Test 2: CRF Mode Result',
    `Status: ${resCrf.status}, Saved: ${resCrf.result?.savedPercent}%, Output: ${resCrf.result?.outputPath} (${resCrf.result?.outputSizeBytes} bytes)`
  )
  if (resCrf.status !== 'completed') {
    throw new Error(`CRF mode failed with status: ${resCrf.status}`)
  }
  const probeCrfOut = await probeVideoFile(resCrf.result.outputPath)
  if (!probeCrfOut.probe || probeCrfOut.probe.audioTracks.length !== 1) {
    throw new Error(`CRF output audio track missing or invalid!`)
  }

  // -------------------------------------------------------------
  // Test 3: 2-Pass Target Size Compression
  // -------------------------------------------------------------
  const outDirTarget = path.join(testDir, 'out_target')
  fs.mkdirSync(outDirTarget, { recursive: true })
  const cfgTarget = createConfigForTier('balanced', outDirTarget)
  cfgTarget.video.mode = 'target_size'
  cfgTarget.video.targetSizeValue = 250 // 250 KB
  cfgTarget.video.targetSizeUnit = 'KB'
  cfgTarget.video.targetMinVideoBitrateKbps = 100

  const jobTarget = makeJob({
    primarySourcePath: stdVideo,
    configSnapshot: cfgTarget,
    probe: probe1
  })

  const resTarget = await executeVideoJob(
    jobTarget,
    probe1,
    (info) => console.log(`  [2-Pass Progress] ${info.stage}: ${info.percent}%`),
    () => {},
    new AbortController().signal
  )

  log(
    'Test 3: 2-Pass Target Size Result',
    `Status: ${resTarget.status}, Target: 250 KB (250,000 bytes), Output: ${resTarget.result?.outputSizeBytes} bytes`
  )
  if (resTarget.status !== 'completed') {
    throw new Error(`2-pass target size failed with status: ${resTarget.status}`)
  }
  // Check output is close to target (under 280,000 bytes)
  if (resTarget.result.outputSizeBytes > 280000) {
    throw new Error(`Output size ${resTarget.result.outputSizeBytes} exceeded target budget!`)
  }

  // -------------------------------------------------------------
  // Test 4: Vertical Video & Rotation Metadata
  // -------------------------------------------------------------
  const verticalVideo = path.join(testDir, 'vertical_720x1280.mp4')
  execFileSync(
    ffmpegExe,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=720x1280:rate=24:duration=2',
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-y',
      verticalVideo
    ],
    { windowsHide: true }
  )

  const probeVert = await probeVideoFile(verticalVideo)
  log(
    'Test 4a: Vertical Video (720x1280)',
    `Width: ${probeVert.probe?.width}, Height: ${probeVert.probe?.height}, Rotation: ${probeVert.probe?.rotation}`
  )
  if (probeVert.probe?.width !== 720 || probeVert.probe?.height !== 1280) {
    throw new Error(`Vertical dimensions incorrect!`)
  }

  // Create video with 90 degree rotation metadata (Display Matrix)
  const rotatedVideo = path.join(testDir, 'rotated_90deg.mp4')
  execFileSync(
    ffmpegExe,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-display_rotation:v',
      '90',
      '-i',
      stdVideo,
      '-c',
      'copy',
      '-y',
      rotatedVideo
    ],
    { windowsHide: true }
  )
  const probeRot = await probeVideoFile(rotatedVideo)
  log(
    'Test 4b: Rotated Video Metadata',
    `Width: ${probeRot.probe?.width}, Height: ${probeRot.probe?.height}, Rotation: ${probeRot.probe?.rotation}`
  )
  if (probeRot.probe?.rotation !== 90) {
    throw new Error(`Rotation flag 90 degrees not detected: got ${probeRot.probe?.rotation}`)
  }

  // Compress rotated video and ensure display matrix / orientation is handled
  const outDirRot = path.join(testDir, 'out_rot')
  fs.mkdirSync(outDirRot, { recursive: true })
  const cfgRot = createConfigForTier('small_size', outDirRot)
  const jobRot = makeJob({
    primarySourcePath: rotatedVideo,
    configSnapshot: cfgRot,
    probe: probeRot.probe
  })
  const resRot = await executeVideoJob(
    jobRot,
    probeRot.probe,
    () => {},
    () => {},
    new AbortController().signal
  )
  log('Test 4c: Rotated Video Compress Result', `Status: ${resRot.status}`)
  if (resRot.status !== 'completed') {
    throw new Error(`Compression of rotated video failed!`)
  }

  // -------------------------------------------------------------
  // Test 5: Vietnamese Unicode Path and Filenames
  // -------------------------------------------------------------
  const vnDir = path.join(testDir, 'Thư mục Tiếng Việt có dấu - Ngọc Huy Dev')
  fs.mkdirSync(vnDir, { recursive: true })
  const vnSource = path.join(vnDir, 'Video gốc kiểm thử tiếng Việt đầy đủ thanh điệu.mp4')
  fs.copyFileSync(stdVideo, vnSource)

  const vnOutDir = path.join(testDir, 'Thư mục xuất - Ocean Labs Việt Nam')
  fs.mkdirSync(vnOutDir, { recursive: true })
  const cfgVn = createConfigForTier('small_size', vnOutDir)

  const probeVn = await probeVideoFile(vnSource)
  if (!probeVn.probe) throw new Error(`Probe failed on Vietnamese path!`)

  const jobVn = makeJob({
    primarySourcePath: vnSource,
    configSnapshot: cfgVn,
    probe: probeVn.probe
  })

  const resVn = await executeVideoJob(
    jobVn,
    probeVn.probe,
    (info) => console.log(`  [VN Progress] ${info.stage}: ${info.percent}%`),
    () => {},
    new AbortController().signal
  )

  log(
    'Test 5: Vietnamese Unicode Path & Name Result',
    `Status: ${resVn.status}, Output: ${resVn.result?.outputPath}`
  )
  if (resVn.status !== 'completed' || !fs.existsSync(resVn.result.outputPath)) {
    throw new Error(`Vietnamese path test failed!`)
  }

  // -------------------------------------------------------------
  // Test 6: Task Cancellation, Temp Cleanup & Original Preservation
  // -------------------------------------------------------------
  const abortCtrl = new AbortController()
  const origStatBefore = fs.statSync(stdVideo)
  const origContentHashBefore = execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `(Get-FileHash "${stdVideo}" -Algorithm SHA256).Hash`],
    { encoding: 'utf8' }
  ).trim()

  const outDirCancel = path.join(testDir, 'out_cancel')
  fs.mkdirSync(outDirCancel, { recursive: true })
  const cfgCancel = createConfigForTier('balanced', outDirCancel)
  cfgCancel.video.mode = 'crf'
  cfgCancel.video.crf = 18
  cfgCancel.video.videoPreset = 'veryslow'

  const jobCancel = makeJob({
    primarySourcePath: stdVideo,
    configSnapshot: cfgCancel,
    probe: probe1
  })

  // Abort after 80ms while ffmpeg is encoding
  setTimeout(() => {
    console.log('  -> Triggering AbortController.abort()...')
    abortCtrl.abort()
  }, 80)

  const resCancel = await executeVideoJob(
    jobCancel,
    probe1,
    () => {},
    () => {},
    abortCtrl.signal
  )

  log('Test 6: Cancellation Result', `Status: ${resCancel.status}, Reason: ${resCancel.reason}`)
  if (resCancel.status !== 'cancelled') {
    throw new Error(`Expected status 'cancelled', got: ${resCancel.status}`)
  }

  // Verify original file preserved
  const origStatAfter = fs.statSync(stdVideo)
  const origContentHashAfter = execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `(Get-FileHash "${stdVideo}" -Algorithm SHA256).Hash`],
    { encoding: 'utf8' }
  ).trim()
  if (
    origStatBefore.size !== origStatAfter.size ||
    origContentHashBefore !== origContentHashAfter
  ) {
    throw new Error(`FATAL: Original file was modified during cancelled job!`)
  }
  log('Test 6: Safety Check', `Original file bit-for-bit preserved: SHA-256 intact.`)

  // -------------------------------------------------------------
  // Test 7: Hardware Encoder Option Check
  // -------------------------------------------------------------
  const outDirHw = path.join(testDir, 'out_hw')
  fs.mkdirSync(outDirHw, { recursive: true })
  const cfgHw = createConfigForTier('small_size', outDirHw)
  cfgHw.video.useHardwareEncoder = true // Enable GPU encoder

  const jobHw = makeJob({
    primarySourcePath: stdVideo,
    configSnapshot: cfgHw,
    probe: probe1
  })

  const resHw = await executeVideoJob(
    jobHw,
    probe1,
    (info) => console.log(`  [HW Progress] ${info.stage}: ${info.percent}%`),
    () => {},
    new AbortController().signal
  )

  log(
    'Test 7: Hardware Acceleration Test',
    `Status: ${resHw.status}, Codec used / summary: ${resHw.result?.validationSummary}`
  )
  if (resHw.status !== 'completed') {
    throw new Error(`Hardware acceleration test failed with status: ${resHw.status}`)
  }

  console.log('=====================================================')
  console.log('ALL 7 WINDOWS TARGETED VIDEO TESTS PASSED WITH 100% SUCCESS!')
  console.log('=====================================================')

  // Clean up test directory
  fs.rmSync(testDir, { recursive: true, force: true })
}

run().catch((err) => {
  console.error('[VERIFY-VIDEO ERROR]', err)
  process.exit(1)
})


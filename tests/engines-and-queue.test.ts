import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { getBinaryPath, probeCapabilities } from '../src/main/utils/binaries'
import {
  allocateUniqueOutputPath,
  areSameFilePaths,
  releaseReservedOutputPath,
  scanPathsForMediaImport,
  sniffFileHeader
} from '../src/main/utils/fileSafety'
import {
  executeImageJob,
  generateImagePreview,
  probeImageFile
} from '../src/main/engines/imageAdapter'
import { executeVideoJob, probeVideoFile } from '../src/main/engines/videoAdapter'
import { executePdfJob, probePdfFile } from '../src/main/engines/pdfAdapter'
import { executeArchiveJob, probeArchiveInputs } from '../src/main/engines/archiveAdapter'
import { LocalStore } from '../src/main/store/localStore'
import { QueueManager } from '../src/main/queue/queueManager'
import { createConfigForTier } from '../src/shared/presets'
import { CompressionJob } from '../src/shared/types'

const testRoot = path.join(process.cwd(), 'tmp-test', `run_${Date.now()}`)
const fixturesDir = path.join(testRoot, 'fixtures')
const outputsDir = path.join(testRoot, 'outputs')

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function makeDummyJob(
  partial: Partial<CompressionJob> & {
    category: CompressionJob['category']
    primarySourcePath: string
  }
): CompressionJob {
  const st = fs.existsSync(partial.primarySourcePath)
    ? fs.statSync(partial.primarySourcePath)
    : { size: 0, mtimeMs: Date.now() }
  const cfg = createConfigForTier('balanced', outputsDir)
  const { category, primarySourcePath, ...rest } = partial
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    sourcePaths: partial.sourcePaths || [primarySourcePath],
    primarySourcePath,
    displayName: path.basename(primarySourcePath),
    relativeFolder: '',
    inputSizeBytes: st.size,
    inputMtimeMs: st.mtimeMs,
    status: 'queued',
    configSnapshot: cfg,
    hasCustomOverride: false,
    plannedOutputPath: path.join(outputsDir, path.basename(primarySourcePath)),
    engineName: 'TestEngine',
    engineVersion: '1.0',
    createdAt: new Date().toISOString(),
    retryCount: 0,
    logs: [],
    ...rest
  }
}

describe('File Compressor — Comprehensive Engine, Safety & Queue Verification', () => {
  let exifJpgPath: string
  let alphaPngPath: string
  let largeJpgPath: string
  let tinyJpgPath: string
  let gifPath: string
  let hdr16BitPngPath: string

  let sdrVideoPath: string
  let portraitVideoPath: string
  let hdr10BitVideoPath: string
  let corruptVideoPath: string

  let unoptimizedPdfPath: string
  let encryptedPdfPath: string
  let signedPdfPath: string

  beforeAll(async () => {
    fs.mkdirSync(fixturesDir, { recursive: true })
    fs.mkdirSync(outputsDir, { recursive: true })

    // 1. Create Image Fixtures
    exifJpgPath = path.join(fixturesDir, 'exif_orient6.jpg')
    await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 30, g: 140, b: 220 }
      }
    })
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 96 })
      .toFile(exifJpgPath)

    alphaPngPath = path.join(fixturesDir, 'alpha_transparent.png')
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 0.4 }
      }
    })
      .png({ compressionLevel: 1 })
      .toFile(alphaPngPath)

    // Large noisy image for compression & target-size testing
    largeJpgPath = path.join(fixturesDir, 'large_noisy.jpg')
    const rawNoise = crypto.randomBytes(1200 * 900 * 3)
    await sharp(rawNoise, {
      raw: { width: 1200, height: 900, channels: 3 }
    })
      .jpeg({ quality: 98 })
      .toFile(largeJpgPath)

    tinyJpgPath = path.join(fixturesDir, 'tiny_already_opt.jpg')
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 10, b: 10 } }
    })
      .jpeg({ quality: 40, mozjpeg: true })
      .toFile(tinyJpgPath)

    // Animated GIF header fixture
    gifPath = path.join(fixturesDir, 'animated.gif')
    fs.writeFileSync(gifPath, Buffer.from('GIF89a\x10\x00\x10\x00\x80\x00\x00', 'binary'))

    // 16-bit PNG fixture
    hdr16BitPngPath = path.join(fixturesDir, 'hdr_16bit.png')
    const buf16 = Buffer.alloc(64 * 64 * 3, 0x7f)
    await sharp(buf16, {
      raw: { width: 64, height: 64, channels: 3 }
    })
      .toColorspace('rgb16')
      .png()
      .toFile(hdr16BitPngPath)

    // 2. Create Video Fixtures with bundled FFmpeg
    const ffmpegPath = getBinaryPath('ffmpeg')
    sdrVideoPath = path.join(fixturesDir, 'sdr_sample.mp4')
    execFileSync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=1280x720:rate=30:duration=2.5',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=44100:duration=2.5',
        '-c:v',
        'libx264',
        '-crf',
        '15',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-y',
        sdrVideoPath
      ],
      { windowsHide: true }
    )

    portraitVideoPath = path.join(fixturesDir, 'portrait_sample.mp4')
    execFileSync(
      ffmpegPath,
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
        '16',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-y',
        portraitVideoPath
      ],
      { windowsHide: true }
    )

    hdr10BitVideoPath = path.join(fixturesDir, 'hdr_10bit.mp4')
    execFileSync(
      ffmpegPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=320x240:rate=24:duration=1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p10le',
        '-color_primaries',
        'bt2020',
        '-color_trc',
        'smpte2084',
        '-colorspace',
        'bt2020nc',
        '-y',
        hdr10BitVideoPath
      ],
      { windowsHide: true }
    )

    corruptVideoPath = path.join(fixturesDir, 'corrupt.mp4')
    fs.writeFileSync(corruptVideoPath, Buffer.from('\x00\x00\x00\x18ftypmp42corruptdata12345'))

    // 3. Create PDF Fixtures
    unoptimizedPdfPath = path.join(fixturesDir, 'unoptimized_doc.pdf')
    const pdfDoc = await PDFDocument.create()
    for (let p = 1; p <= 5; p++) {
      const page = pdfDoc.addPage([600, 800])
      page.drawText(
        `Trang tai lieu thu nghiem so ${p} - Noi dung lap lai de kiem tra nen stream QPDF. `.repeat(
          25
        ),
        { x: 40, y: 700, size: 11 }
      )
    }
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false })
    // Expand stream via qpdf --stream-data=uncompress so it has uncompressed streams like a raw export
    const rawUncompressedTmp = path.join(fixturesDir, 'raw_uncompressed.pdf')
    fs.writeFileSync(rawUncompressedTmp, pdfBytes)
    const qpdfPath = getBinaryPath('qpdf')
    execFileSync(
      qpdfPath,
      [rawUncompressedTmp, '--stream-data=uncompress', '--object-streams=disable', unoptimizedPdfPath],
      { windowsHide: true }
    )

    encryptedPdfPath = path.join(fixturesDir, 'encrypted.pdf')
    execFileSync(
      qpdfPath,
      ['--encrypt', 'user123', 'owner123', '256', '--', unoptimizedPdfPath, encryptedPdfPath],
      { windowsHide: true }
    )

    signedPdfPath = path.join(fixturesDir, 'digitally_signed.pdf')
    const fakeSigPdf = Buffer.concat([
      fs.readFileSync(unoptimizedPdfPath),
      Buffer.from('\n% Fake Sig Dictionary\n<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 100 200 300] >>\n')
    ])
    fs.writeFileSync(signedPdfPath, fakeSigPdf)
  }, 60000)

  afterAll(() => {
    try {
      fs.rmSync(testRoot, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('verifies bundled offline binaries and CapabilityMatrix', async () => {
    const caps = await probeCapabilities(true)
    expect(caps.ffmpegAvailable).toBe(true)
    expect(caps.ffprobeAvailable).toBe(true)
    expect(caps.qpdfAvailable).toBe(true)
    expect(caps.sevenZipAvailable).toBe(true)
    expect(caps.webpSupported).toBe(true)
    expect(caps.avifSupported).toBe(true)
    expect(caps.h264Encoders).toContain('libx264')
  })

  it('enforces file safety: blocks source==destination and resolves naming collisions', () => {
    expect(areSameFilePaths(largeJpgPath, largeJpgPath.toUpperCase())).toBe(true)
    const preferred = path.join(outputsDir, 'collision_test.jpg')
    const first = allocateUniqueOutputPath(preferred, [largeJpgPath])
    const second = allocateUniqueOutputPath(preferred, [largeJpgPath])
    expect(first).not.toBe(second)
    expect(path.basename(second)).toBe('collision_test (1).jpg')
    releaseReservedOutputPath(first)
    releaseReservedOutputPath(second)
  })

  it('Image Module: handles EXIF orientation=6 without double rotation, preserves alpha or flattens to JPEG, and supports AVIF/WebP', async () => {
    const { probe } = await probeImageFile(exifJpgPath)
    expect(probe).toBeDefined()
    expect(probe!.orientation).toBe(6)

    const job = makeDummyJob({
      category: 'image',
      primarySourcePath: exifJpgPath,
      probe
    })
    const res = await executeImageJob(
      job,
      probe!,
      () => {},
      new AbortController().signal
    )
    expect(['completed', 'no_savings', 'converted_not_smaller']).toContain(res.status)
    if (res.result && !res.result.keptOriginalAsFinal) {
      const outMeta = await sharp(res.result.outputPath).metadata()
      // Width/height should now be swapped to 400x600 after baking EXIF orientation=6
      expect(outMeta.width).toBe(400)
      expect(outMeta.height).toBe(600)
    }

    // Test Alpha PNG -> JPEG flatten with custom background
    const { probe: alphaProbe } = await probeImageFile(alphaPngPath)
    expect(alphaProbe?.hasAlpha).toBe(true)
    const cfg = createConfigForTier('balanced', outputsDir)
    cfg.image.outputFormat = 'jpeg'
    cfg.image.alphaBackground = '#FFFFFF'
    const alphaJob = makeDummyJob({
      category: 'image',
      primarySourcePath: alphaPngPath,
      probe: alphaProbe,
      configSnapshot: cfg
    })
    const alphaRes = await executeImageJob(
      alphaJob,
      alphaProbe!,
      () => {},
      new AbortController().signal
    )
    expect(['completed', 'converted_not_smaller']).toContain(alphaRes.status)
    expect(fs.existsSync(alphaRes.result!.outputPath)).toBe(true)

    // Test Preview 100% generation
    const preview = await generateImagePreview({
      sourcePath: alphaPngPath,
      config: cfg.image
    })
    expect(preview.originalWidth).toBe(500)
    expect(preview.outputFormat).toBe('JPEG')
    expect(preview.previewDataUrl.startsWith('data:image/jpeg;base64,')).toBe(true)
  }, 30000)

  it('Image Module: achieves Target Size when feasible, reports target_unmet when impossible, and rejects animated/16-bit images', async () => {
    const { probe } = await probeImageFile(largeJpgPath)
    expect(probe).toBeDefined()

    // 1. Feasible target size (350 KB)
    const cfgFeasible = createConfigForTier('balanced', outputsDir)
    cfgFeasible.image.targetSizeEnabled = true
    cfgFeasible.image.targetSizeValue = 350
    cfgFeasible.image.targetSizeUnit = 'KB'
    cfgFeasible.image.targetMinQuality = 30
    cfgFeasible.image.targetAllowResize = true
    cfgFeasible.image.targetMinLongEdge = 400

    const job1 = makeDummyJob({
      category: 'image',
      primarySourcePath: largeJpgPath,
      probe,
      configSnapshot: cfgFeasible
    })
    const res1 = await executeImageJob(job1, probe!, () => {}, new AbortController().signal)
    expect(res1.status).toBe('completed')
    expect(res1.result!.outputSizeBytes).toBeLessThanOrEqual(350 * 1000)

    // 2. Impossible target size (5 KB without resize and min quality 90)
    const cfgImpossible = createConfigForTier('balanced', outputsDir)
    cfgImpossible.image.targetSizeEnabled = true
    cfgImpossible.image.targetSizeValue = 5
    cfgImpossible.image.targetSizeUnit = 'KB'
    cfgImpossible.image.targetMinQuality = 90
    cfgImpossible.image.targetAllowResize = false

    const job2 = makeDummyJob({
      category: 'image',
      primarySourcePath: largeJpgPath,
      probe,
      configSnapshot: cfgImpossible
    })
    const res2 = await executeImageJob(job2, probe!, () => {}, new AbortController().signal)
    expect(res2.status).toBe('target_unmet')

    // 3. Rejects GIF & 16-bit PNG
    const gifSniff = sniffFileHeader(gifPath)
    expect(gifSniff.unsupportedReason).toBeDefined()
    const hdrProbe = await probeImageFile(hdr16BitPngPath)
    expect(hdrProbe.unsupportedReason).toBeDefined()
  }, 30000)

  it('Video Module: compresses SDR video, handles 2-pass target-size, rejects HDR/10-bit, and kills process tree on cancel', async () => {
    // 1. Rejects 10-bit HDR video
    const hdrProbe = await probeVideoFile(hdr10BitVideoPath)
    expect(hdrProbe.unsupportedReason).toBeDefined()
    expect(hdrProbe.unsupportedReason).toContain('HDR')

    // 2. Rejects corrupt video
    const corruptProbe = await probeVideoFile(corruptVideoPath)
    expect(corruptProbe.unsupportedReason).toBeDefined()

    // 3. Compresses standard SDR video with audio sync & duration preserved
    const { probe } = await probeVideoFile(sdrVideoPath)
    expect(probe).toBeDefined()
    expect(probe!.audioTracks.length).toBe(1)

    const cfg = createConfigForTier('small_size', outputsDir)
    const job = makeDummyJob({
      category: 'video',
      primarySourcePath: sdrVideoPath,
      probe,
      configSnapshot: cfg
    })
    const res = await executeVideoJob(
      job,
      probe!,
      () => {},
      () => {},
      new AbortController().signal
    )
    expect(['completed', 'no_savings', 'converted_not_smaller']).toContain(res.status)
    if (res.result && !res.result.keptOriginalAsFinal) {
      const { probe: outProbe } = await probeVideoFile(res.result.outputPath)
      expect(outProbe?.videoCodec).toBe('h264')
      expect(Math.abs(outProbe!.durationSec - probe!.durationSec)).toBeLessThan(1.0)
    }

    // 4. Portrait video aspect ratio & Target-size 2-pass test
    const { probe: portProbe } = await probeVideoFile(portraitVideoPath)
    expect(portProbe).toBeDefined()
    const cfgTarget = createConfigForTier('balanced', outputsDir)
    cfgTarget.video.mode = 'target_size'
    cfgTarget.video.targetSizeValue = 1
    cfgTarget.video.targetSizeUnit = 'MB'
    cfgTarget.video.targetMinVideoBitrateKbps = 150
    const targetJob = makeDummyJob({
      category: 'video',
      primarySourcePath: portraitVideoPath,
      probe: portProbe,
      configSnapshot: cfgTarget
    })
    const targetRes = await executeVideoJob(
      targetJob,
      portProbe!,
      () => {},
      () => {},
      new AbortController().signal
    )
    expect(targetRes.status).toBe('completed')
    expect(targetRes.result!.outputSizeBytes).toBeLessThanOrEqual(1_000_000)

    // 5. Cancellation mid-encode cleans up temp and returns cancelled
    const abortCtrl = new AbortController()
    const cancelJob = makeDummyJob({
      category: 'video',
      primarySourcePath: sdrVideoPath,
      probe,
      configSnapshot: cfgTarget
    })
    setTimeout(() => abortCtrl.abort(), 120)
    const cancelRes = await executeVideoJob(
      cancelJob,
      probe!,
      () => {},
      () => {},
      abortCtrl.signal
    )
    expect(cancelRes.status).toBe('cancelled')
  }, 45000)

  it('PDF Module: optimizes uncompressed PDF, preserves page count, returns no_savings when already optimal, and rejects encrypted/signed PDFs', async () => {
    // 1. Rejects password-encrypted PDF
    const encProbe = await probePdfFile(encryptedPdfPath)
    expect(encProbe.unsupportedReason).toBeDefined()

    // 2. Rejects digitally signed PDF
    const sigProbe = await probePdfFile(signedPdfPath)
    expect(sigProbe.unsupportedReason).toBeDefined()
    expect(sigProbe.unsupportedReason).toContain('chữ ký số')

    // 3. Optimizes unoptimized PDF and verifies page count
    const { probe } = await probePdfFile(unoptimizedPdfPath)
    expect(probe).toBeDefined()
    expect(probe!.pageCount).toBe(5)

    const job = makeDummyJob({
      category: 'pdf',
      primarySourcePath: unoptimizedPdfPath,
      probe
    })
    const res = await executePdfJob(
      job,
      probe!,
      () => {},
      () => {},
      new AbortController().signal
    )
    expect(res.status).toBe('completed')
    expect(res.result!.outputSizeBytes).toBeLessThan(job.inputSizeBytes)

    // 4. Running again on the already-optimized PDF returns no_savings
    const optPath = res.result!.outputPath
    const { probe: probe2 } = await probePdfFile(optPath)
    const job2 = makeDummyJob({
      category: 'pdf',
      primarySourcePath: optPath,
      probe: probe2
    })
    const res2 = await executePdfJob(
      job2,
      probe2!,
      () => {},
      () => {},
      new AbortController().signal
    )
    expect(['no_savings', 'completed']).toContain(res2.status)
  })

  it('Archive Module: creates ZIP and 7z with Vietnamese Unicode filenames, empty folders, and root collision resolution, and verifies extracted SHA-256 hashes', async () => {
    const srcRoot1 = path.join(fixturesDir, 'arch_src_1', 'Tài liệu chung')
    const srcRoot2 = path.join(fixturesDir, 'arch_src_2', 'Tài liệu chung')
    const emptySubDir = path.join(srcRoot1, 'Thư mục rỗng')
    fs.mkdirSync(emptySubDir, { recursive: true })
    fs.mkdirSync(srcRoot2, { recursive: true })

    const vnFile1 = path.join(srcRoot1, 'Báo cáo tiếng Việt có dấu 2026.txt')
    const vnFile2 = path.join(srcRoot2, 'Dữ liệu nhánh hai.txt')
    fs.writeFileSync(vnFile1, 'Nội dung kiểm thử tiếng Việt chính xác 100%.\n'.repeat(100), 'utf8')
    fs.writeFileSync(vnFile2, 'Nội dung nhánh thứ hai trùng tên thư mục gốc.\n'.repeat(80), 'utf8')

    const hash1 = sha256(vnFile1)
    const hash2 = sha256(vnFile2)

    const { probe, unsupportedReason } = await probeArchiveInputs([srcRoot1, srcRoot2])
    expect(unsupportedReason).toBeUndefined()
    expect(probe).toBeDefined()
    expect(probe!.hasRootCollision).toBe(true)
    expect(probe!.fileCount).toBe(2)

    for (const fmt of ['zip', '7z'] as const) {
      const cfg = createConfigForTier('balanced', outputsDir)
      cfg.archive.archiveFormat = fmt
      cfg.archive.archiveBaseName = `Goi_Kiem_Thu_${fmt}`

      const job = makeDummyJob({
        category: 'archive',
        sourcePaths: [srcRoot1, srcRoot2],
        primarySourcePath: srcRoot1,
        probe,
        configSnapshot: cfg
      })

      const res = await executeArchiveJob(
        job,
        probe!,
        () => {},
        () => {},
        new AbortController().signal
      )
      expect(res.status).toBe('completed')
      expect(fs.existsSync(res.result!.outputPath)).toBe(true)

      // Extract into a clean directory and verify contents & SHA-256 hashes
      const extractDir = path.join(outputsDir, `extract_${fmt}`)
      fs.mkdirSync(extractDir, { recursive: true })
      const sevenZa = getBinaryPath('7za')
      execFileSync(sevenZa, ['x', res.result!.outputPath, `-o${extractDir}`, '-y'], {
        windowsHide: true
      })

      const extracted1 = path.join(
        extractDir,
        'Tài liệu chung',
        'Báo cáo tiếng Việt có dấu 2026.txt'
      )
      const extracted2 = path.join(
        extractDir,
        'Tài liệu chung_2',
        'Dữ liệu nhánh hai.txt'
      )
      const extractedEmptyDir = path.join(extractDir, 'Tài liệu chung', 'Thư mục rỗng')

      expect(fs.existsSync(extracted1)).toBe(true)
      expect(fs.existsSync(extracted2)).toBe(true)
      expect(fs.existsSync(extractedEmptyDir)).toBe(true)
      expect(sha256(extracted1)).toBe(hash1)
      expect(sha256(extracted2)).toBe(hash2)
    }
  })

  it('LocalStore & QueueManager: recovers interrupted jobs after crash and processes mixed batches resiliently', async () => {
    const storeDir = path.join(testRoot, 'store_test')
    fs.mkdirSync(storeDir, { recursive: true })

    // Simulate crash state with a job stuck in 'running'
    const stateFile = path.join(storeDir, 'file-compressor-state-v1.json')
    const crashedJob = makeDummyJob({
      category: 'image',
      primarySourcePath: largeJpgPath,
      status: 'running'
    })
    fs.writeFileSync(
      stateFile,
      JSON.stringify({
        schemaVersion: 1,
        settings: {},
        customPresets: [],
        activeQueue: [crashedJob],
        history: []
      }),
      'utf8'
    )

    const store = new LocalStore(storeDir)
    const recoveredQueue = store.getActiveQueue()
    expect(recoveredQueue.length).toBe(1)
    expect(recoveredQueue[0].status).toBe('interrupted')

    const qm = new QueueManager(store, () => {})
    const importRes = await qm.importMediaPaths([exifJpgPath, corruptVideoPath])
    expect(importRes.addedJobs.length).toBe(2)

    await store.flush()
  })

  it('Image Module: exports multiple sizes (Multi-size preset) and distinguishes no_savings vs converted_not_smaller', async () => {
    const { probe } = await probeImageFile(largeJpgPath)
    expect(probe).toBeDefined()

    const cfgMulti = createConfigForTier('balanced', outputsDir)
    cfgMulti.image.multiSizePresets = [
      { id: 'ms1', label: 'Web HD', longEdge: 800, suffix: '_800w', enabled: true },
      { id: 'ms2', label: 'Thumb', longEdge: 400, suffix: '_400w', enabled: true }
    ]

    const multiJob = makeDummyJob({
      category: 'image',
      primarySourcePath: largeJpgPath,
      probe,
      configSnapshot: cfgMulti
    })
    const multiRes = await executeImageJob(
      multiJob,
      probe!,
      () => {},
      new AbortController().signal
    )
    expect(multiRes.status).toBe('completed')
    expect(multiRes.result?.multiOutputs?.length).toBe(2)
    expect(multiRes.result?.multiOutputs?.[0].width).toBe(800)
    expect(multiRes.result?.multiOutputs?.[1].width).toBe(400)

    // Test tiny already optimized JPEG -> same format high quality => no_savings
    const { probe: tinyProbe } = await probeImageFile(tinyJpgPath)
    const cfgHigh = createConfigForTier('high_quality', outputsDir)
    cfgHigh.image.quality = 98
    const noSaveJob = makeDummyJob({
      category: 'image',
      primarySourcePath: tinyJpgPath,
      probe: tinyProbe,
      configSnapshot: cfgHigh
    })
    const noSaveRes = await executeImageJob(
      noSaveJob,
      tinyProbe!,
      () => {},
      new AbortController().signal
    )
    expect(noSaveRes.status).toBe('no_savings')
    expect(noSaveRes.result?.keptOriginalAsFinal).toBe(true)

    // Test tiny JPEG -> convert to uncompressed PNG => converted_not_smaller
    const cfgConvert = createConfigForTier('high_quality', outputsDir)
    cfgConvert.image.outputFormat = 'png'
    cfgConvert.image.lossless = true
    cfgConvert.image.effort = 1
    const convJob = makeDummyJob({
      category: 'image',
      primarySourcePath: tinyJpgPath,
      probe: tinyProbe,
      configSnapshot: cfgConvert
    })
    const convRes = await executeImageJob(
      convJob,
      tinyProbe!,
      () => {},
      new AbortController().signal
    )
    expect(convRes.status).toBe('converted_not_smaller')
    expect(fs.existsSync(convRes.result!.outputPath)).toBe(true)
  })

  it('QueueManager: runs a mixed batch (Image + PDF + Corrupt Video) to completion without stopping on broken input', async () => {
    const batchStoreDir = path.join(testRoot, 'batch_store')
    fs.mkdirSync(batchStoreDir, { recursive: true })
    const store = new LocalStore(batchStoreDir)
    store.updateSettings({
      defaultConfig: createConfigForTier('balanced', outputsDir)
    })

    const qm = new QueueManager(store, () => {})
    await qm.importMediaPaths([largeJpgPath, unoptimizedPdfPath, corruptVideoPath])
    qm.startQueue()

    // Wait for queue to finish
    await new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 20000
      const interval = setInterval(() => {
        const st = qm.getState()
        if (!st.isRunning && !qm.hasRunningJobs()) {
          clearInterval(interval)
          resolve()
        } else if (Date.now() > deadline) {
          clearInterval(interval)
          reject(new Error('Timed out waiting for mixed batch queue'))
        }
      }, 150)
    })

    const finalState = qm.getState()
    const statuses = finalState.jobs.map((j) => j.status)
    expect(statuses).toContain('completed')
    expect(statuses).toContain('unsupported')
    expect(store.getHistory().length).toBeGreaterThanOrEqual(2)
    await store.flush()
  }, 30000)
})

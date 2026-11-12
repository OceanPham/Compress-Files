import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {
  CompressionJob,
  convertToBytes,
  ImageConfig,
  ImagePreviewRequest,
  ImagePreviewResponse,
  ImageProbeInfo,
  JobProgressInfo,
  JobResultInfo,
  JobStatus,
  MultiSizeOutputItem
} from '../../shared/types'
import {
  allocateUniqueOutputPath,
  buildPlannedOutputPath,
  cleanupJobTempDir,
  createJobTempDir,
  finalizeTempFileToOutput,
  releaseReservedOutputPath
} from '../utils/fileSafety'

const MAX_INPUT_PIXELS = 16384 * 16384 // 268 MP safety limit

export async function probeImageFile(filePath: string): Promise<{
  probe?: ImageProbeInfo
  unsupportedReason?: string
}> {
  try {
    const instance = sharp(filePath, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'warning'
    })
    const meta = await instance.metadata()
    const format = (meta.format || '').toLowerCase()
    const pages = meta.pages ?? 1
    const isAnimated = pages > 1

    if (isAnimated) {
      return {
        unsupportedReason: `Ảnh động hoặc ảnh nhiều trang (${pages} trang/frame) nằm ngoài phạm vi tối ưu ảnh tĩnh.`
      }
    }

    if (!['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif'].includes(format)) {
      return {
        unsupportedReason: `Định dạng ảnh "${format || 'unknown'}" nằm ngoài phạm vi hỗ trợ (chỉ hỗ trợ JPEG, PNG, WebP, AVIF tĩnh).`
      }
    }

    if (format === 'heif') {
      const ext = path.extname(filePath).toLowerCase()
      if (ext === '.heic' || ext === '.heif') {
        return {
          unsupportedReason: 'Định dạng HEIC/HEIF nằm ngoài phạm vi hỗ trợ trực tiếp.'
        }
      }
    }

    const depth = String(meta.depth || 'uchar')
    const space = String(meta.space || 'srgb').toLowerCase()
    if (
      ['ushort', 'uint', 'float', 'double'].includes(depth) ||
      space === 'rgb16' ||
      space === 'grey16'
    ) {
      return {
        unsupportedReason: `Ảnh có chiều sâu màu cao (${depth}/${space} >8-bit HDR/RAW) không được tự động hạ bit-depth trong chế độ nén chuẩn.`
      }
    }

    const width = meta.width || 0
    const height = meta.height || 0
    if (width <= 0 || height <= 0) {
      return {
        unsupportedReason: 'Không đọc được kích thước hợp lệ của ảnh.'
      }
    }

    const normalizedFormat = format === 'jpg' || format === 'heif' ? (format === 'heif' ? 'avif' : 'jpeg') : format

    return {
      probe: {
        kind: 'image',
        format: normalizedFormat,
        width,
        height,
        channels: meta.channels || 3,
        hasAlpha: Boolean(meta.hasAlpha),
        orientation: meta.orientation || 1,
        space: meta.space || 'srgb',
        hasIccProfile: Boolean(meta.icc),
        isAnimated,
        pages,
        bitDepth: depth
      }
    }
  } catch (err) {
    return {
      unsupportedReason: `Không thể giải mã ảnh hoặc ảnh vượt giới hạn an toàn: ${(err as Error).message}`
    }
  }
}

export function resolveTargetImageFormat(
  sourceFormat: string,
  config: ImageConfig
): 'jpeg' | 'png' | 'webp' | 'avif' {
  if (config.outputFormat === 'keep') {
    if (sourceFormat === 'png') return 'png'
    if (sourceFormat === 'webp') return 'webp'
    if (sourceFormat === 'avif') return 'avif'
    return 'jpeg'
  }
  return config.outputFormat
}

export function getImageExtensionForFormat(fmt: 'jpeg' | 'png' | 'webp' | 'avif'): string {
  if (fmt === 'jpeg') return '.jpg'
  return `.${fmt}`
}

export function getOrientedDimensions(probe: ImageProbeInfo): { width: number; height: number } {
  if (probe.orientation >= 5 && probe.orientation <= 8) {
    return { width: probe.height, height: probe.width }
  }
  return { width: probe.width, height: probe.height }
}

export function buildImageSharpPipeline(
  sourcePath: string,
  probe: ImageProbeInfo,
  config: ImageConfig,
  overrideQuality?: number,
  overrideLongEdge?: number
): { pipeline: sharp.Sharp; targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' } {
  const targetFormat = resolveTargetImageFormat(probe.format, config)
  const quality = Math.max(1, Math.min(100, Math.round(overrideQuality ?? config.quality)))
  const effort = Math.max(0, Math.min(9, Math.round(config.effort)))

  // 1. Auto-orient based on EXIF tag once so pixel data matches display orientation
  let pipeline = sharp(sourcePath, { limitInputPixels: MAX_INPUT_PIXELS }).rotate()

  const oriented = getOrientedDimensions(probe)

  // 2. Resize without enlargement or cropping
  if (overrideLongEdge && overrideLongEdge > 0) {
    pipeline = pipeline.resize({
      width: overrideLongEdge,
      height: overrideLongEdge,
      fit: 'inside',
      withoutEnlargement: true
    })
  } else if (config.resizeMode === 'long_edge' && config.longEdge > 0) {
    pipeline = pipeline.resize({
      width: config.longEdge,
      height: config.longEdge,
      fit: 'inside',
      withoutEnlargement: true
    })
  } else if (config.resizeMode === 'dimensions' && config.maxWidth > 0 && config.maxHeight > 0) {
    pipeline = pipeline.resize({
      width: config.maxWidth,
      height: config.maxHeight,
      fit: 'inside',
      withoutEnlargement: true
    })
  } else if (config.resizeMode === 'percent' && config.scalePercent > 0 && config.scalePercent < 100) {
    const targetW = Math.max(1, Math.round((oriented.width * config.scalePercent) / 100))
    const targetH = Math.max(1, Math.round((oriented.height * config.scalePercent) / 100))
    pipeline = pipeline.resize({
      width: targetW,
      height: targetH,
      fit: 'inside',
      withoutEnlargement: true
    })
  }

  // 3. Handle alpha channel if converting to JPEG
  if (targetFormat === 'jpeg' && probe.hasAlpha) {
    pipeline = pipeline.flatten({
      background: config.alphaBackground || '#FFFFFF'
    })
  }

  // 4. Color profile & metadata policies
  if (config.colorProfilePolicy === 'convert_srgb') {
    pipeline = pipeline.toColorspace('srgb')
  }

  if (config.metadataPolicy === 'keep_all' || config.metadataPolicy === 'keep_safe') {
    // Keep metadata but force orientation=1 because .rotate() already baked orientation into pixels
    pipeline = pipeline.withMetadata({ orientation: 1 })
  } else if (config.colorProfilePolicy === 'keep_icc' && probe.hasIccProfile) {
    pipeline = pipeline.keepIccProfile()
  }

  // 5. Encoder settings
  if (targetFormat === 'jpeg') {
    pipeline = pipeline.jpeg({
      quality,
      mozjpeg: true
    })
  } else if (targetFormat === 'png') {
    const compressionLevel = Math.max(0, Math.min(9, effort))
    if (config.lossless || !config.pngPalette) {
      pipeline = pipeline.png({
        compressionLevel,
        palette: false,
        adaptiveFiltering: true
      })
    } else {
      pipeline = pipeline.png({
        compressionLevel,
        palette: true,
        quality,
        effort: Math.max(1, Math.min(10, effort + 1))
      })
    }
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({
      lossless: Boolean(config.lossless),
      quality,
      effort: Math.max(0, Math.min(6, effort))
    })
  } else if (targetFormat === 'avif') {
    pipeline = pipeline.avif({
      lossless: Boolean(config.lossless),
      quality,
      effort: Math.max(0, Math.min(9, effort))
    })
  }

  return { pipeline, targetFormat }
}

export async function generateImagePreview(
  req: ImagePreviewRequest,
  signal?: AbortSignal
): Promise<ImagePreviewResponse> {
  const startTime = Date.now()
  if (signal?.aborted) {
    throw new Error('Đã hủy tạo xem trước.')
  }

  const stat = fs.statSync(req.sourcePath)
  const { probe, unsupportedReason } = await probeImageFile(req.sourcePath)
  if (!probe || unsupportedReason) {
    throw new Error(unsupportedReason || 'Ảnh không được hỗ trợ xem trước.')
  }

  // Build original oriented buffer for accurate 100% visual comparison
  const origOrientedBuf = await sharp(req.sourcePath, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .png()
    .toBuffer()

  if (signal?.aborted) {
    throw new Error('Đã hủy tạo xem trước.')
  }

  const { pipeline, targetFormat } = buildImageSharpPipeline(req.sourcePath, probe, req.config)
  const { data: outBuf, info: outInfo } = await pipeline.toBuffer({ resolveWithObject: true })

  if (signal?.aborted) {
    throw new Error('Đã hủy tạo xem trước.')
  }

  const mimeMap: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif'
  }
  const outMime = mimeMap[targetFormat] || 'image/jpeg'

  const oriented = getOrientedDimensions(probe)

  return {
    originalDataUrl: `data:image/png;base64,${origOrientedBuf.toString('base64')}`,
    previewDataUrl: `data:${outMime};base64,${outBuf.toString('base64')}`,
    originalSizeBytes: stat.size,
    estimatedSizeBytes: outBuf.length,
    originalWidth: oriented.width,
    originalHeight: oriented.height,
    outputWidth: outInfo.width,
    outputHeight: outInfo.height,
    outputFormat: targetFormat.toUpperCase(),
    durationMs: Date.now() - startTime
  }
}

export async function executeImageJob(
  job: CompressionJob,
  probe: ImageProbeInfo,
  onProgress: (p: JobProgressInfo) => void,
  signal: AbortSignal
): Promise<{ status: JobStatus; result?: JobResultInfo; reason?: string }> {
  const startTime = Date.now()
  const sourcePath = job.primarySourcePath
  const config = job.configSnapshot.image

  // Verify input wasn't deleted or modified unexpectedly before running
  if (!fs.existsSync(sourcePath)) {
    return { status: 'failed', reason: 'File ảnh nguồn không còn tồn tại trên ổ đĩa.' }
  }
  const currentStat = fs.statSync(sourcePath)
  if (currentStat.size !== job.inputSizeBytes) {
    return {
      status: 'failed',
      reason: 'File ảnh nguồn đã bị thay đổi dung lượng trong khi chờ xử lý.'
    }
  }

  const targetFormat = resolveTargetImageFormat(probe.format, config)
  const targetExt = getImageExtensionForFormat(targetFormat)
  const plannedPath = buildPlannedOutputPath(
    sourcePath,
    targetExt,
    job.configSnapshot,
    job.relativeFolder
  )
  const tempDir = createJobTempDir(path.dirname(plannedPath), job.id)

  try {
    const oriented = getOrientedDimensions(probe)
    const isFormatChanged = targetFormat !== probe.format
    const isResizeRequested =
      (config.resizeMode === 'long_edge' &&
        config.longEdge < Math.max(oriented.width, oriented.height)) ||
      (config.resizeMode === 'dimensions' &&
        (config.maxWidth < oriented.width || config.maxHeight < oriented.height)) ||
      (config.resizeMode === 'percent' && config.scalePercent < 100)

    const enabledMultiSizes = (config.multiSizePresets || []).filter((m) => m.enabled && m.longEdge > 0)

    // CASE 1: Multi-size batch export for this image
    if (enabledMultiSizes.length > 0 && !config.targetSizeEnabled) {
      const multiResults: MultiSizeOutputItem[] = []
      let totalOutBytes = 0

      for (let i = 0; i < enabledMultiSizes.length; i++) {
        if (signal.aborted) {
          return { status: 'cancelled', reason: 'Đã hủy theo yêu cầu người dùng.' }
        }
        const spec = enabledMultiSizes[i]
        onProgress({
          phase: 'encoding',
          percent: Math.round((i / enabledMultiSizes.length) * 100),
          attempt: i + 1,
          maxAttempts: enabledMultiSizes.length,
          detailText: `Đang xuất kích thước ${spec.label} (${spec.longEdge}px)...`
        })

        const tempOut = path.join(tempDir, `multi_${i}${targetExt}`)
        const { pipeline } = buildImageSharpPipeline(
          sourcePath,
          probe,
          config,
          config.quality,
          spec.longEdge
        )
        const info = await pipeline.toFile(tempOut)
        const verifyMeta = await sharp(tempOut).metadata()
        if (!verifyMeta.width || !verifyMeta.height) {
          throw new Error(`File xuất kích thước ${spec.label} không hợp lệ.`)
        }

        const variantPlanned = buildPlannedOutputPath(
          sourcePath,
          targetExt,
          job.configSnapshot,
          job.relativeFolder,
          spec.suffix || `_${spec.longEdge}w`
        )
        const allocatedVariant = allocateUniqueOutputPath(variantPlanned, [sourcePath])
        try {
          finalizeTempFileToOutput(tempOut, allocatedVariant, [sourcePath])
        } finally {
          releaseReservedOutputPath(allocatedVariant)
        }

        const outSize = fs.statSync(allocatedVariant).size
        totalOutBytes += outSize
        multiResults.push({
          label: spec.label,
          outputPath: allocatedVariant,
          sizeBytes: outSize,
          width: info.width,
          height: info.height,
          status: outSize < job.inputSizeBytes ? 'completed' : 'converted_not_smaller'
        })
      }

      const firstOut = multiResults[0]
      const savedBytes = Math.max(0, job.inputSizeBytes - firstOut.sizeBytes)
      const savedPercent =
        job.inputSizeBytes > 0
          ? Number((((job.inputSizeBytes - firstOut.sizeBytes) / job.inputSizeBytes) * 100).toFixed(1))
          : 0

      return {
        status: 'completed',
        result: {
          outputPath: firstOut.outputPath,
          outputSizeBytes: firstOut.sizeBytes,
          savedBytes,
          savedPercent,
          durationMs: Date.now() - startTime,
          finalWidth: firstOut.width,
          finalHeight: firstOut.height,
          multiOutputs: multiResults,
          validationSummary: `Đã xuất và kiểm chứng ${multiResults.length} kích thước (${targetFormat.toUpperCase()}).`
        }
      }
    }

    // CASE 2: Target Size Search Mode
    if (config.targetSizeEnabled) {
      const targetBytes = convertToBytes(config.targetSizeValue, config.targetSizeUnit)
      const minQ = Math.max(10, Math.min(90, config.targetMinQuality))
      const maxQ = 92

      const baseMaxEdge =
        config.resizeMode === 'long_edge'
          ? Math.min(config.longEdge, Math.max(oriented.width, oriented.height))
          : Math.max(oriented.width, oriented.height)

      const scaleEdges: number[] = [baseMaxEdge]
      if (config.targetAllowResize && config.targetMinLongEdge < baseMaxEdge) {
        const midEdge = Math.round((baseMaxEdge + config.targetMinLongEdge) / 2)
        if (midEdge < baseMaxEdge && midEdge > config.targetMinLongEdge) {
          scaleEdges.push(midEdge)
        }
        scaleEdges.push(config.targetMinLongEdge)
      }

      const maxTotalAttempts = scaleEdges.length * 5
      let attemptsUsed = 0
      let bestCandidate: {
        tempFile: string
        sizeBytes: number
        quality: number
        width: number
        height: number
      } | null = null
      let smallestAttempt: {
        sizeBytes: number
        quality: number
        width: number
        height: number
      } | null = null

      for (const edge of scaleEdges) {
        let low = minQ
        let high = maxQ
        for (let step = 0; step < 5; step++) {
          if (signal.aborted) {
            return { status: 'cancelled', reason: 'Đã hủy theo yêu cầu người dùng.' }
          }
          attemptsUsed++
          const candidateQ = step === 0 ? Math.min(config.quality, high) : Math.round((low + high) / 2)

          onProgress({
            phase: 'searching',
            percent: Math.min(95, Math.round((attemptsUsed / maxTotalAttempts) * 100)),
            attempt: attemptsUsed,
            maxAttempts: maxTotalAttempts,
            detailText: `Đang dò dung lượng mục tiêu (lần thử ${attemptsUsed}/${maxTotalAttempts}: Q=${candidateQ}, cạnh dài=${edge}px)...`
          })

          const tempCandidate = path.join(tempDir, `attempt_${attemptsUsed}${targetExt}`)
          const { pipeline } = buildImageSharpPipeline(
            sourcePath,
            probe,
            { ...config, lossless: false, pngPalette: true },
            candidateQ,
            edge < Math.max(oriented.width, oriented.height) ? edge : undefined
          )
          const info = await pipeline.toFile(tempCandidate)
          const candSize = fs.statSync(tempCandidate).size

          if (!smallestAttempt || candSize < smallestAttempt.sizeBytes) {
            smallestAttempt = {
              sizeBytes: candSize,
              quality: candidateQ,
              width: info.width,
              height: info.height
            }
          }

          if (candSize <= targetBytes) {
            if (!bestCandidate || candidateQ > bestCandidate.quality) {
              bestCandidate = {
                tempFile: tempCandidate,
                sizeBytes: candSize,
                quality: candidateQ,
                width: info.width,
                height: info.height
              }
            }
            low = candidateQ + 1
          } else {
            high = candidateQ - 1
          }

          if (low > high) break
        }

        // Prioritize keeping original dimensions if target met at current resolution
        if (bestCandidate) {
          break
        }
      }

      if (!bestCandidate) {
        const minReachedStr = smallestAttempt
          ? `${(smallestAttempt.sizeBytes / 1000).toFixed(1)} KB (ở Q=${smallestAttempt.quality}, ${smallestAttempt.width}x${smallestAttempt.height})`
          : 'N/A'
        return {
          status: 'target_unmet',
          reason: `Không đạt được giới hạn ${config.targetSizeValue} ${config.targetSizeUnit} trong ngưỡng cho phép (nhỏ nhất đạt ${minReachedStr}). File gốc được giữ nguyên; bạn có thể giảm Quality tối thiểu hoặc bật cho phép giảm kích thước.`,
          result: smallestAttempt
            ? {
                outputPath: sourcePath,
                outputSizeBytes: smallestAttempt.sizeBytes,
                savedBytes: 0,
                savedPercent: 0,
                durationMs: Date.now() - startTime,
                attemptsUsed,
                finalQuality: smallestAttempt.quality,
                finalWidth: smallestAttempt.width,
                finalHeight: smallestAttempt.height,
                keptOriginalAsFinal: true,
                validationSummary: `Chưa đạt mục tiêu ${config.targetSizeValue} ${config.targetSizeUnit}. Không xuất file vượt giới hạn.`
              }
            : undefined
        }
      }

      onProgress({
        phase: 'validating',
        percent: 98,
        detailText: 'Đang kiểm tra tính toàn vẹn của ảnh đầu ra...'
      })

      const verifyMeta = await sharp(bestCandidate.tempFile).metadata()
      if (!verifyMeta.width || !verifyMeta.height) {
        throw new Error('Ảnh đầu ra không giải mã được khi kiểm chứng.')
      }

      const allocatedPath = allocateUniqueOutputPath(plannedPath, [sourcePath])
      try {
        finalizeTempFileToOutput(bestCandidate.tempFile, allocatedPath, [sourcePath])
      } finally {
        releaseReservedOutputPath(allocatedPath)
      }

      const finalSize = fs.statSync(allocatedPath).size
      const savedBytes = job.inputSizeBytes - finalSize
      const savedPercent = Number(((savedBytes / job.inputSizeBytes) * 100).toFixed(1))

      return {
        status: 'completed',
        result: {
          outputPath: allocatedPath,
          outputSizeBytes: finalSize,
          savedBytes,
          savedPercent,
          durationMs: Date.now() - startTime,
          attemptsUsed,
          finalQuality: bestCandidate.quality,
          finalWidth: verifyMeta.width,
          finalHeight: verifyMeta.height,
          validationSummary: `Đạt mục tiêu <= ${config.targetSizeValue} ${config.targetSizeUnit} sau ${attemptsUsed} lần thử (${verifyMeta.width}x${verifyMeta.height}, Q=${bestCandidate.quality}).`
        }
      }
    }

    // CASE 3: Standard Quality / Format / Resize Mode
    onProgress({
      phase: 'encoding',
      percent: 35,
      detailText: `Đang tối ưu ảnh sang ${targetFormat.toUpperCase()}...`
    })

    const tempOut = path.join(tempDir, `output${targetExt}`)
    const { pipeline } = buildImageSharpPipeline(sourcePath, probe, config)
    await pipeline.toFile(tempOut)

    if (signal.aborted) {
      return { status: 'cancelled', reason: 'Đã hủy theo yêu cầu người dùng.' }
    }

    onProgress({
      phase: 'validating',
      percent: 90,
      detailText: 'Đang kiểm tra kích thước, màu sắc và khả năng giải mã...'
    })

    const outStat = fs.statSync(tempOut)
    const verifyMeta = await sharp(tempOut).metadata()
    if (!verifyMeta.width || !verifyMeta.height) {
      throw new Error('Ảnh đầu ra bị lỗi khi kiểm tra giải mã.')
    }

    // Check savings policy
    if (outStat.size >= job.inputSizeBytes) {
      if (!isFormatChanged && !isResizeRequested) {
        // Pure optimization goal: do NOT emit a larger file; report no_savings cleanly
        return {
          status: 'no_savings',
          reason: `Ảnh nguồn đã được tối ưu tốt (kết quả thử nghiệm ${outStat.size} B >= nguồn ${job.inputSizeBytes} B). Giữ nguyên nguồn.`,
          result: {
            outputPath: sourcePath,
            outputSizeBytes: job.inputSizeBytes,
            savedBytes: 0,
            savedPercent: 0,
            durationMs: Date.now() - startTime,
            finalWidth: oriented.width,
            finalHeight: oriented.height,
            keptOriginalAsFinal: true,
            validationSummary: 'Ảnh nguồn đã tối ưu tối đa với cấu hình hiện tại (No Savings).'
          }
        }
      }

      // Format change or resize was explicitly requested: emit file and mark converted_not_smaller
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
        reason: `Đã chuyển sang ${targetFormat.toUpperCase()} (${verifyMeta.width}x${verifyMeta.height}) theo yêu cầu nhưng dung lượng lớn hơn nguồn.`,
        result: {
          outputPath: allocatedPath,
          outputSizeBytes: outStat.size,
          savedBytes: diffBytes,
          savedPercent: diffPercent,
          durationMs: Date.now() - startTime,
          finalWidth: verifyMeta.width,
          finalHeight: verifyMeta.height,
          validationSummary: `Đã chuyển đổi hợp lệ sang ${targetFormat.toUpperCase()} (${verifyMeta.width}x${verifyMeta.height}).`
        }
      }
    }

    // Standard savings achieved
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
        finalWidth: verifyMeta.width,
        finalHeight: verifyMeta.height,
        validationSummary: `Giải mã hợp lệ (${(verifyMeta.format || targetFormat).toUpperCase()}, ${verifyMeta.width}x${verifyMeta.height}, ${verifyMeta.space || 'srgb'}).`
      }
    }
  } finally {
    cleanupJobTempDir(tempDir)
  }
}

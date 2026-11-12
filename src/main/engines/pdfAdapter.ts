import fs from 'node:fs'
import path from 'node:path'
import {
  CompressionJob,
  JobProgressInfo,
  JobResultInfo,
  JobStatus,
  PdfProbeInfo
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

function detectPdfDigitalSignature(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath)
    // Read up to 4 MB to check for /ByteRange and /Type /Sig or /SubFilter
    const maxBytes = Math.min(stat.size, 4 * 1024 * 1024)
    const buf = Buffer.alloc(maxBytes)
    const fd = fs.openSync(filePath, 'r')
    try {
      fs.readSync(fd, buf, 0, maxBytes, 0)
    } finally {
      fs.closeSync(fd)
    }
    const text = buf.toString('latin1')
    const hasByteRange = /\/ByteRange\s*\[/.test(text)
    const hasSigType =
      /\/Type\s*\/Sig\b/.test(text) ||
      /\/SubFilter\s*\/(adbe\.pkcs7|ETSI\.CAdES|ETSI\.RFC3161)/.test(text)
    return hasByteRange && hasSigType
  } catch {
    return false
  }
}

export async function probePdfFile(filePath: string): Promise<{
  probe?: PdfProbeInfo
  unsupportedReason?: string
}> {
  const qpdfPath = getBinaryPath('qpdf')

  // 1. Check encryption first (--is-encrypted returns 0 if encrypted, 2 if not encrypted)
  const encCheck = await runManagedProcess({
    exePath: qpdfPath,
    args: ['--is-encrypted', filePath],
    timeoutMs: 10000
  })

  if (encCheck.exitCode === 0) {
    return {
      unsupportedReason:
        'File PDF đang được mã hóa hoặc bảo vệ bằng mật khẩu. Ứng dụng từ chối tự động gỡ mật khẩu.'
    }
  }

  // 2. Check digital signature
  if (detectPdfDigitalSignature(filePath)) {
    return {
      unsupportedReason:
        'File PDF chứa chữ ký số (Digital Signature). Mọi thay đổi cấu trúc stream sẽ làm mất hiệu lực chữ ký số nên file được giữ nguyên.'
    }
  }

  // 3. Get page count
  const npagesRes = await runManagedProcess({
    exePath: qpdfPath,
    args: ['--show-npages', filePath],
    timeoutMs: 10000
  })

  if ((npagesRes.exitCode !== 0 && npagesRes.exitCode !== 3) || npagesRes.stdoutTail.length === 0) {
    return {
      unsupportedReason: `File PDF bị lỗi cấu trúc hoặc không đọc được số trang: ${npagesRes.stderrTail.slice(-2).join(' ')}`
    }
  }

  const pageCount = Number(npagesRes.stdoutTail[0]?.trim() || 0)
  if (!Number.isFinite(pageCount) || pageCount <= 0) {
    return {
      unsupportedReason: 'Không xác định được số trang hợp lệ của tài liệu PDF.'
    }
  }

  // Read PDF header version
  let pdfVersion = '1.7'
  try {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(16)
    fs.readSync(fd, buf, 0, 16, 0)
    fs.closeSync(fd)
    const m = buf.toString('ascii').match(/%PDF-(\d+\.\d+)/)
    if (m) pdfVersion = m[1]
  } catch {
    // ignore
  }

  const linRes = await runManagedProcess({
    exePath: qpdfPath,
    args: ['--check-linearization', filePath],
    timeoutMs: 8000
  })
  const isLinearized =
    linRes.exitCode === 0 &&
    linRes.stdoutTail.some((l) => l.toLowerCase().includes('no linearization errors'))

  return {
    probe: {
      kind: 'pdf',
      pdfVersion,
      pageCount,
      isEncrypted: false,
      hasDigitalSignature: false,
      isLinearized
    }
  }
}

export async function executePdfJob(
  job: CompressionJob,
  probe: PdfProbeInfo,
  onProgress: (p: JobProgressInfo) => void,
  onLog: (line: string) => void,
  signal: AbortSignal
): Promise<{ status: JobStatus; result?: JobResultInfo; reason?: string }> {
  const startTime = Date.now()
  const sourcePath = job.primarySourcePath
  const config = job.configSnapshot.pdf
  const qpdfPath = getBinaryPath('qpdf')

  if (!fs.existsSync(sourcePath)) {
    return { status: 'failed', reason: 'File PDF nguồn không còn tồn tại trên ổ đĩa.' }
  }
  const currentStat = fs.statSync(sourcePath)
  if (currentStat.size !== job.inputSizeBytes) {
    return {
      status: 'failed',
      reason: 'File PDF nguồn đã bị thay đổi dung lượng trong khi chờ xử lý.'
    }
  }

  const plannedPath = buildPlannedOutputPath(
    sourcePath,
    '.pdf',
    job.configSnapshot,
    job.relativeFolder
  )
  const tempDir = createJobTempDir(path.dirname(plannedPath), job.id)

  try {
    const tempOut = path.join(tempDir, 'optimized.pdf')

    onProgress({
      phase: 'encoding',
      percent: 30,
      detailText:
        config.mode === 'recompress_streams'
          ? 'Đang tối ưu cấu trúc object streams và nén lại luồng dữ liệu Flate...'
          : 'Đang tối ưu cấu trúc bảng tham chiếu và object streams...'
    })

    const args: string[] = [
      sourcePath,
      `--object-streams=${config.objectStreams}`,
      '--compress-streams=y',
      '--remove-unreferenced-resources=yes'
    ]

    if (config.mode === 'recompress_streams') {
      args.push(
        '--decode-level=generalized',
        '--recompress-flate',
        '--compression-level=9'
      )
    } else {
      args.push('--decode-level=specialized')
    }

    if (config.linearize) {
      args.push('--linearize')
    }

    args.push(tempOut)

    const res = await runManagedProcess({
      exePath: qpdfPath,
      args,
      cwd: tempDir,
      signal,
      timeoutMs: 10 * 60 * 1000,
      onStdoutLine: (l) => onLog(l),
      onStderrLine: (l) => onLog(l)
    })

    if (res.cancelled || signal.aborted) {
      return { status: 'cancelled', reason: 'Đã hủy tối ưu PDF theo yêu cầu.' }
    }

    // qpdf exit code 0 = success, 3 = succeeded with warnings
    if ((res.exitCode !== 0 && res.exitCode !== 3) || !fs.existsSync(tempOut)) {
      return {
        status: 'failed',
        reason: `qpdf trả về mã lỗi ${res.exitCode}: ${res.stderrTail.slice(-2).join(' | ')}`
      }
    }

    onProgress({
      phase: 'validating',
      percent: 85,
      detailText: 'Đang kiểm tra tính toàn vẹn cấu trúc PDF và đối chiếu số trang...'
    })

    const checkRes = await runManagedProcess({
      exePath: qpdfPath,
      args: ['--show-npages', tempOut],
      timeoutMs: 15000,
      signal
    })

    if (checkRes.exitCode !== 0 && checkRes.exitCode !== 3) {
      return {
        status: 'failed',
        reason: 'File PDF đầu ra không vượt qua bước kiểm tra cấu trúc qpdf.'
      }
    }

    const outPages = Number(checkRes.stdoutTail[0]?.trim() || 0)
    if (outPages !== probe.pageCount) {
      return {
        status: 'failed',
        reason: `Số trang đầu ra (${outPages}) không khớp với số trang gốc (${probe.pageCount}).`
      }
    }

    const outStat = fs.statSync(tempOut)
    if (outStat.size >= job.inputSizeBytes) {
      return {
        status: 'no_savings',
        reason: `Tài liệu PDF gốc đã có cấu trúc stream nén tối đa (kết quả thử nghiệm ${outStat.size} B >= nguồn ${job.inputSizeBytes} B). Giữ nguyên file gốc.`,
        result: {
          outputPath: sourcePath,
          outputSizeBytes: job.inputSizeBytes,
          savedBytes: 0,
          savedPercent: 0,
          durationMs: Date.now() - startTime,
          keptOriginalAsFinal: true,
          validationSummary: `Giữ nguyên nguồn (${probe.pageCount} trang). Không giảm thêm bằng nén cấu trúc không mất dữ liệu.`
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
        validationSummary: `Cấu trúc PDF hợp lệ (${outPages}/${probe.pageCount} trang, bảo toàn vector/text/link).`
      }
    }
  } finally {
    cleanupJobTempDir(tempDir)
  }
}


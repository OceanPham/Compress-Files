import fs from 'node:fs'
import path from 'node:path'
import {
  ArchiveEntryManifest,
  ArchiveProbeInfo,
  CompressionJob,
  JobProgressInfo,
  JobResultInfo,
  JobStatus
} from '../../shared/types'
import { getBinaryPath, runManagedProcess } from '../utils/binaries'
import {
  allocateUniqueOutputPath,
  cleanupJobTempDir,
  computePlannedOutputDir,
  createJobTempDir,
  finalizeTempFileToOutput,
  isKnownAppGeneratedOutput,
  normalizeCanonicalPath,
  releaseReservedOutputPath
} from '../utils/fileSafety'

export async function probeArchiveInputs(sourcePaths: string[]): Promise<{
  probe?: ArchiveProbeInfo
  unsupportedReason?: string
}> {
  if (!sourcePaths || sourcePaths.length === 0) {
    return { unsupportedReason: 'Danh sách nguồn để tạo Archive đang trống.' }
  }

  const entries: ArchiveEntryManifest[] = []
  let fileCount = 0
  let folderCount = 0
  let totalBytes = 0
  let hasRootCollision = false

  const usedRootNames = new Map<string, number>()
  const visitedCanonical = new Set<string>()

  const walkEntry = (absPath: string, archiveRelPath: string, depth: number): void => {
    if (depth > 20) return
    const lstat = fs.lstatSync(absPath)
    if (lstat.isSymbolicLink()) {
      return
    }
    if (isKnownAppGeneratedOutput(absPath)) {
      return
    }

    if (lstat.isDirectory()) {
      folderCount++
      entries.push({
        sourcePath: absPath,
        archiveRelativePath: archiveRelPath.replace(/\\/g, '/'),
        isDirectory: true,
        sizeBytes: 0,
        mtimeMs: lstat.mtimeMs
      })
      const children = fs.readdirSync(absPath)
      for (const child of children) {
        if (child.startsWith('.fc_tmp_')) continue
        walkEntry(path.join(absPath, child), path.join(archiveRelPath, child), depth + 1)
      }
    } else if (lstat.isFile()) {
      fileCount++
      totalBytes += lstat.size
      entries.push({
        sourcePath: absPath,
        archiveRelativePath: archiveRelPath.replace(/\\/g, '/'),
        isDirectory: false,
        sizeBytes: lstat.size,
        mtimeMs: lstat.mtimeMs
      })
    }
  }

  try {
    for (const rawSrc of sourcePaths) {
      const resolved = path.resolve(rawSrc)
      if (!fs.existsSync(resolved)) {
        return { unsupportedReason: `Đường dẫn không tồn tại: ${resolved}` }
      }
      const canon = normalizeCanonicalPath(resolved)
      if (visitedCanonical.has(canon)) {
        continue
      }
      visitedCanonical.add(canon)

      const lstat = fs.lstatSync(resolved)
      if (lstat.isSymbolicLink()) {
        return {
          unsupportedReason: `Không hỗ trợ đưa trực tiếp symlink/junction vào archive: ${resolved}`
        }
      }

      const rawBase = path.basename(resolved)
      const lowerBase = rawBase.toLowerCase()
      const prevCount = usedRootNames.get(lowerBase) || 0
      usedRootNames.set(lowerBase, prevCount + 1)

      let archiveRootName = rawBase
      if (prevCount > 0) {
        hasRootCollision = true
        const parsed = path.parse(rawBase)
        archiveRootName = lstat.isDirectory()
          ? `${rawBase}_${prevCount + 1}`
          : `${parsed.name}_${prevCount + 1}${parsed.ext}`
      }

      walkEntry(resolved, archiveRootName, 0)
    }
  } catch (err) {
    return {
      unsupportedReason: `Lỗi khi quét danh sách file tạo archive: ${(err as Error).message}`
    }
  }

  if (fileCount === 0 && folderCount === 0) {
    return {
      unsupportedReason: 'Không có file hoặc thư mục hợp lệ nào để nén thành archive.'
    }
  }

  return {
    probe: {
      kind: 'archive',
      inputCount: sourcePaths.length,
      fileCount,
      folderCount,
      totalBytes,
      hasRootCollision,
      entries
    }
  }
}

function stageArchiveTree(entries: ArchiveEntryManifest[], stageDir: string): void {
  fs.mkdirSync(stageDir, { recursive: true })
  for (const entry of entries) {
    const destPath = path.join(stageDir, entry.archiveRelativePath)
    if (entry.isDirectory) {
      fs.mkdirSync(destPath, { recursive: true })
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      try {
        // Hardlink first (instant, zero disk space on same volume)
        fs.linkSync(entry.sourcePath, destPath)
      } catch {
        fs.copyFileSync(entry.sourcePath, destPath)
      }
    }
  }
}

function verifySourceManifestUnchanged(entries: ArchiveEntryManifest[]): string | null {
  for (const entry of entries) {
    if (!fs.existsSync(entry.sourcePath)) {
      return `File nguồn bị xóa hoặc di chuyển trong lúc đang nén: ${entry.sourcePath}`
    }
    if (!entry.isDirectory) {
      const st = fs.statSync(entry.sourcePath)
      if (st.size !== entry.sizeBytes || Math.abs(st.mtimeMs - entry.mtimeMs) > 2000) {
        return `File nguồn đã bị sửa đổi trong lúc đang tạo archive: ${entry.sourcePath}`
      }
    }
  }
  return null
}

export async function executeArchiveJob(
  job: CompressionJob,
  probe: ArchiveProbeInfo,
  onProgress: (p: JobProgressInfo) => void,
  onLog: (line: string) => void,
  signal: AbortSignal
): Promise<{ status: JobStatus; result?: JobResultInfo; reason?: string }> {
  const startTime = Date.now()
  const config = job.configSnapshot.archive
  const sevenZipPath = getBinaryPath('7za')

  const preCheckErr = verifySourceManifestUnchanged(probe.entries)
  if (preCheckErr) {
    return { status: 'failed', reason: preCheckErr }
  }

  const ext = config.archiveFormat === '7z' ? '.7z' : '.zip'
  const outDir = computePlannedOutputDir(job.primarySourcePath, job.configSnapshot, '')
  const cleanBaseName = (config.archiveBaseName || 'Archive_Bundle').replace(/[<>:"/\\|?*]/g, '_')
  const plannedPath = path.join(outDir, `${cleanBaseName}${ext}`)

  const tempDir = createJobTempDir(outDir, job.id)

  try {
    const stageDir = path.join(tempDir, 'stage')
    onProgress({
      phase: 'archiving',
      percent: 5,
      detailText: 'Đang chuẩn bị cấu trúc thư mục và danh sách đóng gói...'
    })

    stageArchiveTree(probe.entries, stageDir)

    const tempArchivePath = path.join(tempDir, `output${ext}`)
    const levelMap: Record<typeof config.compressionPreset, number> = {
      fast: 1,
      balanced: 5,
      ultra: 9
    }
    const mx = levelMap[config.compressionPreset] ?? 5

    const args: string[] = [
      'a',
      `-t${config.archiveFormat}`,
      `-mx=${mx}`,
      '-scsUTF-8',
      '-bsp1',
      '-y'
    ]

    if (config.archiveFormat === '7z') {
      args.push('-m0=lzma2')
      args.push(`-md=${config.dictionarySizeMb}m`)
      args.push(config.solidMode ? '-ms=on' : '-ms=off')
    } else {
      // ZIP UTF-8 filename flag
      args.push('-mcu=on')
    }

    args.push(tempArchivePath, '*')

    onProgress({
      phase: 'archiving',
      percent: 15,
      detailText: `Đang đóng gói ${probe.fileCount} file vào ${config.archiveFormat.toUpperCase()}...`
    })

    const res = await runManagedProcess({
      exePath: sevenZipPath,
      args,
      cwd: stageDir,
      signal,
      timeoutMs: 30 * 60 * 1000,
      onStdoutLine: (line) => {
        onLog(line)
        const m = line.match(/(\d{1,3})%/)
        if (m) {
          const pct = Math.min(92, Math.max(15, Number(m[1])))
          onProgress({
            phase: 'archiving',
            percent: pct,
            detailText: `Đang nén ${config.archiveFormat.toUpperCase()} (${pct}%)...`
          })
        }
      },
      onStderrLine: (line) => onLog(line)
    })

    if (res.cancelled || signal.aborted) {
      return { status: 'cancelled', reason: 'Đã hủy tạo archive theo yêu cầu.' }
    }

    if (res.exitCode !== 0 || !fs.existsSync(tempArchivePath)) {
      return {
        status: 'failed',
        reason: `7-Zip báo lỗi khi tạo archive (exit ${res.exitCode}): ${res.stderrTail.slice(-2).join(' | ')}`
      }
    }

    // Verify source was not mutated mid-run
    const postCheckErr = verifySourceManifestUnchanged(probe.entries)
    if (postCheckErr) {
      return { status: 'failed', reason: postCheckErr }
    }

    // Integrity check: 7za t <tempArchivePath>
    onProgress({
      phase: 'validating',
      percent: 96,
      detailText: 'Đang kiểm tra tính toàn vẹn CRC/hash của archive...'
    })

    const testRes = await runManagedProcess({
      exePath: sevenZipPath,
      args: ['t', tempArchivePath, '-y'],
      cwd: tempDir,
      signal,
      timeoutMs: 10 * 60 * 1000
    })

    if (testRes.exitCode !== 0 || !testRes.stdoutTail.some((l) => l.includes('Everything is Ok'))) {
      return {
        status: 'failed',
        reason: 'Archive tạo ra không vượt qua bước kiểm tra tính toàn vẹn (7za t).'
      }
    }

    const outStat = fs.statSync(tempArchivePath)
    const allocatedPath = allocateUniqueOutputPath(plannedPath, job.sourcePaths)
    try {
      finalizeTempFileToOutput(tempArchivePath, allocatedPath, job.sourcePaths)
    } finally {
      releaseReservedOutputPath(allocatedPath)
    }

    const savedBytes = probe.totalBytes - outStat.size
    const savedPercent =
      probe.totalBytes > 0
        ? Number(((savedBytes / probe.totalBytes) * 100).toFixed(1))
        : 0

    return {
      status: 'completed',
      result: {
        outputPath: allocatedPath,
        outputSizeBytes: outStat.size,
        savedBytes,
        savedPercent,
        durationMs: Date.now() - startTime,
        validationSummary: `Archive ${config.archiveFormat.toUpperCase()} hợp lệ (${probe.fileCount} file, ${probe.folderCount} thư mục, CRC Everything is Ok).`
      }
    }
  } finally {
    cleanupJobTempDir(tempDir)
  }
}


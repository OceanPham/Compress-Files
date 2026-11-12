import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { JobCategory, JobConfigSnapshot, SkippedImportItem } from '../../shared/types'

const reservedOutputPaths = new Set<string>()
const activeOutputPaths = new Set<string>()

export function normalizeCanonicalPath(targetPath: string): string {
  const resolved = path.resolve(targetPath)
  try {
    return fs.realpathSync.native(resolved).toLowerCase()
  } catch {
    return resolved.toLowerCase()
  }
}

export function areSameFilePaths(pathA: string, pathB: string): boolean {
  return normalizeCanonicalPath(pathA) === normalizeCanonicalPath(pathB)
}

export function registerCompletedOutputPath(outputPath: string): void {
  activeOutputPaths.add(normalizeCanonicalPath(outputPath))
}

export function isKnownAppGeneratedOutput(filePath: string): boolean {
  const norm = normalizeCanonicalPath(filePath)
  if (activeOutputPaths.has(norm) || reservedOutputPaths.has(norm)) {
    return true
  }
  const base = path.basename(filePath).toLowerCase()
  if (base.startsWith('.fc_tmp_') || base.includes('.fc-temp-')) {
    return true
  }
  return false
}

export function computePlannedOutputDir(
  sourcePath: string,
  config: JobConfigSnapshot,
  relativeFolder = ''
): string {
  const baseDir =
    config.naming.outputDirMode === 'custom_folder' && config.naming.customOutputDir.trim()
      ? path.resolve(config.naming.customOutputDir.trim())
      : path.dirname(path.resolve(sourcePath))

  if (config.naming.preserveRelativeStructure && relativeFolder.trim()) {
    // Sanitize relativeFolder against path traversal
    const safeRel = relativeFolder
      .split(/[\\/]/)
      .filter((seg) => seg && seg !== '.' && seg !== '..')
      .join(path.sep)
    return path.join(baseDir, safeRel)
  }

  return baseDir
}

export function buildPlannedOutputPath(
  sourcePath: string,
  targetExtWithDot: string,
  config: JobConfigSnapshot,
  relativeFolder = '',
  extraTag = '',
  sequenceNumber = 1
): string {
  const outDir = computePlannedOutputDir(sourcePath, config, relativeFolder)
  const parsed = path.parse(sourcePath)
  const cleanSuffix = (config.naming.suffix || '_compressed').replace(/[<>:"/\\|?*]/g, '_')
  let stem = parsed.name

  switch (config.naming.namingPattern) {
    case 'original':
      stem = `${parsed.name}${extraTag}`
      break
    case 'size_tag':
      stem = `${parsed.name}${cleanSuffix}${extraTag || `_${config.presetTier}`}`
      break
    case 'sequence':
      stem = `${parsed.name}${cleanSuffix}_${String(sequenceNumber).padStart(3, '0')}${extraTag}`
      break
    case 'suffix':
    default:
      stem = `${parsed.name}${cleanSuffix}${extraTag}`
      break
  }

  const candidate = path.join(outDir, `${stem}${targetExtWithDot}`)
  if (areSameFilePaths(sourcePath, candidate)) {
    return path.join(outDir, `${stem}_out${targetExtWithDot}`)
  }
  return candidate
}

export function allocateUniqueOutputPath(
  preferredPath: string,
  sourcePathsToProtect: string[]
): string {
  const resolvedPreferred = path.resolve(preferredPath)
  const parsed = path.parse(resolvedPreferred)
  fs.mkdirSync(parsed.dir, { recursive: true })

  const protectedSet = new Set(sourcePathsToProtect.map((p) => normalizeCanonicalPath(p)))

  let attempt = 0
  while (attempt < 10000) {
    const candidateName =
      attempt === 0 ? `${parsed.name}${parsed.ext}` : `${parsed.name} (${attempt})${parsed.ext}`
    const candidatePath = path.join(parsed.dir, candidateName)
    const norm = normalizeCanonicalPath(candidatePath)

    if (!protectedSet.has(norm) && !reservedOutputPaths.has(norm) && !fs.existsSync(candidatePath)) {
      reservedOutputPaths.add(norm)
      return candidatePath
    }
    attempt++
  }

  const randomTag = crypto.randomBytes(4).toString('hex')
  const fallbackPath = path.join(parsed.dir, `${parsed.name}_${randomTag}${parsed.ext}`)
  reservedOutputPaths.add(normalizeCanonicalPath(fallbackPath))
  return fallbackPath
}

export function releaseReservedOutputPath(allocatedPath: string): void {
  reservedOutputPaths.delete(normalizeCanonicalPath(allocatedPath))
}

export function createJobTempDir(preferredDestDir: string, jobId: string): string {
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, '')
  // Try creating temp directory on same volume inside preferredDestDir parent or preferredDestDir
  try {
    fs.mkdirSync(preferredDestDir, { recursive: true })
    const sameVolumeTemp = path.join(preferredDestDir, `.fc_tmp_${safeId}`)
    fs.mkdirSync(sameVolumeTemp, { recursive: true })
    return sameVolumeTemp
  } catch {
    const osTemp = path.join(os.tmpdir(), 'file-compressor-jobs', `job_${safeId}_${Date.now()}`)
    fs.mkdirSync(osTemp, { recursive: true })
    return osTemp
  }
}

export function cleanupJobTempDir(tempDir: string | null | undefined): void {
  if (!tempDir) return
  const base = path.basename(tempDir)
  // Safety check: ONLY delete directories created by our app (.fc_tmp_ or inside file-compressor-jobs)
  if (!base.startsWith('.fc_tmp_') && !tempDir.includes('file-compressor-jobs')) {
    return
  }
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch {
    // ignore cleanup failures
  }
}

export function finalizeTempFileToOutput(
  tempFilePath: string,
  finalOutputPath: string,
  sourcePathsToProtect: string[]
): void {
  for (const src of sourcePathsToProtect) {
    if (areSameFilePaths(src, finalOutputPath)) {
      throw new Error('Từ chối ghi đè lên đường dẫn file nguồn gốc.')
    }
  }

  fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true })
  try {
    fs.renameSync(tempFilePath, finalOutputPath)
  } catch {
    // Cross-device fallback: copy then unlink
    fs.copyFileSync(tempFilePath, finalOutputPath)
    fs.unlinkSync(tempFilePath)
  }
  registerCompletedOutputPath(finalOutputPath)
}

export interface HeaderSniffResult {
  category: JobCategory | 'unsupported'
  detectedFormat: string
  unsupportedReason?: string
}

export function sniffFileHeader(filePath: string): HeaderSniffResult {
  let fd: number | null = null
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) {
      return { category: 'unsupported', detectedFormat: 'directory', unsupportedReason: 'Không phải là file hợp lệ.' }
    }
    if (stat.size === 0) {
      return { category: 'unsupported', detectedFormat: 'empty', unsupportedReason: 'File rỗng (0 byte).' }
    }

    const buf = Buffer.alloc(Math.min(64, stat.size))
    fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buf, 0, buf.length, 0)
  
    const ext = path.extname(filePath).toLowerCase()

    // 1. Check PDF (%PDF-)
    if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { category: 'pdf', detectedFormat: 'pdf' }
    }

    // 2. Check JPEG (FF D8 FF)
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { category: 'image', detectedFormat: 'jpeg' }
    }

    // 3. Check PNG (89 50 4E 47 0D 0A 1A 0A)
    if (
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return { category: 'image', detectedFormat: 'png' }
    }

    // 4. Check GIF (GIF87a / GIF89a) -> Explicitly report animated/GIF out of scope
    if (buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF89a' || buf.subarray(0, 6).toString('ascii') === 'GIF87a')) {
      return {
        category: 'image',
        detectedFormat: 'gif',
        unsupportedReason: 'Ảnh GIF / ảnh động nằm ngoài phạm vi tối ưu ảnh tĩnh (không tự động lấy frame đầu).'
      }
    }

    // 5. Check TIFF (II*\0 or MM\0*) or RAW extensions
    if (
      buf.length >= 4 &&
      ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
        (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a))
    ) {
      return {
        category: 'image',
        detectedFormat: 'tiff_or_raw',
        unsupportedReason: 'Định dạng TIFF / RAW hoặc ảnh nhiều trang nằm ngoài phạm vi nén ảnh tĩnh chuẩn.'
      }
    }

    // 6. Check RIFF (WebP or AVI/WAV)
    if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF') {
      const fourcc = buf.subarray(8, 12).toString('ascii')
      if (fourcc === 'WEBP') {
        return { category: 'image', detectedFormat: 'webp' }
      }
    }

    // 7. Check ISO Base Media File Format (ftyp at offset 4) -> MP4, MOV, HEIC, AVIF
    if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brand = buf.subarray(8, 12).toString('ascii').trim().toLowerCase()
      if (['avif', 'avis'].includes(brand)) {
        if (brand === 'avis') {
          return {
            category: 'image',
            detectedFormat: 'avif_sequence',
            unsupportedReason: 'Ảnh động AVIF Sequence nằm ngoài phạm vi nén ảnh tĩnh.'
          }
        }
        return { category: 'image', detectedFormat: 'avif' }
      }
      if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
        if (['.heic', '.heif', '.hif'].includes(ext) || ['heic', 'heix', 'hevc', 'hevx'].includes(brand)) {
          return {
            category: 'image',
            detectedFormat: 'heic',
            unsupportedReason: 'Định dạng HEIC/HEIF nằm ngoài phạm vi hỗ trợ trực tiếp.'
          }
        }
      }
      return { category: 'video', detectedFormat: ext === '.mov' ? 'mov' : 'mp4' }
    }

    // 8. Check EBML (1A 45 DF A3) -> MKV / WebM
    if (
      buf.length >= 4 &&
      buf[0] === 0x1a &&
      buf[1] === 0x45 &&
      buf[2] === 0xdf &&
      buf[3] === 0xa3
    ) {
      return { category: 'video', detectedFormat: ext === '.webm' ? 'webm' : 'mkv' }
    }

    // Check known RAW / HEIC extensions
    if (['.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.rw2', '.heic', '.heif'].includes(ext)) {
      return {
        category: 'image',
        detectedFormat: ext.slice(1),
        unsupportedReason: `Định dạng ${ext.toUpperCase()} (RAW/HEIC) nằm ngoài phạm vi hỗ trợ nén ảnh trực tiếp.`
      }
    }

    // Check video extensions that might have non-ftyp headers (e.g. MOV with wide/moov atom first)
    if (['.mp4', '.mov', '.mkv', '.webm', '.m4v'].includes(ext)) {
      return { category: 'video', detectedFormat: ext.slice(1) }
    }

    // Other files (Office, EXE, existing archives, etc.)
    return {
      category: 'unsupported',
      detectedFormat: ext ? ext.slice(1) : 'unknown',
      unsupportedReason: `Định dạng "${ext || 'không xác định'}" không hỗ trợ nén media/PDF trực tiếp. Bạn có thể chuyển sang tab "Tạo ZIP/7z" để đóng gói file này.`
    }
  } catch (err) {
    return {
      category: 'unsupported',
      detectedFormat: 'error',
      unsupportedReason: `Không thể đọc file: ${(err as Error).message}`
    }
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd)
      } catch {
        // ignore
      }
    }
  }
}

export interface DiscoveredFileEntry {
  filePath: string
  relativeFolder: string
  rootSourceDir?: string
  sizeBytes: number
  mtimeMs: number
}

const MAX_SCAN_DEPTH = 12
const MAX_SCAN_FILES = 2500

export function scanPathsForMediaImport(inputPaths: string[]): {
  discovered: DiscoveredFileEntry[]
  skipped: SkippedImportItem[]
} {
  const discovered: DiscoveredFileEntry[] = []
  const skipped: SkippedImportItem[] = []
  const visitedFiles = new Set<string>()
  const visitedDirs = new Set<string>()

  // Detect if multiple root directories have the same basename
  const rootDirCounts = new Map<string, number>()
  for (const rawPath of inputPaths) {
    try {
      const st = fs.lstatSync(rawPath)
      if (st.isDirectory()) {
        const base = path.basename(rawPath).toLowerCase()
        rootDirCounts.set(base, (rootDirCounts.get(base) || 0) + 1)
      }
    } catch {
      // handled below
    }
  }

  const rootCollisionIndex = new Map<string, number>()

  function walk(
    currentPath: string,
    rootDir: string | undefined,
    rootPrefix: string,
    depth: number
  ): void {
    if (discovered.length >= MAX_SCAN_FILES) {
      skipped.push({
        path: currentPath,
        reason: `Vượt quá giới hạn quét tối đa (${MAX_SCAN_FILES} file) trong một lần nhập.`
      })
      return
    }

    let lstat: fs.Stats
    try {
      lstat = fs.lstatSync(currentPath)
    } catch (err) {
      skipped.push({
        path: currentPath,
        reason: `Không thể truy cập đường dẫn: ${(err as Error).message}`
      })
      return
    }

    if (lstat.isSymbolicLink()) {
      skipped.push({
        path: currentPath,
        reason: 'Bỏ qua symlink / junction để tránh quét lặp vô hạn.'
      })
      return
    }

    if (lstat.isDirectory()) {
      const baseName = path.basename(currentPath)
      if (baseName.startsWith('.fc_tmp_') || baseName === 'node_modules' || baseName === '.git') {
        skipped.push({
          path: currentPath,
          reason: `Bỏ qua thư mục tạm/hệ thống (${baseName}).`
        })
        return
      }
      if (depth > MAX_SCAN_DEPTH) {
        skipped.push({
          path: currentPath,
          reason: `Vượt quá độ sâu thư mục tối đa (${MAX_SCAN_DEPTH} cấp).`
        })
        return
      }

      const canonicalDir = normalizeCanonicalPath(currentPath)
      if (visitedDirs.has(canonicalDir)) {
        return
      }
      visitedDirs.add(canonicalDir)

      let children: string[] = []
      try {
        children = fs.readdirSync(currentPath)
      } catch (err) {
        skipped.push({
          path: currentPath,
          reason: `Không đủ quyền đọc thư mục: ${(err as Error).message}`
        })
        return
      }

      for (const child of children) {
        walk(path.join(currentPath, child), rootDir, rootPrefix, depth + 1)
      }
      return
    }

    if (lstat.isFile()) {
      if (isKnownAppGeneratedOutput(currentPath)) {
        skipped.push({
          path: currentPath,
          reason: 'Bỏ qua file đầu ra hoặc file tạm do chính ứng dụng vừa tạo.'
        })
        return
      }

      const canonicalFile = normalizeCanonicalPath(currentPath)
      if (visitedFiles.has(canonicalFile)) {
        skipped.push({
          path: currentPath,
          reason: 'Đường dẫn file bị trùng lặp trong danh sách chọn.'
        })
        return
      }
      visitedFiles.add(canonicalFile)

      let relFolder = ''
      if (rootDir) {
        const relFromRoot = path.relative(rootDir, path.dirname(currentPath))
        relFolder = relFromRoot ? path.join(rootPrefix, relFromRoot) : rootPrefix
      }

      discovered.push({
        filePath: path.resolve(currentPath),
        relativeFolder: relFolder,
        rootSourceDir: rootDir,
        sizeBytes: lstat.size,
        mtimeMs: lstat.mtimeMs
      })
    }
  }

  for (const rawPath of inputPaths) {
    try {
      const lstat = fs.lstatSync(rawPath)
      if (lstat.isSymbolicLink()) {
        skipped.push({
          path: rawPath,
          reason: 'Bỏ qua symlink / junction để tránh quét lặp.'
        })
        continue
      }
      if (lstat.isDirectory()) {
        const baseName = path.basename(rawPath)
        const lower = baseName.toLowerCase()
        let prefix = baseName
        if ((rootDirCounts.get(lower) || 0) > 1) {
          const idx = (rootCollisionIndex.get(lower) || 0) + 1
          rootCollisionIndex.set(lower, idx)
          prefix = idx === 1 ? baseName : `${baseName}_${idx}`
        }
        walk(rawPath, path.resolve(rawPath), prefix, 0)
      } else {
        walk(rawPath, undefined, '', 0)
      }
    } catch (err) {
      skipped.push({
        path: rawPath,
        reason: `Không tìm thấy hoặc không có quyền đọc: ${(err as Error).message}`
      })
    }
  }

  return { discovered, skipped }
}


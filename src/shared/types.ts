export type JobStatus =
  | 'queued'
  | 'probing'
  | 'running'
  | 'validating'
  | 'completed'
  | 'no_savings'
  | 'converted_not_smaller'
  | 'target_unmet'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'unsupported'

export type JobCategory = 'image' | 'video' | 'pdf' | 'archive'

export type PresetTier = 'high_quality' | 'balanced' | 'small_size' | 'custom'

export type ByteUnit = 'KB' | 'MB' | 'KiB' | 'MiB'

export type NamingPattern = 'suffix' | 'original' | 'size_tag' | 'sequence'

export interface OutputNamingConfig {
  outputDirMode: 'same_folder' | 'custom_folder'
  customOutputDir: string
  preserveRelativeStructure: boolean
  namingPattern: NamingPattern
  suffix: string
}

export interface MultiSizeSpec {
  id: string
  label: string
  longEdge: number
  suffix: string
  enabled: boolean
}

export interface ImageConfig {
  outputFormat: 'keep' | 'jpeg' | 'png' | 'webp' | 'avif'
  quality: number
  effort: number
  lossless: boolean
  pngPalette: boolean
  resizeMode: 'none' | 'long_edge' | 'dimensions' | 'percent'
  longEdge: number
  maxWidth: number
  maxHeight: number
  scalePercent: number
  alphaBackground: string
  colorProfilePolicy: 'keep_icc' | 'convert_srgb'
  metadataPolicy: 'strip_all' | 'keep_safe' | 'keep_all'
  targetSizeEnabled: boolean
  targetSizeValue: number
  targetSizeUnit: ByteUnit
  targetMinQuality: number
  targetAllowResize: boolean
  targetMinLongEdge: number
  multiSizePresets: MultiSizeSpec[]
}

export interface VideoConfig {
  mode: 'quality' | 'target_size'
  crf: number
  encoderPreset: 'faster' | 'fast' | 'medium' | 'slow'
  maxResolution: 'keep' | 2160 | 1440 | 1080 | 720 | 480
  maxFps: 'keep' | 60 | 30 | 24
  audioMode: 'auto_copy_or_aac' | 'aac' | 'none'
  audioBitrateKbps: 192 | 128 | 96 | 64
  selectedAudioStreamIndex?: number
  subtitlePolicy: 'drop' | 'mov_text'
  selectedSubtitleStreamIndex?: number
  targetSizeValue: number
  targetSizeUnit: ByteUnit
  targetMinResolution: 1080 | 720 | 480 | 360
  targetMinVideoBitrateKbps: number
  useHardwareEncoder: boolean
}

export interface PdfConfig {
  mode: 'structural_lossless' | 'recompress_streams'
  linearize: boolean
  objectStreams: 'generate' | 'preserve'
}

export interface ArchiveConfig {
  archiveFormat: 'zip' | '7z'
  compressionPreset: 'fast' | 'balanced' | 'ultra'
  archiveBaseName: string
  dictionarySizeMb: 16 | 32 | 64
  solidMode: boolean
}

export interface JobConfigSnapshot {
  presetTier: PresetTier
  naming: OutputNamingConfig
  image: ImageConfig
  video: VideoConfig
  pdf: PdfConfig
  archive: ArchiveConfig
}

export interface ImageProbeInfo {
  kind: 'image'
  format: string
  width: number
  height: number
  channels: number
  hasAlpha: boolean
  orientation: number
  space: string
  hasIccProfile: boolean
  isAnimated: boolean
  pages: number
  bitDepth: string
}

export interface AudioTrackInfo {
  streamIndex: number
  codec: string
  channels: number
  sampleRate: number
  bitrateKbps?: number
  language?: string
  title?: string
}

export interface SubtitleTrackInfo {
  streamIndex: number
  codec: string
  language?: string
  title?: string
}

export interface VideoProbeInfo {
  kind: 'video'
  container: string
  videoCodec: string
  width: number
  height: number
  rotation: number
  durationSec: number
  fps: number
  isVfr: boolean
  pixelFormat: string
  bitDepth: number
  isHdr: boolean
  colorTransfer?: string
  colorPrimaries?: string
  sampleAspectRatio?: string
  audioTracks: AudioTrackInfo[]
  subtitleTracks: SubtitleTrackInfo[]
  totalBitrateKbps?: number
  thumbnailDataUrl?: string
}

export interface PdfProbeInfo {
  kind: 'pdf'
  pdfVersion: string
  pageCount: number
  isEncrypted: boolean
  hasDigitalSignature: boolean
  isLinearized: boolean
}

export interface ArchiveEntryManifest {
  sourcePath: string
  archiveRelativePath: string
  isDirectory: boolean
  sizeBytes: number
  mtimeMs: number
}

export interface ArchiveProbeInfo {
  kind: 'archive'
  inputCount: number
  fileCount: number
  folderCount: number
  totalBytes: number
  hasRootCollision: boolean
  entries: ArchiveEntryManifest[]
}

export type ProbeInfo =
  | ImageProbeInfo
  | VideoProbeInfo
  | PdfProbeInfo
  | ArchiveProbeInfo

export interface MultiSizeOutputItem {
  label: string
  outputPath: string
  sizeBytes: number
  width: number
  height: number
  status: 'completed' | 'no_savings' | 'converted_not_smaller' | 'failed'
}

export interface JobProgressInfo {
  phase: 'probing' | 'pass1' | 'pass2' | 'encoding' | 'searching' | 'archiving' | 'validating'
  percent: number | null // null = indeterminate
  pass?: number
  totalPasses?: number
  attempt?: number
  maxAttempts?: number
  detailText: string
}

export interface JobResultInfo {
  outputPath: string
  outputSizeBytes: number
  savedBytes: number
  savedPercent: number
  durationMs: number
  attemptsUsed?: number
  finalQuality?: number
  finalWidth?: number
  finalHeight?: number
  keptOriginalAsFinal?: boolean
  multiOutputs?: MultiSizeOutputItem[]
  validationSummary: string
  warningMessage?: string
}

export interface CompressionJob {
  id: string
  category: JobCategory
  sourcePaths: string[]
  primarySourcePath: string
  displayName: string
  relativeFolder: string
  rootSourceDir?: string
  inputSizeBytes: number
  inputMtimeMs: number
  status: JobStatus
  statusReason?: string
  probe?: ProbeInfo
  configSnapshot: JobConfigSnapshot
  hasCustomOverride: boolean
  plannedOutputPath: string
  progress?: JobProgressInfo
  result?: JobResultInfo
  engineName: string
  engineVersion: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  retryCount: number
  logs: string[]
}

export interface SkippedImportItem {
  path: string
  reason: string
}

export interface ImportBatchResponse {
  addedJobs: CompressionJob[]
  skippedItems: SkippedImportItem[]
}

export interface UserPreset {
  id: string
  name: string
  description: string
  isBuiltIn: boolean
  baseTier: PresetTier
  config: JobConfigSnapshot
  updatedAt: string
}

export interface AppSettings {
  schemaVersion: number
  theme: 'light' | 'dark' | 'system'
  maxConcurrentImages: number
  maxConcurrentVideos: number
  maxConcurrentPdfs: number
  maxConcurrentArchives: number
  closeBehavior: 'ask' | 'minimize_to_tray' | 'cancel_and_quit'
  maxHistoryItems: number
  defaultConfig: JobConfigSnapshot
  processTimeoutMinutes: number
}

export interface ImagePreviewRequest {
  sourcePath: string
  config: ImageConfig
}

export interface ImagePreviewResponse {
  originalDataUrl: string
  previewDataUrl: string
  originalSizeBytes: number
  estimatedSizeBytes: number
  originalWidth: number
  originalHeight: number
  outputWidth: number
  outputHeight: number
  outputFormat: string
  durationMs: number
}

export interface CapabilityMatrix {
  sharpVersion: string
  libvipsVersion: string
  avifSupported: boolean
  webpSupported: boolean
  ffmpegAvailable: boolean
  ffmpegVersion: string
  ffprobeAvailable: boolean
  h264Encoders: string[]
  hardwareH264Encoders: string[]
  aacEncoders: string[]
  qpdfAvailable: boolean
  qpdfVersion: string
  sevenZipAvailable: boolean
  sevenZipVersion: string
}

export function convertToBytes(value: number, unit: ByteUnit): number {
  const safeVal = Math.max(1, Number(value) || 1)
  switch (unit) {
    case 'KB':
      return Math.round(safeVal * 1000)
    case 'MB':
      return Math.round(safeVal * 1000 * 1000)
    case 'KiB':
      return Math.round(safeVal * 1024)
    case 'MiB':
      return Math.round(safeVal * 1024 * 1024)
  }
}

export function formatBytes(bytes: number, useBinary = false): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const base = useBinary ? 1024 : 1000
  const units = useBinary ? ['B', 'KiB', 'MiB', 'GiB'] : ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(base)))
  const val = bytes / Math.pow(base, i)
  return `${val >= 100 || i === 0 ? val.toFixed(0) : val.toFixed(2)} ${units[i]}`
}

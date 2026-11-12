import {
  AppSettings,
  JobConfigSnapshot,
  PresetTier,
  UserPreset
} from './types'

export function createConfigForTier(
  tier: Exclude<PresetTier, 'custom'>,
  customOutputDir = ''
): JobConfigSnapshot {
  const baseNaming = {
    outputDirMode: customOutputDir ? ('custom_folder' as const) : ('same_folder' as const),
    customOutputDir,
    preserveRelativeStructure: true,
    namingPattern: 'suffix' as const,
    suffix: '_compressed'
  }

  if (tier === 'high_quality') {
    return {
      presetTier: 'high_quality',
      naming: baseNaming,
      image: {
        outputFormat: 'keep',
        quality: 88,
        effort: 6,
        lossless: false,
        pngPalette: false,
        resizeMode: 'none',
        longEdge: 2560,
        maxWidth: 2560,
        maxHeight: 2560,
        scalePercent: 100,
        alphaBackground: '#FFFFFF',
        colorProfilePolicy: 'keep_icc',
        metadataPolicy: 'keep_safe',
        targetSizeEnabled: false,
        targetSizeValue: 500,
        targetSizeUnit: 'KB',
        targetMinQuality: 65,
        targetAllowResize: false,
        targetMinLongEdge: 1280,
        multiSizePresets: []
      },
      video: {
        mode: 'quality',
        crf: 20,
        encoderPreset: 'medium',
        maxResolution: 'keep',
        maxFps: 'keep',
        audioMode: 'auto_copy_or_aac',
        audioBitrateKbps: 192,
        subtitlePolicy: 'mov_text',
        targetSizeValue: 25,
        targetSizeUnit: 'MB',
        targetMinResolution: 720,
        targetMinVideoBitrateKbps: 500,
        useHardwareEncoder: false
      },
      pdf: {
        mode: 'structural_lossless',
        linearize: false,
        objectStreams: 'generate'
      },
      archive: {
        archiveFormat: 'zip',
        compressionPreset: 'fast',
        archiveBaseName: 'Archive_Bundle',
        dictionarySizeMb: 16,
        solidMode: false
      }
    }
  }

  if (tier === 'small_size') {
    return {
      presetTier: 'small_size',
      naming: baseNaming,
      image: {
        outputFormat: 'keep',
        quality: 68,
        effort: 6,
        lossless: false,
        pngPalette: true,
        resizeMode: 'long_edge',
        longEdge: 1920,
        maxWidth: 1920,
        maxHeight: 1920,
        scalePercent: 80,
        alphaBackground: '#FFFFFF',
        colorProfilePolicy: 'convert_srgb',
        metadataPolicy: 'strip_all',
        targetSizeEnabled: false,
        targetSizeValue: 300,
        targetSizeUnit: 'KB',
        targetMinQuality: 45,
        targetAllowResize: true,
        targetMinLongEdge: 800,
        multiSizePresets: []
      },
      video: {
        mode: 'quality',
        crf: 27,
        encoderPreset: 'medium',
        maxResolution: 1080,
        maxFps: 30,
        audioMode: 'aac',
        audioBitrateKbps: 96,
        subtitlePolicy: 'drop',
        targetSizeValue: 15,
        targetSizeUnit: 'MB',
        targetMinResolution: 480,
        targetMinVideoBitrateKbps: 250,
        useHardwareEncoder: false
      },
      pdf: {
        mode: 'recompress_streams',
        linearize: true,
        objectStreams: 'generate'
      },
      archive: {
        archiveFormat: '7z',
        compressionPreset: 'ultra',
        archiveBaseName: 'Archive_Bundle',
        dictionarySizeMb: 32,
        solidMode: true
      }
    }
  }

  // Default: 'balanced'
  return {
    presetTier: 'balanced',
    naming: baseNaming,
    image: {
      outputFormat: 'keep',
      quality: 80,
      effort: 5,
      lossless: false,
      pngPalette: true,
      resizeMode: 'none',
      longEdge: 2048,
      maxWidth: 2048,
      maxHeight: 2048,
      scalePercent: 100,
      alphaBackground: '#FFFFFF',
      colorProfilePolicy: 'keep_icc',
      metadataPolicy: 'strip_all',
      targetSizeEnabled: false,
      targetSizeValue: 500,
      targetSizeUnit: 'KB',
      targetMinQuality: 55,
      targetAllowResize: true,
      targetMinLongEdge: 1024,
      multiSizePresets: []
    },
    video: {
      mode: 'quality',
      crf: 23,
      encoderPreset: 'medium',
      maxResolution: 'keep',
      maxFps: 'keep',
      audioMode: 'auto_copy_or_aac',
      audioBitrateKbps: 128,
      subtitlePolicy: 'mov_text',
      targetSizeValue: 20,
      targetSizeUnit: 'MB',
      targetMinResolution: 720,
      targetMinVideoBitrateKbps: 350,
      useHardwareEncoder: false
    },
    pdf: {
      mode: 'recompress_streams',
      linearize: false,
      objectStreams: 'generate'
    },
    archive: {
      archiveFormat: 'zip',
      compressionPreset: 'balanced',
      archiveBaseName: 'Archive_Bundle',
      dictionarySizeMb: 16,
      solidMode: true
    }
  }
}

export const BUILTIN_PRESETS: UserPreset[] = [
  {
    id: 'builtin-high-quality',
    name: 'Chất lượng cao',
    description: 'Giữ tối đa chi tiết hiển thị, âm thanh và profile màu gốc. Giảm dung lượng an toàn.',
    isBuiltIn: true,
    baseTier: 'high_quality',
    config: createConfigForTier('high_quality'),
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'builtin-balanced',
    name: 'Cân bằng (Mặc định)',
    description: 'Tối ưu tỷ lệ dung lượng/chất lượng cho sử dụng hằng ngày, gửi mail và lưu trữ.',
    isBuiltIn: true,
    baseTier: 'balanced',
    config: createConfigForTier('balanced'),
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'builtin-small-size',
    name: 'Ưu tiên dung lượng',
    description: 'Nén mạnh để giảm tối đa dung lượng file cho đính kèm hoặc web.',
    isBuiltIn: true,
    baseTier: 'small_size',
    config: createConfigForTier('small_size'),
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  theme: 'system',
  maxConcurrentImages: 3,
  maxConcurrentVideos: 1,
  maxConcurrentPdfs: 2,
  maxConcurrentArchives: 1,
  closeBehavior: 'ask',
  maxHistoryItems: 300,
  defaultConfig: createConfigForTier('balanced'),
  processTimeoutMinutes: 30
}

export function cloneConfig(cfg: JobConfigSnapshot): JobConfigSnapshot {
  return JSON.parse(JSON.stringify(cfg))
}

export function sanitizeJobConfig(raw: JobConfigSnapshot): JobConfigSnapshot {
  const c = cloneConfig(raw)
  c.image.quality = Math.max(1, Math.min(100, Math.round(Number(c.image.quality) || 80)))
  c.image.effort = Math.max(0, Math.min(9, Math.round(Number(c.image.effort) || 5)))
  c.image.longEdge = Math.max(64, Math.min(16384, Math.round(Number(c.image.longEdge) || 1920)))
  c.image.maxWidth = Math.max(64, Math.min(16384, Math.round(Number(c.image.maxWidth) || 1920)))
  c.image.maxHeight = Math.max(64, Math.min(16384, Math.round(Number(c.image.maxHeight) || 1080)))
  c.image.scalePercent = Math.max(5, Math.min(100, Math.round(Number(c.image.scalePercent) || 100)))
  c.image.targetSizeValue = Math.max(5, Number(c.image.targetSizeValue) || 500)
  c.image.targetMinQuality = Math.max(10, Math.min(95, Math.round(Number(c.image.targetMinQuality) || 50)))
  c.image.targetMinLongEdge = Math.max(128, Math.min(8192, Math.round(Number(c.image.targetMinLongEdge) || 800)))
  if (!/^#[0-9A-Fa-f]{6}$/.test(c.image.alphaBackground)) {
    c.image.alphaBackground = '#FFFFFF'
  }

  c.video.crf = Math.max(16, Math.min(40, Math.round(Number(c.video.crf) || 23)))
  c.video.targetSizeValue = Math.max(1, Number(c.video.targetSizeValue) || 20)
  c.video.targetMinVideoBitrateKbps = Math.max(100, Math.min(10000, Math.round(Number(c.video.targetMinVideoBitrateKbps) || 300)))

  if (!c.naming.suffix || /[<>:"/\\|?*]/.test(c.naming.suffix)) {
    c.naming.suffix = '_compressed'
  }
  if (!c.archive.archiveBaseName || /[<>:"/\\|?*]/.test(c.archive.archiveBaseName)) {
    c.archive.archiveBaseName = 'Archive_Bundle'
  }

  return c
}


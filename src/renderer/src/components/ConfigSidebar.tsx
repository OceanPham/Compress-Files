import React, { useState } from 'react'
import {
  Archive,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2
} from 'lucide-react'
import {
  ByteUnit,
  CapabilityMatrix,
  CompressionJob,
  JobCategory,
  JobConfigSnapshot,
  MultiSizeSpec,
  PresetTier,
  UserPreset
} from '@shared/types'
import { cloneConfig, createConfigForTier } from '@shared/presets'

interface ConfigSidebarProps {
  activeConfig: JobConfigSnapshot
  selectedJob: CompressionJob | null
  activeTabCategory: JobCategory
  presets: UserPreset[]
  capabilities: CapabilityMatrix | null
  applyScope: 'all_pending' | 'selected_only'
  onChangeApplyScope: (scope: 'all_pending' | 'selected_only') => void
  onUpdateConfig: (nextConfig: JobConfigSnapshot) => void
  onPickOutputFolder: () => Promise<void>
  onSavePreset: (name: string, description: string, id?: string) => Promise<void>
  onDeletePreset: (id: string) => Promise<void>
  onResetPresets: () => Promise<void>
}

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  activeConfig,
  selectedJob,
  activeTabCategory,
  presets,
  capabilities,
  applyScope,
  onChangeApplyScope,
  onUpdateConfig,
  onPickOutputFolder,
  onSavePreset,
  onDeletePreset,
  onResetPresets
}) => {
  const [configTab, setConfigTab] = useState<JobCategory>(
    selectedJob?.category || activeTabCategory
  )
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [showPresetForm, setShowPresetForm] = useState<boolean>(false)
  const [presetNameInput, setPresetNameInput] = useState<string>('')
  const [presetDescInput, setPresetDescInput] = useState<string>('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('builtin-balanced')

  // Keep configTab aligned when selectedJob changes category
  React.useEffect(() => {
    if (selectedJob) {
      setConfigTab(selectedJob.category)
    } else {
      setConfigTab(activeTabCategory)
    }
  }, [selectedJob?.id, selectedJob?.category, activeTabCategory])

  const handleTierSelect = (tier: Exclude<PresetTier, 'custom'>): void => {
    const next = createConfigForTier(tier, activeConfig.naming.customOutputDir)
    next.naming = { ...activeConfig.naming }
    next.archive.archiveBaseName = activeConfig.archive.archiveBaseName
    setSelectedPresetId(`builtin-${tier.replace('_', '-')}`)
    onUpdateConfig(next)
  }

  const handlePresetDropdownChange = (presetId: string): void => {
    setSelectedPresetId(presetId)
    const found = presets.find((p) => p.id === presetId)
    if (found) {
      const next = cloneConfig(found.config)
      // Preserve current output folder choice unless user changed it
      next.naming.outputDirMode = activeConfig.naming.outputDirMode
      next.naming.customOutputDir = activeConfig.naming.customOutputDir
      onUpdateConfig(next)
    }
  }

  const updateImage = (partial: Partial<JobConfigSnapshot['image']>): void => {
    onUpdateConfig({
      ...activeConfig,
      presetTier: 'custom',
      image: { ...activeConfig.image, ...partial }
    })
  }

  const updateVideo = (partial: Partial<JobConfigSnapshot['video']>): void => {
    onUpdateConfig({
      ...activeConfig,
      presetTier: 'custom',
      video: { ...activeConfig.video, ...partial }
    })
  }

  const updatePdf = (partial: Partial<JobConfigSnapshot['pdf']>): void => {
    onUpdateConfig({
      ...activeConfig,
      presetTier: 'custom',
      pdf: { ...activeConfig.pdf, ...partial }
    })
  }

  const updateArchive = (partial: Partial<JobConfigSnapshot['archive']>): void => {
    onUpdateConfig({
      ...activeConfig,
      presetTier: 'custom',
      archive: { ...activeConfig.archive, ...partial }
    })
  }

  const updateNaming = (partial: Partial<JobConfigSnapshot['naming']>): void => {
    onUpdateConfig({
      ...activeConfig,
      naming: { ...activeConfig.naming, ...partial }
    })
  }

  const addMultiSizeItem = (): void => {
    const current = activeConfig.image.multiSizePresets || []
    const nextSpec: MultiSizeSpec = {
      id: `ms_${Date.now()}`,
      label: `Web ${current.length + 1}`,
      longEdge: current.length === 0 ? 1920 : current.length === 1 ? 1080 : 640,
      suffix: current.length === 0 ? '_1920w' : current.length === 1 ? '_1080w' : '_640w',
      enabled: true
    }
    updateImage({ multiSizePresets: [...current, nextSpec] })
  }

  const currentSelectedPreset = presets.find((p) => p.id === selectedPresetId)

  return (
    <aside className="w-[370px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
      {/* Header: Scope selector */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>Bảng Cấu Hình Nén</span>
          </div>
          {selectedJob && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-medium truncate max-w-[165px]">
              Đang chọn: {selectedJob.displayName}
            </span>
          )}
        </div>

        {/* Scope toggle */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onChangeApplyScope('all_pending')}
            className={`py-1.5 px-2 rounded-md font-medium transition ${
              applyScope === 'all_pending'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất cả file chờ xử lý
          </button>
          <button
            type="button"
            disabled={!selectedJob}
            onClick={() => onChangeApplyScope('selected_only')}
            className={`py-1.5 px-2 rounded-md font-medium transition disabled:opacity-40 ${
              applyScope === 'selected_only'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Chỉ file đang chọn
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* 1. Three Popular Presets */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-800 dark:text-slate-200">
              1. Chế độ nén nhanh (Preset)
            </label>
            <button
              type="button"
              onClick={() => setShowPresetForm((v) => !v)}
              className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Lưu preset
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                {
                  tier: 'high_quality',
                  title: 'Chất lượng cao',
                  sub: 'Giữ chi tiết tối đa'
                },
                {
                  tier: 'balanced',
                  title: 'Cân bằng',
                  sub: 'Khuyên dùng'
                },
                {
                  tier: 'small_size',
                  title: 'Ưu tiên nhỏ',
                  sub: 'Giảm mạnh MB'
                }
              ] as const
            ).map((item) => {
              const active = activeConfig.presetTier === item.tier
              return (
                <button
                  key={item.tier}
                  type="button"
                  onClick={() => handleTierSelect(item.tier)}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition ${
                    active
                      ? 'border-sky-600 bg-sky-50/80 dark:bg-sky-950/50 dark:border-sky-500 ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.sub}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Saved preset selector + management */}
          <div className="flex items-center gap-1.5 pt-1">
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetDropdownChange(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs"
              aria-label="Chọn preset đã lưu"
            >
              <optgroup label="Preset chuẩn của hệ thống">
                {presets
                  .filter((p) => p.isBuiltIn)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
              {presets.some((p) => !p.isBuiltIn) && (
                <optgroup label="Preset cá nhân đã lưu">
                  {presets
                    .filter((p) => !p.isBuiltIn)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        ★ {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {currentSelectedPreset && !currentSelectedPreset.isBuiltIn && (
              <>
                <button
                  type="button"
                  title="Nhân bản preset này"
                  onClick={() =>
                    onSavePreset(
                      `${currentSelectedPreset.name} (Bản sao)`,
                      currentSelectedPreset.description
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Xóa preset cá nhân này"
                  onClick={() => onDeletePreset(currentSelectedPreset.id)}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              title="Khôi phục bộ preset về mặc định"
              onClick={onResetPresets}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {showPresetForm && (
            <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30 space-y-2">
              <div className="font-semibold text-sky-900 dark:text-sky-200">
                Lưu thông số hiện tại thành Preset cá nhân
              </div>
              <input
                type="text"
                placeholder="Tên preset (VD: Ảnh sản phẩm Web 500KB)"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
              />
              <input
                type="text"
                placeholder="Mô tả ngắn (không bắt buộc)"
                value={presetDescInput}
                onChange={(e) => setPresetDescInput(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPresetForm(false)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!presetNameInput.trim()) return
                    await onSavePreset(presetNameInput.trim(), presetDescInput.trim())
                    setPresetNameInput('')
                    setPresetDescInput('')
                    setShowPresetForm(false)
                  }}
                  className="px-3 py-1 rounded bg-sky-600 text-white font-semibold hover:bg-sky-700"
                >
                  Lưu mới
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 2. Category Configuration Tabs */}
        <section className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              2. Thông số theo loại file
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'image', label: 'Ảnh', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                { id: 'video', label: 'Video', icon: <Film className="w-3.5 h-3.5" /> },
                { id: 'pdf', label: 'PDF', icon: <FileText className="w-3.5 h-3.5" /> },
                { id: 'archive', label: 'ZIP/7z', icon: <Archive className="w-3.5 h-3.5" /> }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setConfigTab(tab.id)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-md font-medium transition ${
                  configTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ==================== IMAGE SETTINGS ==================== */}
          {configTab === 'image' && (
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Định dạng ảnh đầu ra
                </label>
                <select
                  value={activeConfig.image.outputFormat}
                  onChange={(e) =>
                    updateImage({
                      outputFormat: e.target.value as JobConfigSnapshot['image']['outputFormat']
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                >
                  <option value="keep">Giữ nguyên định dạng gốc</option>
                  <option value="jpeg">Chuyển sang JPEG (.jpg)</option>
                  <option value="png">Chuyển sang PNG (.png)</option>
                  <option value="webp">Chuyển sang WebP (.webp)</option>
                  {(capabilities?.avifSupported ?? true) && (
                    <option value="avif">Chuyển sang AVIF (.avif)</option>
                  )}
                </select>
              </div>

              {/* Target size toggle */}
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Giới hạn dung lượng mục tiêu (Target Size)
                  </span>
                  <input
                    type="checkbox"
                    checked={activeConfig.image.targetSizeEnabled}
                    onChange={(e) => updateImage({ targetSizeEnabled: e.target.checked })}
                    className="rounded accent-sky-600 w-4 h-4"
                  />
                </label>

                {activeConfig.image.targetSizeEnabled && (
                  <div className="mt-2 p-2.5 rounded-md bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">Tối đa:</span>
                      <input
                        type="number"
                        min={5}
                        max={100000}
                        value={activeConfig.image.targetSizeValue}
                        onChange={(e) =>
                          updateImage({ targetSizeValue: Math.max(5, Number(e.target.value) || 100) })
                        }
                        className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-semibold"
                      />
                      <select
                        value={activeConfig.image.targetSizeUnit}
                        onChange={(e) =>
                          updateImage({ targetSizeUnit: e.target.value as ByteUnit })
                        }
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                      >
                        <option value="KB">KB (1000 B)</option>
                        <option value="KiB">KiB (1024 B)</option>
                        <option value="MB">MB (1000² B)</option>
                        <option value="MiB">MiB (1024² B)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Encoder Quality tối thiểu ({activeConfig.image.targetMinQuality}):
                      </span>
                      <input
                        type="range"
                        min={15}
                        max={90}
                        value={activeConfig.image.targetMinQuality}
                        onChange={(e) =>
                          updateImage({ targetMinQuality: Number(e.target.value) })
                        }
                        className="w-28 accent-sky-600"
                      />
                    </div>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-600 dark:text-slate-400">
                        Cho phép giảm chiều rộng/cao nếu chưa đạt:
                      </span>
                      <input
                        type="checkbox"
                        checked={activeConfig.image.targetAllowResize}
                        onChange={(e) =>
                          updateImage({ targetAllowResize: e.target.checked })
                        }
                        className="rounded accent-sky-600"
                      />
                    </label>

                    {activeConfig.image.targetAllowResize && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">
                          Cạnh dài tối thiểu (px):
                        </span>
                        <input
                          type="number"
                          min={256}
                          max={4096}
                          step={64}
                          value={activeConfig.image.targetMinLongEdge}
                          onChange={(e) =>
                            updateImage({
                              targetMinLongEdge: Math.max(256, Number(e.target.value) || 800)
                            })
                          }
                          className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quality & Resize */}
              {!activeConfig.image.lossless && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Tham số Encoder Quality
                    </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {activeConfig.image.quality} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={activeConfig.image.quality}
                    onChange={(e) => updateImage({ quality: Number(e.target.value) })}
                    className="w-full accent-sky-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Lưu ý: Đây là tham số bộ mã hóa, Quality 100 không đồng nghĩa với bảo toàn bit Lossless.
                  </p>
                </div>
              )}

              {/* Resize selector */}
              <div className="space-y-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Thu nhỏ kích thước (Không phóng to / Không cắt ảnh)
                </label>
                <select
                  value={activeConfig.image.resizeMode}
                  onChange={(e) =>
                    updateImage({
                      resizeMode: e.target.value as JobConfigSnapshot['image']['resizeMode']
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                >
                  <option value="none">Giữ nguyên độ phân giải gốc</option>
                  <option value="long_edge">Giới hạn theo cạnh dài nhất (px)</option>
                  <option value="dimensions">Giới hạn Rộng × Cao tối đa (px)</option>
                  <option value="percent">Thu nhỏ theo tỷ lệ phần trăm (%)</option>
                </select>

                {activeConfig.image.resizeMode === 'long_edge' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Cạnh dài tối đa (px):</span>
                    <input
                      type="number"
                      min={128}
                      max={16384}
                      value={activeConfig.image.longEdge}
                      onChange={(e) =>
                        updateImage({ longEdge: Math.max(128, Number(e.target.value) || 1920) })
                      }
                      className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    />
                  </div>
                )}

                {activeConfig.image.resizeMode === 'dimensions' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-slate-500">Rộng tối đa (px)</span>
                      <input
                        type="number"
                        min={128}
                        max={16384}
                        value={activeConfig.image.maxWidth}
                        onChange={(e) =>
                          updateImage({ maxWidth: Math.max(128, Number(e.target.value) || 1920) })
                        }
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-slate-500">Cao tối đa (px)</span>
                      <input
                        type="number"
                        min={128}
                        max={16384}
                        value={activeConfig.image.maxHeight}
                        onChange={(e) =>
                          updateImage({ maxHeight: Math.max(128, Number(e.target.value) || 1080) })
                        }
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                      />
                    </label>
                  </div>
                )}

                {activeConfig.image.resizeMode === 'percent' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      Tỷ lệ kích thước ({activeConfig.image.scalePercent}%):
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={activeConfig.image.scalePercent}
                      onChange={(e) =>
                        updateImage({ scalePercent: Number(e.target.value) })
                      }
                      className="w-32 accent-sky-600"
                    />
                  </div>
                )}
              </div>

              {/* Advanced Image Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 font-medium text-sky-600 dark:text-sky-400"
              >
                <span>Tùy chọn Ảnh nâng cao (Lossless, ICC, Metadata, Đa kích thước)</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-1">
                  {activeConfig.image.outputFormat !== 'jpeg' && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Chế độ nén Lossless (PNG/WebP/AVIF):</span>
                      <input
                        type="checkbox"
                        checked={activeConfig.image.lossless}
                        onChange={(e) => updateImage({ lossless: e.target.checked })}
                        className="rounded accent-sky-600"
                      />
                    </label>
                  )}

                  {(activeConfig.image.outputFormat === 'png' ||
                    activeConfig.image.outputFormat === 'keep') &&
                    !activeConfig.image.lossless && (
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Giảm bảng màu PNG (Quantize 256 màu - Lossy):</span>
                        <input
                          type="checkbox"
                          checked={activeConfig.image.pngPalette}
                          onChange={(e) => updateImage({ pngPalette: e.target.checked })}
                          className="rounded accent-sky-600"
                        />
                      </label>
                    )}

                  <div className="flex items-center justify-between">
                    <span>Mức độ nén / Effort ({activeConfig.image.effort}/9):</span>
                    <input
                      type="range"
                      min={1}
                      max={9}
                      value={activeConfig.image.effort}
                      onChange={(e) => updateImage({ effort: Number(e.target.value) })}
                      className="w-28 accent-sky-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Màu nền khi chuyển ảnh Alpha sang JPEG:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={activeConfig.image.alphaBackground}
                        onChange={(e) => updateImage({ alphaBackground: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="font-mono text-[11px]">
                        {activeConfig.image.alphaBackground}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400">
                      Quản lý không gian màu (ICC Profile):
                    </label>
                    <select
                      value={activeConfig.image.colorProfilePolicy}
                      onChange={(e) =>
                        updateImage({
                          colorProfilePolicy: e.target
                            .value as JobConfigSnapshot['image']['colorProfilePolicy']
                        })
                      }
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value="keep_icc">Giữ nguyên ICC Profile gốc</option>
                      <option value="convert_srgb">Chuyển chuẩn hóa về sRGB (chuẩn Web)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400">
                      Chính sách Metadata (EXIF / GPS):
                    </label>
                    <select
                      value={activeConfig.image.metadataPolicy}
                      onChange={(e) =>
                        updateImage({
                          metadataPolicy: e.target
                            .value as JobConfigSnapshot['image']['metadataPolicy']
                        })
                      }
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value="strip_all">Xóa EXIF/GPS phụ để giảm dung lượng</option>
                      <option value="keep_safe">Giữ EXIF cơ bản (đã chuẩn hóa Orientation)</option>
                      <option value="keep_all">Giữ toàn bộ Metadata</option>
                    </select>
                  </div>

                  {/* Multi-size export */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Xuất nhiều kích thước cùng lúc:</span>
                      <button
                        type="button"
                        onClick={addMultiSizeItem}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Thêm cỡ
                      </button>
                    </div>
                    {(activeConfig.image.multiSizePresets || []).map((ms, idx) => (
                      <div key={ms.id} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={ms.enabled}
                          onChange={(e) => {
                            const next = [...activeConfig.image.multiSizePresets]
                            next[idx] = { ...ms, enabled: e.target.checked }
                            updateImage({ multiSizePresets: next })
                          }}
                          className="rounded accent-sky-600"
                        />
                        <input
                          type="number"
                          min={64}
                          max={8192}
                          value={ms.longEdge}
                          onChange={(e) => {
                            const edge = Math.max(64, Number(e.target.value) || 1080)
                            const next = [...activeConfig.image.multiSizePresets]
                            next[idx] = {
                              ...ms,
                              longEdge: edge,
                              suffix: `_${edge}w`,
                              label: `${edge}px`
                            }
                            updateImage({ multiSizePresets: next })
                          }}
                          className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5"
                        />
                        <span className="text-slate-500">px ({ms.suffix})</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = activeConfig.image.multiSizePresets.filter(
                              (item) => item.id !== ms.id
                            )
                            updateImage({ multiSizePresets: next })
                          }}
                          className="ml-auto text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== VIDEO SETTINGS ==================== */}
          {configTab === 'video' && (
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="p-2 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-900 dark:text-sky-200">
                Đầu ra chuẩn: <strong>MP4 (H.264 + AAC/Copy)</strong> tương thích mọi thiết bị. Tự động giữ đúng khung hình dọc/ngang và thời lượng gốc.
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Chế độ kiểm soát dung lượng Video
                </label>
                <select
                  value={activeConfig.video.mode}
                  onChange={(e) =>
                    updateVideo({
                      mode: e.target.value as JobConfigSnapshot['video']['mode']
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                >
                  <option value="quality">Theo mức chất lượng hình ảnh (CRF chuẩn)</option>
                  <option value="target_size">Theo dung lượng mục tiêu cố định (2-Pass MB/MiB)</option>
                </select>
              </div>

              {activeConfig.video.mode === 'quality' ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Hệ số nén CRF (Nhỏ = Nét hơn)</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      CRF {activeConfig.video.crf}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={34}
                    value={activeConfig.video.crf}
                    onChange={(e) => updateVideo({ crf: Number(e.target.value) })}
                    className="w-full accent-sky-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>18 (Rất nét)</span>
                    <span>23 (Cân bằng)</span>
                    <span>28+ (Siêu nhẹ)</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Dung lượng tối đa:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={4096}
                        value={activeConfig.video.targetSizeValue}
                        onChange={(e) =>
                          updateVideo({
                            targetSizeValue: Math.max(1, Number(e.target.value) || 20)
                          })
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-semibold"
                      />
                      <select
                        value={activeConfig.video.targetSizeUnit}
                        onChange={(e) =>
                          updateVideo({ targetSizeUnit: e.target.value as ByteUnit })
                        }
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                      >
                        <option value="MB">MB (1000² B)</option>
                        <option value="MiB">MiB (1024² B)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Độ phân giải sàn tối thiểu:
                    </span>
                    <select
                      value={activeConfig.video.targetMinResolution}
                      onChange={(e) =>
                        updateVideo({
                          targetMinResolution: Number(
                            e.target.value
                          ) as JobConfigSnapshot['video']['targetMinResolution']
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value={1080}>Không hạ dưới 1080p</option>
                      <option value={720}>Cho phép hạ xuống 720p</option>
                      <option value={480}>Cho phép hạ xuống 480p</option>
                      <option value={360}>Cho phép hạ xuống 360p</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400">Độ phân giải tối đa</label>
                  <select
                    value={String(activeConfig.video.maxResolution)}
                    onChange={(e) =>
                      updateVideo({
                        maxResolution:
                          e.target.value === 'keep'
                            ? 'keep'
                            : (Number(e.target.value) as JobConfigSnapshot['video']['maxResolution'])
                      })
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
                  >
                    <option value="keep">Giữ nguyên gốc</option>
                    <option value="2160">Tối đa 4K (2160p)</option>
                    <option value="1440">Tối đa 2K (1440p)</option>
                    <option value="1080">Tối đa Full HD (1080p)</option>
                    <option value="720">Tối đa HD (720p)</option>
                    <option value="480">Tối đa SD (480p)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400">Tốc độ khung hình</label>
                  <select
                    value={String(activeConfig.video.maxFps)}
                    onChange={(e) =>
                      updateVideo({
                        maxFps:
                          e.target.value === 'keep'
                            ? 'keep'
                            : (Number(e.target.value) as JobConfigSnapshot['video']['maxFps'])
                      })
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
                  >
                    <option value="keep">Giữ nguyên Timing/VFR gốc</option>
                    <option value="60">Giới hạn tối đa 60 fps</option>
                    <option value="30">Giới hạn tối đa 30 fps</option>
                    <option value="24">Giới hạn tối đa 24 fps</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">Chế độ Âm thanh (Audio)</label>
                <select
                  value={activeConfig.video.audioMode}
                  onChange={(e) =>
                    updateVideo({
                      audioMode: e.target.value as JobConfigSnapshot['video']['audioMode']
                    })
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
                >
                  <option value="auto_copy_or_aac">
                    Tự động (Copy nguyên gốc nếu tương thích, hoặc AAC)
                  </option>
                  <option value="aac">Mã hóa lại AAC ({activeConfig.video.audioBitrateKbps} kbps)</option>
                  <option value="none">Loại bỏ âm thanh (Tắt tiếng)</option>
                </select>
              </div>

              {/* If selectedJob is a video with multiple audio/subtitle tracks, allow explicit track picking */}
              {selectedJob?.probe?.kind === 'video' &&
                selectedJob.probe.audioTracks.length > 1 && (
                  <div className="space-y-1">
                    <label className="font-medium text-sky-700 dark:text-sky-300">
                      Chọn luồng âm thanh của video đang chọn:
                    </label>
                    <select
                      value={
                        activeConfig.video.selectedAudioStreamIndex ??
                        selectedJob.probe.audioTracks[0].streamIndex
                      }
                      onChange={(e) =>
                        updateVideo({ selectedAudioStreamIndex: Number(e.target.value) })
                      }
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      {selectedJob.probe.audioTracks.map((t, idx) => (
                        <option key={t.streamIndex} value={t.streamIndex}>
                          Track #{idx + 1} ({t.codec.toUpperCase()}, {t.channels}ch
                          {t.language ? `, ${t.language}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 font-medium text-sky-600 dark:text-sky-400"
              >
                <span>Tùy chọn Video nâng cao (Preset, Phụ đề, GPU)</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span>Tốc độ mã hóa (Encoder Preset):</span>
                    <select
                      value={activeConfig.video.encoderPreset}
                      onChange={(e) =>
                        updateVideo({
                          encoderPreset: e.target
                            .value as JobConfigSnapshot['video']['encoderPreset']
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value="faster">Nhanh (Faster)</option>
                      <option value="fast">Khá nhanh (Fast)</option>
                      <option value="medium">Cân bằng (Medium)</option>
                      <option value="slow">Nén kỹ (Slow)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Bitrate âm thanh AAC:</span>
                    <select
                      value={activeConfig.video.audioBitrateKbps}
                      onChange={(e) =>
                        updateVideo({
                          audioBitrateKbps: Number(
                            e.target.value
                          ) as JobConfigSnapshot['video']['audioBitrateKbps']
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value={192}>192 kbps (Cao)</option>
                      <option value={128}>128 kbps (Chuẩn)</option>
                      <option value={96}>96 kbps (Tiết kiệm)</option>
                      <option value={64}>64 kbps (Thoại)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Xử lý phụ đề (Subtitle):</span>
                    <select
                      value={activeConfig.video.subtitlePolicy}
                      onChange={(e) =>
                        updateVideo({
                          subtitlePolicy: e.target
                            .value as JobConfigSnapshot['video']['subtitlePolicy']
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value="mov_text">Giữ phụ đề text tương thích (mov_text)</option>
                      <option value="drop">Loại bỏ phụ đề</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer pt-1">
                    <span>Thử tăng tốc phần cứng GPU (tự động lùi về CPU nếu lỗi):</span>
                    <input
                      type="checkbox"
                      checked={activeConfig.video.useHardwareEncoder}
                      onChange={(e) =>
                        updateVideo({ useHardwareEncoder: e.target.checked })
                      }
                      className="rounded accent-sky-600"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ==================== PDF SETTINGS ==================== */}
          {configTab === 'pdf' && (
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold">Cam kết trung thực về tối ưu PDF (QPDF):</p>
                <p>
                  Chế độ này tối ưu cấu trúc bảng tham chiếu, gộp Object Streams và nén lại luồng dữ liệu Flate <strong>không làm giảm độ nét chữ/ảnh</strong>. Với các file PDF scan đã nén JPEG chặt từ trước, dung lượng có thể giảm ít hoặc báo &ldquo;Đã tối ưu sẵn&rdquo;.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Mức độ tối ưu cấu trúc PDF
                </label>
                <select
                  value={activeConfig.pdf.mode}
                  onChange={(e) =>
                    updatePdf({ mode: e.target.value as JobConfigSnapshot['pdf']['mode'] })
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                >
                  <option value="recompress_streams">
                    Nén lại luồng Flate mức 9 + Gộp Object Streams (Khuyên dùng)
                  </option>
                  <option value="structural_lossless">
                    Chỉ dọn dẹp cấu trúc & tạo Object Streams nhanh
                  </option>
                </select>
              </div>

              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span>Tối ưu mở nhanh trên trình duyệt (Linearize PDF):</span>
                <input
                  type="checkbox"
                  checked={activeConfig.pdf.linearize}
                  onChange={(e) => updatePdf({ linearize: e.target.checked })}
                  className="rounded accent-sky-600"
                />
              </label>
            </div>
          )}

          {/* ==================== ARCHIVE (ZIP/7z) SETTINGS ==================== */}
          {configTab === 'archive' && (
            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Định dạng Archive
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['zip', '7z'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => updateArchive({ archiveFormat: fmt })}
                      className={`py-2 px-3 rounded-lg border font-semibold uppercase transition ${
                        activeConfig.archive.archiveFormat === fmt
                          ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Tên file Archive đầu ra (không kèm đuôi)
                </label>
                <input
                  type="text"
                  value={activeConfig.archive.archiveBaseName}
                  onChange={(e) => updateArchive({ archiveBaseName: e.target.value })}
                  placeholder="Archive_Bundle"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Mức độ nén Archive
                </label>
                <select
                  value={activeConfig.archive.compressionPreset}
                  onChange={(e) =>
                    updateArchive({
                      compressionPreset: e.target
                        .value as JobConfigSnapshot['archive']['compressionPreset']
                    })
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
                >
                  <option value="fast">Nhanh (Fast - Ít tốn CPU)</option>
                  <option value="balanced">Cân bằng (Balanced - Mặc định)</option>
                  <option value="ultra">Nén cao (Ultra - Giảm dung lượng tối đa)</option>
                </select>
              </div>

              {activeConfig.archive.archiveFormat === '7z' && (
                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span>Bộ nhớ từ điển LZMA2 (Giới hạn RAM an toàn):</span>
                    <select
                      value={activeConfig.archive.dictionarySizeMb}
                      onChange={(e) =>
                        updateArchive({
                          dictionarySizeMb: Number(
                            e.target.value
                          ) as JobConfigSnapshot['archive']['dictionarySizeMb']
                        })
                      }
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                    >
                      <option value={16}>16 MB (Tiết kiệm RAM)</option>
                      <option value={32}>32 MB (Cân bằng)</option>
                      <option value={64}>64 MB (Nén sâu)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Chế độ nén khối Solid (Tốt cho nhiều file nhỏ):</span>
                    <input
                      type="checkbox"
                      checked={activeConfig.archive.solidMode}
                      onChange={(e) => updateArchive({ solidMode: e.target.checked })}
                      className="rounded accent-sky-600"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. Output Directory & Naming Rules */}
        <section className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            3. Thư mục xuất & Quy tắc đặt tên
          </div>

          <div className="space-y-1.5">
            <select
              value={activeConfig.naming.outputDirMode}
              onChange={(e) =>
                updateNaming({
                  outputDirMode: e.target.value as JobConfigSnapshot['naming']['outputDirMode']
                })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
            >
              <option value="same_folder">Xuất cùng thư mục với file gốc</option>
              <option value="custom_folder">Xuất vào một thư mục chỉ định riêng</option>
            </select>

            {activeConfig.naming.outputDirMode === 'custom_folder' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={activeConfig.naming.customOutputDir || 'Chưa chọn thư mục...'}
                  className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] truncate"
                />
                <button
                  type="button"
                  onClick={onPickOutputFolder}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 text-white font-medium hover:bg-sky-700 shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Chọn...
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400">Quy tắc tên file</label>
              <select
                value={activeConfig.naming.namingPattern}
                onChange={(e) =>
                  updateNaming({
                    namingPattern: e.target.value as JobConfigSnapshot['naming']['namingPattern']
                  })
                }
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
              >
                <option value="suffix">Tên gốc + Hậu tố</option>
                <option value="size_tag">Tên gốc + Hậu tố + Preset</option>
                <option value="sequence">Tên gốc + Số thứ tự</option>
                <option value="original">Giữ tên gốc (Tự thêm số nếu trùng)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400">Hậu tố (Suffix)</label>
              <input
                type="text"
                value={activeConfig.naming.suffix}
                onChange={(e) => updateNaming({ suffix: e.target.value })}
                placeholder="_compressed"
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
              />
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer pt-0.5">
            <span className="text-slate-600 dark:text-slate-400">
              Giữ cấu trúc thư mục con tương đối khi quét thư mục:
            </span>
            <input
              type="checkbox"
              checked={activeConfig.naming.preserveRelativeStructure}
              onChange={(e) =>
                updateNaming({ preserveRelativeStructure: e.target.checked })
              }
              className="rounded accent-sky-600"
            />
          </label>

          {/* Output Path Preview Box */}
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>Xem trước đường dẫn kết quả (Không ghi đè file gốc)</span>
            </div>
            <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
              {selectedJob?.plannedOutputPath ||
                `...\\ten_file_goc${activeConfig.naming.suffix || '_compressed'}.ext`}
            </div>
          </div>
        </section>
      </div>
    </aside>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import {
  Check,
  Columns,
  Eye,
  Loader2,
  Maximize2,
  Search,
  X
} from 'lucide-react'
import {
  CompressionJob,
  formatBytes,
  ImageConfig,
  ImagePreviewResponse
} from '@shared/types'

interface ImagePreviewModalProps {
  job: CompressionJob
  avifSupported: boolean
  onClose: () => void
  onApplyConfigToJob: (jobId: string, updatedImageConfig: ImageConfig) => void
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  job,
  avifSupported,
  onClose,
  onApplyConfigToJob
}) => {
  const [localConfig, setLocalConfig] = useState<ImageConfig>(() => ({
    ...job.configSnapshot.image
  }))
  const [previewData, setPreviewData] = useState<ImagePreviewResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomMode, setZoomMode] = useState<'100%' | 'fit'>('100%')
  const [viewMode, setViewMode] = useState<'split' | 'after' | 'before'>('split')

  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)

  // Debounced preview calculation (280ms)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const res = await window.compressorApi.previewImage({
          sourcePath: job.primarySourcePath,
          config: localConfig
        })
        if (active) {
          setPreviewData(res)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          const msg = (err as Error).message || 'Lỗi tạo xem trước'
          if (!msg.includes('Đã hủy')) {
            setError(msg)
          }
          setLoading(false)
        }
      }
    }, 280)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [job.primarySourcePath, localConfig])

  const handleLeftScroll = (): void => {
    if (syncingScroll.current || !leftScrollRef.current || !rightScrollRef.current) return
    syncingScroll.current = true
    rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop
    rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft
    requestAnimationFrame(() => {
      syncingScroll.current = false
    })
  }

  const handleRightScroll = (): void => {
    if (syncingScroll.current || !leftScrollRef.current || !rightScrollRef.current) return
    syncingScroll.current = true
    leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop
    leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft
    requestAnimationFrame(() => {
      syncingScroll.current = false
    })
  }

  const savedBytes = previewData
    ? previewData.originalSizeBytes - previewData.estimatedSizeBytes
    : 0
  const savedPct =
    previewData && previewData.originalSizeBytes > 0
      ? Number(((savedBytes / previewData.originalSizeBytes) * 100).toFixed(1))
      : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước và so sánh ảnh"
    >
      <div className="flex flex-col w-full max-w-6xl h-[88vh] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              Xem trước & So sánh Trước / Sau: {job.displayName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sử dụng cùng pipeline xử lý Sharp thực tế (EXIF orientation, ICC/sRGB, encoder) với đầu ra thật.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setZoomMode('100%')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  zoomMode === '100%'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Zoom 100% (Điểm ảnh thật)
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  zoomMode === 'fit'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Vừa khung nhìn
              </button>
            </div>

            {/* View mode toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'split'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                Song song
              </button>
              <button
                type="button"
                onClick={() => setViewMode('before')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'before'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Chỉ ảnh gốc
              </button>
              <button
                type="button"
                onClick={() => setViewMode('after')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'after'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Chỉ kết quả
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick tuning toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Định dạng:</span>
              <select
                value={localConfig.outputFormat}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    outputFormat: e.target.value as ImageConfig['outputFormat']
                  }))
                }
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
              >
                <option value="keep">Giữ nguyên định dạng</option>
                <option value="jpeg">JPEG (.jpg)</option>
                <option value="png">PNG (.png)</option>
                <option value="webp">WebP (.webp)</option>
                {avifSupported && <option value="avif">AVIF (.avif)</option>}
              </select>
            </label>

            {!localConfig.lossless && (
              <label className="flex items-center gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Tham số Quality ({localConfig.quality}):
                </span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={localConfig.quality}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      quality: Number(e.target.value)
                    }))
                  }
                  className="w-28 accent-sky-600"
                />
              </label>
            )}

            <label className="flex items-center gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Resize:</span>
              <select
                value={localConfig.resizeMode}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    resizeMode: e.target.value as ImageConfig['resizeMode']
                  }))
                }
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
              >
                <option value="none">Giữ kích thước gốc</option>
                <option value="long_edge">Giới hạn cạnh dài</option>
                <option value="percent">Theo phần trăm (%)</option>
              </select>
            </label>

            {localConfig.resizeMode === 'long_edge' && (
              <input
                type="number"
                min={128}
                max={8192}
                step={64}
                value={localConfig.longEdge}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    longEdge: Math.max(128, Number(e.target.value) || 1920)
                  }))
                }
                className="w-20 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
              />
            )}

            {localConfig.resizeMode === 'percent' && (
              <input
                type="number"
                min={10}
                max={100}
                value={localConfig.scalePercent}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    scalePercent: Math.max(10, Math.min(100, Number(e.target.value) || 80))
                  }))
                }
                className="w-16 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
              />
            )}
          </div>

          {/* Live stats */}
          <div className="flex items-center gap-3">
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tính toán kết quả thật...
              </span>
            )}
            {previewData && !loading && (
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">
                  Gốc: <strong>{formatBytes(previewData.originalSizeBytes)}</strong> ({previewData.originalWidth}×{previewData.originalHeight})
                </span>
                <span>→</span>
                <span className="text-slate-900 dark:text-slate-100">
                  Sau nén ({previewData.outputFormat}): <strong>{formatBytes(previewData.estimatedSizeBytes)}</strong> ({previewData.outputWidth}×{previewData.outputHeight})
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    savedBytes > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {savedBytes > 0
                    ? `Giảm ${formatBytes(savedBytes)} (-${savedPct}%)`
                    : `Tăng +${formatBytes(Math.abs(savedBytes))}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Image Viewport */}
        <div className="flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-950 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-full p-6 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          ) : !previewData ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
              <span className="text-sm">Đang kết xuất bản xem trước...</span>
            </div>
          ) : viewMode === 'split' ? (
            <div className="grid grid-cols-2 h-full divide-x divide-slate-300 dark:divide-slate-800">
              {/* Left: Original */}
              <div className="flex flex-col h-full min-h-0">
                <div className="px-3 py-1.5 bg-slate-200/70 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>TRƯỚC (Ảnh gốc)</span>
                  <span>{formatBytes(previewData.originalSizeBytes)}</span>
                </div>
                <div
                  ref={leftScrollRef}
                  onScroll={handleLeftScroll}
                  className="flex-1 overflow-auto p-4 flex items-start justify-start"
                >
                  <img
                    src={previewData.originalDataUrl}
                    alt="Ảnh gốc"
                    className={
                      zoomMode === '100%'
                        ? 'max-w-none max-h-none select-none shadow-sm'
                        : 'max-w-full max-h-full object-contain m-auto select-none shadow-sm'
                    }
                  />
                </div>
              </div>

              {/* Right: Compressed */}
              <div className="flex flex-col h-full min-h-0">
                <div className="px-3 py-1.5 bg-sky-100/70 dark:bg-sky-950/60 text-xs font-semibold text-sky-900 dark:text-sky-200 flex justify-between">
                  <span>SAU NÉN ({previewData.outputFormat})</span>
                  <span>
                    {formatBytes(previewData.estimatedSizeBytes)} ({previewData.durationMs} ms)
                  </span>
                </div>
                <div
                  ref={rightScrollRef}
                  onScroll={handleRightScroll}
                  className="flex-1 overflow-auto p-4 flex items-start justify-start"
                >
                  <img
                    src={previewData.previewDataUrl}
                    alt="Ảnh sau khi nén"
                    className={
                      zoomMode === '100%'
                        ? 'max-w-none max-h-none select-none shadow-sm'
                        : 'max-w-full max-h-full object-contain m-auto select-none shadow-sm'
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="px-4 py-1.5 bg-slate-200/70 dark:bg-slate-900 text-xs font-semibold flex justify-between">
                <span>
                  {viewMode === 'before'
                    ? 'ĐANG XEM: ẢNH GỐC'
                    : `ĐANG XEM: KẾT QUẢ SAU NÉN (${previewData.outputFormat})`}
                </span>
                <span>
                  {viewMode === 'before'
                    ? formatBytes(previewData.originalSizeBytes)
                    : formatBytes(previewData.estimatedSizeBytes)}
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-start justify-start">
                <img
                  src={
                    viewMode === 'before'
                      ? previewData.originalDataUrl
                      : previewData.previewDataUrl
                  }
                  alt="Xem trước"
                  className={
                    zoomMode === '100%'
                      ? 'max-w-none max-h-none select-none shadow-sm'
                      : 'max-w-full max-h-full object-contain m-auto select-none shadow-sm'
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Eye className="w-4 h-4 text-sky-600" />
            <span>
              Mẹo: Ở chế độ <strong>Zoom 100%</strong>, cuộn khung bên trái sẽ tự động đồng bộ vị trí với khung bên phải để soi chi tiết chữ nhỏ.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyConfigToJob(job.id, localConfig)
                onClose()
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
            >
              <Check className="w-4 h-4" />
              Áp dụng thông số này cho file đang chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

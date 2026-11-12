import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Eye,
  FileArchive,
  FilePlus2,
  FileText,
  Film,
  FolderOpen,
  FolderPlus,
  HardDrive,
  History,
  Image as ImageIcon,
  Layers,
  Monitor,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  X,
  XCircle
} from 'lucide-react'
import {
  AppSettings,
  CapabilityMatrix,
  CompressionJob,
  formatBytes,
  ImageConfig,
  JobCategory,
  JobConfigSnapshot,
  SkippedImportItem,
  UserPreset
} from '@shared/types'
import { cloneConfig, DEFAULT_APP_SETTINGS } from '@shared/presets'
import { VI_STRINGS } from './i18n/vi'
import { StatusBadge } from './components/StatusBadge'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { ConfigSidebar } from './components/ConfigSidebar'

type NavTab = 'media' | 'archive' | 'history' | 'settings'

export const App: React.FC = () => {
  const [navTab, setNavTab] = useState<NavTab>('media')
  const [appVersion, setAppVersion] = useState<string>('1.0.0')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [presets, setPresets] = useState<UserPreset[]>([])
  const [capabilities, setCapabilities] = useState<CapabilityMatrix | null>(null)

  const [jobs, setJobs] = useState<CompressionJob[]>([])
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [history, setHistory] = useState<CompressionJob[]>([])

  const [globalConfig, setGlobalConfig] = useState<JobConfigSnapshot>(
    DEFAULT_APP_SETTINGS.defaultConfig
  )
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [applyScope, setApplyScope] = useState<'all_pending' | 'selected_only'>('all_pending')

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | JobCategory>('all')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'running' | 'done' | 'attention'
  >('all')

  const [skippedNotice, setSkippedNotice] = useState<SkippedImportItem[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [previewJob, setPreviewJob] = useState<CompressionJob | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)

  // Staging list for Archive Builder tab
  const [archiveStagingPaths, setArchiveStagingPaths] = useState<string[]>([])

  const showToast = (msg: string): void => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  // Initial load & IPC listener
  useEffect(() => {
    void window.compressorApi.getInitData().then((data) => {
      setAppVersion(data.appVersion)
      setSettings(data.settings)
      setGlobalConfig(cloneConfig(data.settings.defaultConfig))
      setPresets(data.presets)
      setJobs(data.queueState.jobs)
      setIsRunning(data.queueState.isRunning)
      setIsPaused(data.queueState.isPaused)
      setHistory(data.history)
      setCapabilities(data.capabilities)
    })

    const unsubscribe = window.compressorApi.onQueueStateChanged((state) => {
      setJobs(state.jobs)
      setIsRunning(state.isRunning)
      setIsPaused(state.isPaused)
      // Refresh history when queue updates
      void window.compressorApi.getHistory().then(setHistory)
    })

    return () => unsubscribe()
  }, [])

  // Theme application (Light / Dark / System)
  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (): void => {
      const isDark =
        settings.theme === 'dark' || (settings.theme === 'system' && mediaQuery.matches)
      root.classList.toggle('dark', isDark)
    }

    applyTheme()
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [settings.theme])

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  )

  const activeConfigForSidebar = useMemo(() => {
    if (applyScope === 'selected_only' && selectedJob) {
      return selectedJob.configSnapshot
    }
    return globalConfig
  }, [applyScope, selectedJob, globalConfig])

  const handleUpdateConfig = async (nextConfig: JobConfigSnapshot): Promise<void> => {
    if (applyScope === 'selected_only' && selectedJob) {
      const state = await window.compressorApi.updateQueueConfig([selectedJob.id], nextConfig)
      setJobs(state.jobs)
    } else {
      setGlobalConfig(nextConfig)
      await window.compressorApi.updateSettings({ defaultConfig: nextConfig })
      const state = await window.compressorApi.updateQueueConfig('all_pending', nextConfig)
      setJobs(state.jobs)
    }
  }

  const handleApplyPreviewConfigToJob = async (
    jobId: string,
    updatedImageCfg: ImageConfig
  ): Promise<void> => {
    const target = jobs.find((j) => j.id === jobId)
    if (!target) return
    const nextSnapshot: JobConfigSnapshot = {
      ...target.configSnapshot,
      presetTier: 'custom',
      image: updatedImageCfg
    }
    const state = await window.compressorApi.updateQueueConfig([jobId], nextSnapshot)
    setJobs(state.jobs)
    showToast(`Đã áp dụng thông số xem trước cho "${target.displayName}"`)
  }

  const handleImportMediaPaths = async (paths: string[]): Promise<void> => {
    if (!paths || paths.length === 0) return
    const res = await window.compressorApi.importMedia(paths, globalConfig)
    if (res.skippedItems.length > 0) {
      setSkippedNotice(res.skippedItems)
    }
    if (res.addedJobs.length > 0) {
      setSelectedJobId(res.addedJobs[0].id)
      showToast(`Đã thêm ${res.addedJobs.length} mục vào hàng đợi`)
    }
  }

  const handlePickMediaFiles = async (): Promise<void> => {
    const paths = await window.compressorApi.pickFiles('media')
    await handleImportMediaPaths(paths)
  }

  const handlePickMediaFolders = async (): Promise<void> => {
    const paths = await window.compressorApi.pickFolders()
    await handleImportMediaPaths(paths)
  }

  const handlePickArchiveFiles = async (): Promise<void> => {
    const paths = await window.compressorApi.pickFiles('any')
    if (paths.length > 0) {
      setArchiveStagingPaths((prev) => Array.from(new Set([...prev, ...paths])))
    }
  }

  const handlePickArchiveFolders = async (): Promise<void> => {
    const paths = await window.compressorApi.pickFolders()
    if (paths.length > 0) {
      setArchiveStagingPaths((prev) => Array.from(new Set([...prev, ...paths])))
    }
  }

  const handleCreateArchiveJobFromStaging = async (autoStart: boolean): Promise<void> => {
    if (archiveStagingPaths.length === 0) return
    const res = await window.compressorApi.createArchiveJob(archiveStagingPaths, globalConfig)
    if (res.skippedItems.length > 0) {
      setSkippedNotice(res.skippedItems)
    }
    if (res.addedJobs.length > 0) {
      setArchiveStagingPaths([])
      setSelectedJobId(res.addedJobs[0].id)
      if (autoStart) {
        await window.compressorApi.startQueue()
      } else {
        showToast('Đã tạo tác vụ đóng gói Archive trong hàng đợi.')
      }
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files)
    const paths = files
      .map((f) => window.compressorApi.getPathForDroppedFile(f))
      .filter((p) => p.length > 0)

    if (paths.length === 0) return
    if (navTab === 'archive') {
      setArchiveStagingPaths((prev) => Array.from(new Set([...prev, ...paths])))
      showToast(`Đã thêm ${paths.length} mục vào danh sách chuẩn bị tạo Archive`)
    } else {
      if (navTab !== 'media') setNavTab('media')
      await handleImportMediaPaths(paths)
    }
  }

  // Filtered jobs for display
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (navTab === 'archive' && job.category !== 'archive') return false
      if (categoryFilter !== 'all' && job.category !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (
          !job.displayName.toLowerCase().includes(q) &&
          !job.primarySourcePath.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (statusFilter === 'pending' && !['queued', 'probing'].includes(job.status)) {
        return false
      }
      if (statusFilter === 'running' && !['running', 'validating'].includes(job.status)) {
        return false
      }
      if (
        statusFilter === 'done' &&
        !['completed', 'no_savings', 'converted_not_smaller'].includes(job.status)
      ) {
        return false
      }
      if (
        statusFilter === 'attention' &&
        !['failed', 'target_unmet', 'unsupported', 'interrupted', 'cancelled'].includes(
          job.status
        )
      ) {
        return false
      }
      return true
    })
  }, [jobs, navTab, categoryFilter, searchQuery, statusFilter])

  // Queue statistics & weighted batch progress
  const queueStats = useMemo(() => {
    const totalCount = jobs.length
    const queuedCount = jobs.filter((j) => j.status === 'queued').length
    const runningCount = jobs.filter((j) =>
      ['probing', 'running', 'validating'].includes(j.status)
    ).length
    const finishedSuccessJobs = jobs.filter((j) =>
      ['completed', 'no_savings', 'converted_not_smaller'].includes(j.status)
    )
    const attentionCount = jobs.filter((j) =>
      ['failed', 'target_unmet', 'unsupported', 'interrupted'].includes(j.status)
    ).length

    let totalInputCompleted = 0
    let totalOutputCompleted = 0
    for (const j of finishedSuccessJobs) {
      if (j.result) {
        totalInputCompleted += j.inputSizeBytes
        totalOutputCompleted += j.result.outputSizeBytes
      }
    }
    const totalSavedBytes = totalInputCompleted - totalOutputCompleted
    const totalSavedPct =
      totalInputCompleted > 0
        ? Number(((totalSavedBytes / totalInputCompleted) * 100).toFixed(1))
        : 0

    // Byte-weighted progress for active batch
    const actionableJobs = jobs.filter((j) => j.status !== 'unsupported')
    let weightedDone = 0
    let weightedTotal = 0
    for (const j of actionableJobs) {
      const weight = Math.max(1024, j.inputSizeBytes)
      weightedTotal += weight
      if (
        [
          'completed',
          'no_savings',
          'converted_not_smaller',
          'target_unmet',
          'failed',
          'cancelled'
        ].includes(j.status)
      ) {
        weightedDone += weight
      } else if (j.status === 'running' || j.status === 'validating') {
        const pct = j.progress?.percent ?? 50
        weightedDone += weight * (pct / 100)
      }
    }

    const overallPercent =
      weightedTotal > 0 ? Math.min(100, Math.round((weightedDone / weightedTotal) * 100)) : 0

    return {
      totalCount,
      queuedCount,
      runningCount,
      doneCount: finishedSuccessJobs.length,
      attentionCount,
      totalInputCompleted,
      totalOutputCompleted,
      totalSavedBytes,
      totalSavedPct,
      overallPercent
    }
  }, [jobs])

  const renderProbeSummary = (job: CompressionJob): string => {
    const p = job.probe
    if (!p) return 'Đang phân tích cấu trúc...'
    if (p.kind === 'image') {
      const alphaStr = p.hasAlpha ? 'Alpha' : 'Opaque'
      const iccStr = p.hasIccProfile ? `ICC (${p.space})` : p.space.toUpperCase()
      const orientStr = p.orientation > 1 ? ` • EXIF #${p.orientation}` : ''
      return `${p.format.toUpperCase()} • ${p.width}×${p.height} • ${alphaStr} • ${iccStr}${orientStr}`
    }
    if (p.kind === 'video') {
      const mins = Math.floor(p.durationSec / 60)
      const secs = Math.round(p.durationSec % 60)
      const durStr = `${mins}:${String(secs).padStart(2, '0')}`
      const audioStr =
        p.audioTracks.length > 0
          ? `${p.audioTracks[0].codec.toUpperCase()} (${p.audioTracks.length} track)`
          : 'Không âm thanh'
      const rotStr = p.rotation ? ` • Xoay ${p.rotation}°` : ''
      return `${p.container.toUpperCase()} (${p.videoCodec.toUpperCase()}) • ${p.width}×${p.height} • ${p.fps}fps${ p.isVfr ? ' VFR' : '' } • ${durStr} • ${audioStr}${rotStr}`
    }
    if (p.kind === 'pdf') {
      return `PDF v${p.pdfVersion} • ${p.pageCount} trang${p.isLinearized ? ' • Linearized' : ''}`
    }
    if (p.kind === 'archive') {
      return `${p.fileCount} file, ${p.folderCount} thư mục${p.hasRootCollision ? ' • Tự động đổi tên mục gốc trùng' : ''}`
    }
    return ''
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setIsDraggingOver(false)
      }}
      onDrop={handleDrop}
      className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-sky-600/20 backdrop-blur-xs border-4 border-dashed border-sky-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-slate-900 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-2 border border-sky-200 dark:border-sky-800">
            <FolderPlus className="w-12 h-12 text-sky-600 animate-bounce" />
            <p className="text-lg font-bold">
              {navTab === 'archive'
                ? 'Thả file hoặc thư mục để đưa vào gói ZIP / 7z'
                : 'Thả file hoặc thư mục vào hàng đợi Nén Media & PDF'}
            </p>
            <p className="text-xs text-slate-500">
              Tự động nhận diện định dạng bằng header và giữ nguyên file gốc
            </p>
          </div>
        </div>
      )}

      {/* ==================== LEFT NAVIGATION RAIL ==================== */}
      <nav className="w-56 shrink-0 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* App Brand */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">
                {VI_STRINGS.appName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                v{appVersion} • Offline x64
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <div className="p-2.5 space-y-1">
            <button
              type="button"
              onClick={() => setNavTab('media')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                navTab === 'media'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>{VI_STRINGS.nav.media}</span>
              </span>
              {jobs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/50 text-white font-semibold">
                  {jobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setNavTab('archive')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                navTab === 'archive'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileArchive className="w-4 h-4" />
                <span>{VI_STRINGS.nav.archive}</span>
              </span>
              {archiveStagingPaths.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                  +{archiveStagingPaths.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setNavTab('history')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                navTab === 'history'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>{VI_STRINGS.nav.history}</span>
              </span>
              {history.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {history.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setNavTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                navTab === 'settings'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>{VI_STRINGS.nav.settings}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Engine Status & Theme Switcher */}
        <div className="p-3 border-t border-slate-800 space-y-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-800/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Trạng thái Engine</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Offline OK
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
              <span>• Sharp {capabilities?.sharpVersion || '...'}</span>
              <span>• FFmpeg {capabilities?.ffmpegAvailable ? 'Sẵn sàng' : 'Thiếu'}</span>
              <span>• QPDF {capabilities?.qpdfAvailable ? 'Sẵn sàng' : 'Thiếu'}</span>
              <span>• 7-Zip {capabilities?.sevenZipAvailable ? 'Sẵn sàng' : 'Thiếu'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-800">
            {(
              [
                { id: 'light', label: 'Sáng', icon: <Sun className="w-3.5 h-3.5" /> },
                { id: 'dark', label: 'Tối', icon: <Moon className="w-3.5 h-3.5" /> },
                { id: 'system', label: 'Hệ thống', icon: <Monitor className="w-3.5 h-3.5" /> }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={async () => {
                  const next = await window.compressorApi.updateSettings({ theme: t.id })
                  setSettings(next)
                }}
                className={`flex flex-col items-center gap-0.5 py-1 rounded text-[10px] font-medium transition ${
                  settings.theme === t.id
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ==================== CENTER WORKSPACE ==================== */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Toast */}
        {toastMessage && (
          <div className="bg-sky-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Skipped items banner */}
        {skippedNotice.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200 mb-1">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Đã bỏ qua {skippedNotice.length} mục khi quét đầu vào:
              </span>
              <button
                type="button"
                onClick={() => setSkippedNotice([])}
                className="text-amber-700 dark:text-amber-300 hover:underline"
              >
                Đóng thông báo
              </button>
            </div>
            <ul className="max-h-20 overflow-y-auto space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
              {skippedNotice.map((s, idx) => (
                <li key={idx} className="truncate">
                  • <strong>{s.path}</strong>: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ==================== TAB 1 & 2: MEDIA/PDF QUEUE & ARCHIVE BUILDER ==================== */}
        {(navTab === 'media' || navTab === 'archive') && (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              {/* Top Action & Filter Header */}
              <header className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {navTab === 'media'
                      ? 'Nén & Tối ưu Ảnh, Video, PDF'
                      : 'Đóng gói & Tạo Archive ZIP / 7z'}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {navTab === 'media'
                      ? 'Giữ nguyên file gốc • Hỗ trợ JPEG, PNG, WebP, AVIF, MP4/MOV/MKV/WebM (SDR) và PDF'
                      : 'Đóng gói nhiều file và thư mục bất kỳ thành .ZIP hoặc .7z giữ nguyên nội dung byte và cấu trúc'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      navTab === 'media' ? handlePickMediaFiles : handlePickArchiveFiles
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    Thêm File...
                  </button>
                  <button
                    type="button"
                    onClick={
                      navTab === 'media' ? handlePickMediaFolders : handlePickArchiveFolders
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Thêm Thư mục...
                  </button>
                </div>
              </header>

              {/* Archive Builder Staging Panel (only on Archive tab) */}
              {navTab === 'archive' && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-sky-50/40 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Danh sách nguồn chuẩn bị đóng gói vào{' '}
                      <span className="text-sky-600 dark:text-sky-400 font-mono">
                        {globalConfig.archive.archiveBaseName}.{globalConfig.archive.archiveFormat}
                      </span>{' '}
                      ({archiveStagingPaths.length} mục đã chọn)
                    </div>
                    {archiveStagingPaths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setArchiveStagingPaths([])}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Xóa danh sách chọn
                      </button>
                    )}
                  </div>

                  {archiveStagingPaths.length === 0 ? (
                    <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2 bg-white/60 dark:bg-slate-900/40">
                      <Archive className="w-7 h-7 text-sky-600 mx-auto" />
                      <div className="text-xs font-medium">
                        Kéo thả các file hoặc thư mục bất kỳ (Office, EXE, mã nguồn, ảnh, tài liệu tiếng Việt...) vào đây để đóng gói thành 1 file ZIP hoặc 7z
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {archiveStagingPaths.map((p) => (
                          <div
                            key={p}
                            className="flex items-center justify-between px-3 py-1.5"
                          >
                            <span className="font-mono truncate">{p}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setArchiveStagingPaths((prev) =>
                                  prev.filter((item) => item !== p)
                                )
                              }
                              className="text-slate-400 hover:text-rose-600 ml-2"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateArchiveJobFromStaging(false)}
                          className="px-3 py-1.5 rounded-lg border border-sky-600 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/50"
                        >
                          Đưa vào hàng đợi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateArchiveJobFromStaging(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Tạo gói {globalConfig.archive.archiveFormat.toUpperCase()} ngay
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Search & Filter Bar (when jobs exist) */}
              {jobs.length > 0 && (
                <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên file hoặc đường dẫn..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {navTab === 'media' && (
                      <select
                        value={categoryFilter}
                        onChange={(e) =>
                          setCategoryFilter(e.target.value as 'all' | JobCategory)
                        }
                        className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1"
                        aria-label="Lọc theo loại file"
                      >
                        <option value="all">Tất cả loại ({jobs.length})</option>
                        <option value="image">Ảnh tĩnh</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="archive">Archive ZIP/7z</option>
                      </select>
                    )}

                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as
                            | 'all'
                            | 'pending'
                            | 'running'
                            | 'done'
                            | 'attention'
                        )
                      }
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1"
                      aria-label="Lọc theo trạng thái"
                    >
                      <option value="all">Mọi trạng thái</option>
                      <option value="pending">Đang chờ ({queueStats.queuedCount})</option>
                      <option value="running">Đang xử lý ({queueStats.runningCount})</option>
                      <option value="done">Đã hoàn tất ({queueStats.doneCount})</option>
                      <option value="attention">
                        Cần chú ý / Lỗi ({queueStats.attentionCount})
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* Job List or Empty Dropzone */}
              <div className="flex-1 overflow-y-auto p-5">
                {filteredJobs.length === 0 ? (
                  <div className="h-full min-h-[280px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 shadow-inner">
                      <FolderPlus className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {jobs.length === 0
                        ? 'Kéo thả File hoặc Thư mục vào đây để bắt đầu'
                        : 'Không có mục nào khớp với bộ lọc hiện tại'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                      {jobs.length === 0
                        ? 'Hỗ trợ nén hàng loạt JPEG, PNG, WebP, AVIF, Video MP4/MOV/MKV/WebM (xuất MP4 H.264), tối ưu cấu trúc PDF và tạo gói ZIP/7z. Mọi xử lý diễn ra cục bộ trên máy của bạn.'
                        : 'Hãy thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc trạng thái về "Mọi trạng thái".'}
                    </p>
                    {jobs.length === 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handlePickMediaFiles}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
                        >
                          <FilePlus2 className="w-4 h-4" />
                          Chọn File từ máy tính
                        </button>
                        <button
                          type="button"
                          onClick={handlePickMediaFolders}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold"
                        >
                          <FolderPlus className="w-4 h-4" />
                          Quét cả Thư mục
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredJobs.map((job) => {
                      const isSelected = job.id === selectedJobId
                      const presetLabel =
                        VI_STRINGS.presetTiers[job.configSnapshot.presetTier] || 'Tùy chỉnh'

                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={`group rounded-xl border p-3.5 transition cursor-pointer ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/25 ring-1 ring-sky-500/50'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {/* Category Icon or Video Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/70 dark:border-slate-700">
                              {job.probe?.kind === 'video' && job.probe.thumbnailDataUrl ? (
                                <img
                                  src={job.probe.thumbnailDataUrl}
                                  alt={job.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : job.category === 'image' ? (
                                <ImageIcon className="w-5 h-5 text-sky-600" />
                              ) : job.category === 'video' ? (
                                <Film className="w-5 h-5 text-indigo-600" />
                              ) : job.category === 'pdf' ? (
                                <FileText className="w-5 h-5 text-rose-600" />
                              ) : (
                                <Archive className="w-5 h-5 text-amber-600" />
                              )}
                            </div>

                            {/* Center Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    title={job.primarySourcePath}
                                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate"
                                  >
                                    {job.displayName}
                                  </span>
                                  {job.hasCustomOverride && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                      Cấu hình riêng
                                    </span>
                                  )}
                                </div>
                                <StatusBadge status={job.status} />
                              </div>

                              {/* Metadata & Preset line */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {formatBytes(job.inputSizeBytes)}
                                </span>
                                <span>•</span>
                                <span className="truncate">{renderProbeSummary(job)}</span>
                                <span>•</span>
                                <span className="text-sky-700 dark:text-sky-400 font-medium">
                                  Preset: {presetLabel}
                                </span>
                              </div>

                              {/* Active Progress Bar */}
                              {(job.status === 'running' ||
                                job.status === 'validating' ||
                                job.status === 'probing') && (
                                <div className="mt-2.5 space-y-1">
                                  <div className="flex justify-between text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                    <span>
                                      {job.progress?.detailText || 'Đang xử lý...'}
                                    </span>
                                    {job.progress?.percent !== null &&
                                      job.progress?.percent !== undefined && (
                                        <span>{job.progress.percent}%</span>
                                      )}
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    {job.progress?.percent !== null &&
                                    job.progress?.percent !== undefined ? (
                                      <div
                                        className="h-full bg-sky-600 transition-all duration-200"
                                        style={{ width: `${job.progress.percent}%` }}
                                      />
                                    ) : (
                                      <div className="h-full w-1/3 bg-sky-500 animate-pulse rounded-full" />
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Result or Reason Box */}
                              {job.result && (
                                <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span>
                                      Kết quả:{' '}
                                      <strong className="text-slate-900 dark:text-white">
                                        {formatBytes(job.result.outputSizeBytes)}
                                      </strong>
                                    </span>
                                    {!job.result.keptOriginalAsFinal && (
                                      <span
                                        className={`px-2 py-0.5 rounded font-semibold ${
                                          job.result.savedBytes > 0
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        }`}
                                      >
                                        {job.result.savedBytes > 0
                                          ? `Giảm ${formatBytes(job.result.savedBytes)} (-${job.result.savedPercent}%)`
                                          : `Tăng +${formatBytes(Math.abs(job.result.savedBytes))}`}
                                      </span>
                                    )}
                                    <span className="text-slate-500 dark:text-slate-400">
                                      • {job.result.validationSummary}
                                    </span>
                                  </div>

                                  {job.result.multiOutputs &&
                                    job.result.multiOutputs.length > 1 && (
                                      <div className="w-full flex flex-wrap gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                                        {job.result.multiOutputs.map((m, i) => (
                                          <button
                                            key={i}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              void window.compressorApi.showInFolder(m.outputPath)
                                            }}
                                            className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 hover:underline"
                                          >
                                            {m.label}: {m.width}×{m.height} (
                                            {formatBytes(m.sizeBytes)})
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              )}

                              {job.statusReason && (
                                <div
                                  className={`mt-1.5 text-xs ${
                                    job.status === 'failed' || job.status === 'unsupported'
                                      ? 'text-rose-600 dark:text-rose-400 font-medium'
                                      : 'text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {job.statusReason}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {job.category === 'image' && job.probe?.kind === 'image' && (
                                <button
                                  type="button"
                                  title="Xem trước & So sánh Trước/Sau ở Zoom 100%"
                                  onClick={() => setPreviewJob(job)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-600 dark:text-sky-400 text-xs font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>So sánh</span>
                                </button>
                              )}

                              {job.result && !job.result.keptOriginalAsFinal && (
                                <>
                                  <button
                                    type="button"
                                    title="Mở file kết quả bằng ứng dụng mặc định của hệ thống"
                                    onClick={async () => {
                                      const r = await window.compressorApi.openFile(
                                        job.result!.outputPath
                                      )
                                      if (!r.ok && r.error) showToast(r.error)
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                                  >
                                    Mở file
                                  </button>
                                  <button
                                    type="button"
                                    title="Mở thư mục chứa file kết quả"
                                    onClick={async () => {
                                      const r = await window.compressorApi.showInFolder(
                                        job.result!.outputPath
                                      )
                                      if (!r.ok && r.error) showToast(r.error)
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {(job.status === 'running' ||
                                job.status === 'validating' ||
                                job.status === 'queued' ||
                                job.status === 'probing') && (
                                <button
                                  type="button"
                                  title="Hủy tác vụ này"
                                  onClick={() => window.compressorApi.cancelJob(job.id)}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}

                              {[
                                'failed',
                                'cancelled',
                                'interrupted',
                                'target_unmet',
                                'no_savings',
                                'completed',
                                'converted_not_smaller'
                              ].includes(job.status) && (
                                <button
                                  type="button"
                                  title="Chạy lại tác vụ này"
                                  onClick={() => window.compressorApi.retryJob(job.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}

                              {!['running', 'validating', 'probing'].includes(job.status) && (
                                <button
                                  type="button"
                                  title="Xóa khỏi danh sách"
                                  onClick={() => window.compressorApi.removeJob(job.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sticky Bottom Queue Control Bar */}
              <footer className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Tổng quan Hàng đợi: {queueStats.doneCount}/{queueStats.totalCount} hoàn tất
                      {queueStats.queuedCount > 0 ? ` • ${queueStats.queuedCount} đang chờ` : ''}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {queueStats.totalSavedBytes > 0 ? (
                        <span>
                          Đã tiết kiệm tổng cộng:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {formatBytes(queueStats.totalSavedBytes)} (-{queueStats.totalSavedPct}%)
                          </strong>
                        </span>
                      ) : (
                        <span>
                          Thư mục xuất:{' '}
                          <strong>
                            {globalConfig.naming.outputDirMode === 'same_folder'
                              ? 'Cùng thư mục file gốc'
                              : globalConfig.naming.customOutputDir || 'Thư mục chỉ định'}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {isRunning && (
                    <div className="w-36 hidden sm:block">
                      <div className="flex justify-between text-[10px] font-semibold text-sky-600 mb-0.5">
                        <span>{isPaused ? 'Đang tạm dừng nhận việc' : 'Tiến trình tổng'}</span>
                        <span>{queueStats.overallPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-600 transition-all duration-300"
                          style={{ width: `${queueStats.overallPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {queueStats.doneCount > 0 && !isRunning && (
                    <button
                      type="button"
                      onClick={() => window.compressorApi.clearFinished()}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Dọn mục đã xong
                    </button>
                  )}

                  {isRunning && !isPaused && (
                    <button
                      type="button"
                      onClick={() => window.compressorApi.pauseQueue()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                    >
                      <Pause className="w-4 h-4" />
                      Tạm dừng hàng đợi
                    </button>
                  )}

                  {isPaused && (
                    <button
                      type="button"
                      onClick={() => window.compressorApi.resumeQueue()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold"
                    >
                      <Play className="w-4 h-4" />
                      Tiếp tục hàng đợi
                    </button>
                  )}

                  {(isRunning || queueStats.queuedCount > 0) && (
                    <button
                      type="button"
                      onClick={() => window.compressorApi.cancelAll()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold"
                    >
                      <XCircle className="w-4 h-4" />
                      Hủy tất cả
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={queueStats.queuedCount === 0}
                    onClick={() => window.compressorApi.startQueue()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Bắt đầu xử lý ({queueStats.queuedCount})
                  </button>
                </div>
              </footer>
            </div>

            {/* Right Configuration Sidebar */}
            <ConfigSidebar
              activeConfig={activeConfigForSidebar}
              selectedJob={selectedJob}
              activeTabCategory={navTab === 'archive' ? 'archive' : 'image'}
              presets={presets}
              capabilities={capabilities}
              applyScope={applyScope}
              onChangeApplyScope={setApplyScope}
              onUpdateConfig={handleUpdateConfig}
              onPickOutputFolder={async () => {
                const picked = await window.compressorApi.pickOutputFolder()
                if (picked) {
                  await handleUpdateConfig({
                    ...activeConfigForSidebar,
                    naming: {
                      ...activeConfigForSidebar.naming,
                      outputDirMode: 'custom_folder',
                      customOutputDir: picked
                    }
                  })
                }
              }}
              onSavePreset={async (name, description, id) => {
                const updated = await window.compressorApi.savePreset({
                  id,
                  name,
                  description,
                  baseTier: activeConfigForSidebar.presetTier,
                  config: activeConfigForSidebar
                })
                setPresets(updated)
                showToast(`Đã lưu preset "${name}"`)
              }}
              onDeletePreset={async (id) => {
                const updated = await window.compressorApi.deletePreset(id)
                setPresets(updated)
                showToast('Đã xóa preset cá nhân')
              }}
              onResetPresets={async () => {
                const updated = await window.compressorApi.resetDefaultPresets()
                setPresets(updated)
                showToast('Đã khôi phục bộ preset mặc định')
              }}
            />
          </div>
        )}

        {/* ==================== TAB 3: HISTORY ==================== */}
        {navTab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold">Lịch sử xử lý trên máy</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lưu tối đa {settings.maxHistoryItems} tác vụ gần nhất. Xóa lịch sử chỉ xóa bản ghi trong ứng dụng, tuyệt đối không xóa file nguồn hay file kết quả trên ổ đĩa.
                </p>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const cleared = await window.compressorApi.clearHistory()
                    setHistory(cleared)
                    showToast('Đã xóa danh sách lịch sử (các file trên đĩa vẫn được giữ nguyên)')
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa toàn bộ lịch sử
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Clock className="w-10 h-10 stroke-1" />
                  <p className="text-sm">Chưa có lịch sử xử lý nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-w-5xl mx-auto">
                  {history.map((h) => (
                    <div
                      key={`${h.id}_${h.finishedAt}`}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm truncate">
                            {h.displayName}
                          </span>
                          <StatusBadge status={h.status} compact />
                          <span className="text-[11px] text-slate-400">
                            {h.finishedAt
                              ? new Date(h.finishedAt).toLocaleString('vi-VN')
                              : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                          <span>Gốc: {formatBytes(h.inputSizeBytes)}</span>
                          {h.result && (
                            <>
                              <span>→</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Xuất: {formatBytes(h.result.outputSizeBytes)} (
                                {h.result.savedBytes >= 0
                                  ? `-${h.result.savedPercent}%`
                                  : `+${Math.abs(h.result.savedPercent)}%`}
                                )
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            Công cụ: {h.engineName} ({h.engineVersion})
                          </span>
                        </div>
                        {h.result?.outputPath && (
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            Đầu ra: {h.result.outputPath}
                          </div>
                        )}
                        {h.result?.warningMessage && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            ⚠ {h.result.warningMessage}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {h.result?.outputPath && !h.result.warningMessage && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await window.compressorApi.openFile(
                                  h.result!.outputPath
                                )
                                if (!r.ok && r.error) showToast(r.error)
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700"
                            >
                              Mở file
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await window.compressorApi.showInFolder(
                                  h.result!.outputPath
                                )
                                if (!r.ok && r.error) showToast(r.error)
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Hiển thị trong thư mục"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await window.compressorApi.rerunHistoryJob({
                                category: h.category,
                                sourcePaths: h.sourcePaths,
                                configSnapshot: h.configSnapshot
                              })
                              setNavTab(h.category === 'archive' ? 'archive' : 'media')
                              showToast('Đã đưa tác vụ vào hàng đợi và chạy lại!')
                            } catch (err) {
                              showToast((err as Error).message)
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Chạy lại
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const next = await window.compressorApi.removeHistoryItem(h.id)
                            setHistory(next)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                          title="Xóa bản ghi này khỏi lịch sử"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: SETTINGS & CAPABILITIES ==================== */}
        {navTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-lg font-bold">Cài đặt Ứng dụng & Năng lực Hệ thống</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cấu hình giới hạn tài nguyên xử lý song song, hành vi chạy nền và bảng đối chiếu định dạng đã kiểm chứng.
                </p>
              </div>

              {/* Resource & Concurrency Settings */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-600" />
                  Điều phối Hàng đợi & Giới hạn Tài nguyên
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <span>Số tác vụ Ảnh xử lý đồng thời:</span>
                    <select
                      value={settings.maxConcurrentImages}
                      onChange={async (e) => {
                        const next = await window.compressorApi.updateSettings({
                          maxConcurrentImages: Number(e.target.value)
                        })
                        setSettings(next)
                      }}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-semibold"
                    >
                      {[1, 2, 3, 4, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} ảnh cùng lúc
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <span>Số tác vụ Video xử lý đồng thời:</span>
                    <select
                      value={settings.maxConcurrentVideos}
                      onChange={async (e) => {
                        const next = await window.compressorApi.updateSettings({
                          maxConcurrentVideos: Number(e.target.value)
                        })
                        setSettings(next)
                      }}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-semibold"
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n} video (Mặc định 1 để tối ưu CPU)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <span>Số tác vụ PDF xử lý đồng thời:</span>
                    <select
                      value={settings.maxConcurrentPdfs}
                      onChange={async (e) => {
                        const next = await window.compressorApi.updateSettings({
                          maxConcurrentPdfs: Number(e.target.value)
                        })
                        setSettings(next)
                      }}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-semibold"
                    >
                      {[1, 2, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} tài liệu PDF
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                    <span>Khi bấm nút Đóng cửa sổ lúc đang nén:</span>
                    <select
                      value={settings.closeBehavior}
                      onChange={async (e) => {
                        const next = await window.compressorApi.updateSettings({
                          closeBehavior: e.target.value as AppSettings['closeBehavior']
                        })
                        setSettings(next)
                      }}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 font-semibold"
                    >
                      <option value="ask">Hỏi xác nhận (Chạy nền hoặc Hủy)</option>
                      <option value="minimize_to_tray">Tự thu xuống khay hệ thống chạy nền</option>
                      <option value="cancel_and_quit">Hủy tiến trình và thoát ngay</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Bundled Engines & Capability Matrix */}
              {capabilities && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Công cụ Thực thi Đóng gói Offline (Bundled Native Binaries)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="font-semibold text-sky-700 dark:text-sky-400">
                        Engine Ảnh: Sharp v{capabilities.sharpVersion} (libvips v{capabilities.libvipsVersion})
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        JPEG (mozjpeg), PNG, WebP ({capabilities.webpSupported ? 'Có' : 'Không'}), AVIF ({capabilities.avifSupported ? 'Đã kiểm chứng' : 'Không'})
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="font-semibold text-sky-700 dark:text-sky-400">
                        Engine Video: FFmpeg + ffprobe
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 truncate">
                        {capabilities.ffmpegVersion}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        H.264 Encoders: {capabilities.h264Encoders.concat(capabilities.hardwareH264Encoders).join(', ')}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="font-semibold text-sky-700 dark:text-sky-400">
                        Engine PDF: QPDF
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {capabilities.qpdfVersion} (Tối ưu cấu trúc & Object Streams không giảm chất lượng)
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="font-semibold text-sky-700 dark:text-sky-400">
                        Engine Archive: 7-Zip Standalone (7za)
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {capabilities.sevenZipVersion} (Hỗ trợ tạo & kiểm chứng CRC .ZIP và .7z)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Support Table matching docs/FORMAT_SUPPORT.md */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h2 className="text-sm font-bold">
                  Bảng Phạm vi Hỗ trợ Định dạng & Ranh giới Cam kết
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2 pr-3">Nhóm</th>
                        <th className="py-2 px-3">Đầu vào hỗ trợ</th>
                        <th className="py-2 px-3">Đầu ra & Chế độ</th>
                        <th className="py-2 pl-3">Giới hạn & Ranh giới rõ ràng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-2.5 pr-3 font-semibold">Ảnh tĩnh</td>
                        <td className="py-2.5 px-3">JPEG, PNG, WebP, AVIF (8-bit SDR tĩnh)</td>
                        <td className="py-2.5 px-3">
                          Giữ định dạng hoặc chuyển đổi qua lại; Resize; Target Size (KB/MB); Multi-size
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-400">
                          Từ chối rõ HEIC/RAW, GIF/WebP động, TIFF nhiều trang, ảnh &gt;8-bit (không tự lấy frame đầu hay hạ bit-depth).
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-3 font-semibold">Video</td>
                        <td className="py-2.5 px-3">MP4, MOV, MKV, WebM (SDR 8-bit)</td>
                        <td className="py-2.5 px-3">
                          MP4 (H.264 + AAC/Copy); Chế độ CRF hoặc Target Size 2-Pass
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-400">
                          Từ chối rõ HDR10/HLG/Dolby Vision/10-bit (không tự tone-map). Không cắt ngắn video để ép MB.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-3 font-semibold">PDF</td>
                        <td className="py-2.5 px-3">PDF chuẩn không mật khẩu, không chữ ký số</td>
                        <td className="py-2.5 px-3">
                          PDF tối ưu Object Streams, nén lại Flate stream, Linearize
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-400">
                          Từ chối PDF có mật khẩu hoặc chữ ký số để bảo toàn tính pháp lý. Không hứa giảm mạnh mọi PDF scan JPEG.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-3 font-semibold">Archive</td>
                        <td className="py-2.5 px-3">Mọi file & thư mục (Unicode, Office, EXE...)</td>
                        <td className="py-2.5 px-3">
                          Tạo gói .ZIP (Deflate) hoặc .7z (LZMA2) kèm kiểm chứng CRC
                        </td>
                        <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-400">
                          Bảo toàn nguyên vẹn 100% nội dung byte của file bên trong; không tạo định dạng RAR.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Image Before/After 100% Zoom Modal */}
      {previewJob && (
        <ImagePreviewModal
          job={previewJob}
          avifSupported={capabilities?.avifSupported ?? true}
          onClose={() => setPreviewJob(null)}
          onApplyConfigToJob={handleApplyPreviewConfigToJob}
        />
      )}
    </div>
  )
}

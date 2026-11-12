import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  CompressionJob,
  ImportBatchResponse,
  JobCategory,
  JobConfigSnapshot,
  JobProgressInfo,
  JobStatus,
  SkippedImportItem
} from '../../shared/types'
import { cloneConfig, sanitizeJobConfig } from '../../shared/presets'
import { LocalStore } from '../store/localStore'
import {
  buildPlannedOutputPath,
  computePlannedOutputDir,
  normalizeCanonicalPath,
  scanPathsForMediaImport,
  sniffFileHeader
} from '../utils/fileSafety'
import { probeCapabilities } from '../utils/binaries'
import {
  executeImageJob,
  getImageExtensionForFormat,
  probeImageFile,
  resolveTargetImageFormat
} from '../engines/imageAdapter'
import { executeVideoJob, probeVideoFile } from '../engines/videoAdapter'
import { executePdfJob, probePdfFile } from '../engines/pdfAdapter'
import { executeArchiveJob, probeArchiveInputs } from '../engines/archiveAdapter'

export interface QueueStateBroadcast {
  jobs: CompressionJob[]
  isRunning: boolean
  isPaused: boolean
}

export class QueueManager {
  private jobs: CompressionJob[] = []
  private isRunning = false
  private isPaused = false
  private activeControllers = new Map<string, AbortController>()
  private runningCounts: Record<JobCategory, number> = {
    image: 0,
    video: 0,
    pdf: 0,
    archive: 0
  }
  private readonly store: LocalStore
  private readonly onStateChange: (state: QueueStateBroadcast) => void

  constructor(store: LocalStore, onStateChange: (state: QueueStateBroadcast) => void) {
    this.store = store
    this.onStateChange = onStateChange
    this.jobs = this.store.getActiveQueue()
  }

  public getState(): QueueStateBroadcast {
    return {
      jobs: this.jobs.map((j) => ({ ...j })),
      isRunning: this.isRunning,
      isPaused: this.isPaused
    }
  }

  public hasRunningJobs(): boolean {
    return this.activeControllers.size > 0
  }

  private notifyAndPersist(): void {
    this.store.setActiveQueue(this.jobs)
    this.onStateChange(this.getState())
  }

  private computePlannedPathForJob(
    category: JobCategory,
    primarySourcePath: string,
    relativeFolder: string,
    config: JobConfigSnapshot,
    detectedFormat = 'jpeg'
  ): string {
    if (category === 'archive') {
      const ext = config.archive.archiveFormat === '7z' ? '.7z' : '.zip'
      const outDir = computePlannedOutputDir(primarySourcePath, config, '')
      const base = (config.archive.archiveBaseName || 'Archive_Bundle').replace(
        /[<>:"/\\|?*]/g,
        '_'
      )
      return path.join(outDir, `${base}${ext}`)
    }
    if (category === 'video') {
      return buildPlannedOutputPath(primarySourcePath, '.mp4', config, relativeFolder)
    }
    if (category === 'pdf') {
      return buildPlannedOutputPath(primarySourcePath, '.pdf', config, relativeFolder)
    }
    const targetImgFmt = resolveTargetImageFormat(detectedFormat, config.image)
    const ext = getImageExtensionForFormat(targetImgFmt)
    return buildPlannedOutputPath(primarySourcePath, ext, config, relativeFolder)
  }

  public async importMediaPaths(
    rawPaths: string[],
    overrideConfig?: JobConfigSnapshot
  ): Promise<ImportBatchResponse> {
    const baseConfig = sanitizeJobConfig(
      overrideConfig || this.store.getSettings().defaultConfig
    )
    const { discovered, skipped } = scanPathsForMediaImport(rawPaths)
    const caps = await probeCapabilities()

    // Avoid duplicating files already queued or running
    const existingActivePaths = new Set(
      this.jobs
        .filter((j) => j.category !== 'archive' && ['queued', 'probing', 'running'].includes(j.status))
        .map((j) => normalizeCanonicalPath(j.primarySourcePath))
    )

    const addedJobs: CompressionJob[] = []

    for (const entry of discovered) {
      const canon = normalizeCanonicalPath(entry.filePath)
      if (existingActivePaths.has(canon)) {
        skipped.push({
          path: entry.filePath,
          reason: 'File đã có trong danh sách hàng đợi hiện tại.'
        })
        continue
      }

      const sniff = sniffFileHeader(entry.filePath)
      const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
      const nowIso = new Date().toISOString()

      if (sniff.category === 'unsupported' || sniff.unsupportedReason) {
        const unsupCategory: JobCategory =
          sniff.category === 'unsupported' ? 'image' : sniff.category
        const unsupJob: CompressionJob = {
          id: jobId,
          category: unsupCategory,
          sourcePaths: [entry.filePath],
          primarySourcePath: entry.filePath,
          displayName: path.basename(entry.filePath),
          relativeFolder: entry.relativeFolder,
          rootSourceDir: entry.rootSourceDir,
          inputSizeBytes: entry.sizeBytes,
          inputMtimeMs: entry.mtimeMs,
          status: 'unsupported',
          statusReason: sniff.unsupportedReason || 'Định dạng không hỗ trợ.',
          configSnapshot: cloneConfig(baseConfig),
          hasCustomOverride: false,
          plannedOutputPath: '',
          engineName: 'Detector',
          engineVersion: '1.0',
          createdAt: nowIso,
          retryCount: 0,
          logs: []
        }
        this.jobs.push(unsupJob)
        addedJobs.push(unsupJob)
        continue
      }

      const engineInfo =
        sniff.category === 'image'
          ? { name: 'Sharp (libvips)', ver: caps.sharpVersion }
          : sniff.category === 'video'
            ? { name: 'FFmpeg', ver: caps.ffmpegVersion }
            : { name: 'QPDF', ver: caps.qpdfVersion }

      const plannedOut = this.computePlannedPathForJob(
        sniff.category,
        entry.filePath,
        entry.relativeFolder,
        baseConfig,
        sniff.detectedFormat
      )

      const newJob: CompressionJob = {
        id: jobId,
        category: sniff.category,
        sourcePaths: [entry.filePath],
        primarySourcePath: entry.filePath,
        displayName: path.basename(entry.filePath),
        relativeFolder: entry.relativeFolder,
        rootSourceDir: entry.rootSourceDir,
        inputSizeBytes: entry.sizeBytes,
        inputMtimeMs: entry.mtimeMs,
        status: 'probing',
        configSnapshot: cloneConfig(baseConfig),
        hasCustomOverride: false,
        plannedOutputPath: plannedOut,
        engineName: engineInfo.name,
        engineVersion: engineInfo.ver,
        createdAt: nowIso,
        retryCount: 0,
        logs: []
      }

      this.jobs.push(newJob)
      addedJobs.push(newJob)
      existingActivePaths.add(canon)
    }

    this.notifyAndPersist()

    // Probe added jobs asynchronously
    for (const job of addedJobs) {
      if (job.status === 'probing') {
        await this.probeSingleJob(job.id)
      }
    }

    if (this.isRunning && !this.isPaused) {
      this.pumpQueue()
    }

    return {
      addedJobs: this.jobs.filter((j) => addedJobs.some((a) => a.id === j.id)),
      skippedItems: skipped
    }
  }

  public async createArchiveJob(
    rawPaths: string[],
    overrideConfig?: JobConfigSnapshot
  ): Promise<ImportBatchResponse> {
    const skipped: SkippedImportItem[] = []
    const validPaths: string[] = []

    for (const p of rawPaths) {
      try {
        const lstat = fs.lstatSync(p)
        if (lstat.isSymbolicLink()) {
          skipped.push({
            path: p,
            reason: 'Bỏ qua symlink / junction khi tạo archive.'
          })
          continue
        }
        validPaths.push(path.resolve(p))
      } catch (err) {
        skipped.push({
          path: p,
          reason: `Không thể truy cập đường dẫn: ${(err as Error).message}`
        })
      }
    }

    if (validPaths.length === 0) {
      return { addedJobs: [], skippedItems: skipped }
    }

    const baseConfig = sanitizeJobConfig(
      overrideConfig || this.store.getSettings().defaultConfig
    )
    const caps = await probeCapabilities()
    const { probe, unsupportedReason } = await probeArchiveInputs(validPaths)

    const jobId = `job_arch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const primaryPath = validPaths[0]
    const defaultArchiveName =
      validPaths.length === 1
        ? path.parse(primaryPath).name || 'Archive_Bundle'
        : `${path.parse(primaryPath).name}_va_${validPaths.length - 1}_muc`

    if (baseConfig.archive.archiveBaseName === 'Archive_Bundle') {
      baseConfig.archive.archiveBaseName = defaultArchiveName
    }

    const plannedPath = this.computePlannedPathForJob(
      'archive',
      primaryPath,
      '',
      baseConfig
    )

    const archiveJob: CompressionJob = {
      id: jobId,
      category: 'archive',
      sourcePaths: validPaths,
      primarySourcePath: primaryPath,
      displayName: `${baseConfig.archive.archiveBaseName}.${baseConfig.archive.archiveFormat}`,
      relativeFolder: '',
      inputSizeBytes: probe?.totalBytes ?? 0,
      inputMtimeMs: Date.now(),
      status: unsupportedReason || !probe ? 'unsupported' : 'queued',
      statusReason: unsupportedReason,
      probe,
      configSnapshot: cloneConfig(baseConfig),
      hasCustomOverride: false,
      plannedOutputPath: plannedPath,
      engineName: '7-Zip (7za)',
      engineVersion: caps.sevenZipVersion,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      logs: []
    }

    this.jobs.push(archiveJob)
    this.notifyAndPersist()

    if (this.isRunning && !this.isPaused) {
      this.pumpQueue()
    }

    return {
      addedJobs: [archiveJob],
      skippedItems: skipped
    }
  }

  private async probeSingleJob(jobId: string): Promise<void> {
    const job = this.jobs.find((j) => j.id === jobId)
    if (!job || job.status !== 'probing') return

    try {
      if (job.category === 'image') {
        const { probe, unsupportedReason } = await probeImageFile(job.primarySourcePath)
        if (!probe || unsupportedReason) {
          job.status = 'unsupported'
          job.statusReason = unsupportedReason || 'Ảnh không được hỗ trợ.'
        } else {
          job.probe = probe
          job.status = 'queued'
          job.plannedOutputPath = this.computePlannedPathForJob(
            'image',
            job.primarySourcePath,
            job.relativeFolder,
            job.configSnapshot,
            probe.format
          )
        }
      } else if (job.category === 'video') {
        const { probe, unsupportedReason } = await probeVideoFile(job.primarySourcePath)
        if (!probe || unsupportedReason) {
          job.status = 'unsupported'
          job.statusReason = unsupportedReason || 'Video không được hỗ trợ.'
        } else {
          job.probe = probe
          job.status = 'queued'
          job.plannedOutputPath = this.computePlannedPathForJob(
            'video',
            job.primarySourcePath,
            job.relativeFolder,
            job.configSnapshot
          )
        }
      } else if (job.category === 'pdf') {
        const { probe, unsupportedReason } = await probePdfFile(job.primarySourcePath)
        if (!probe || unsupportedReason) {
          job.status = 'unsupported'
          job.statusReason = unsupportedReason || 'PDF không được hỗ trợ.'
        } else {
          job.probe = probe
          job.status = 'queued'
          job.plannedOutputPath = this.computePlannedPathForJob(
            'pdf',
            job.primarySourcePath,
            job.relativeFolder,
            job.configSnapshot
          )
        }
      }
    } catch (err) {
      job.status = 'failed'
      job.statusReason = `Lỗi khi đọc thông tin file: ${(err as Error).message}`
    }

    this.notifyAndPersist()
  }

  public updateJobsConfig(
    targetScope: 'all_pending' | string[],
    newConfig: JobConfigSnapshot
  ): QueueStateBroadcast {
    const sanitized = sanitizeJobConfig(newConfig)
    const editableStatuses = new Set<JobStatus>([
      'queued',
      'failed',
      'cancelled',
      'interrupted',
      'target_unmet',
      'no_savings'
    ])

    for (const job of this.jobs) {
      // Never mutate a running/probing/validating job's snapshot
      if (!editableStatuses.has(job.status)) continue

      const isTargeted =
        targetScope === 'all_pending'
          ? !job.hasCustomOverride || job.status === 'queued'
          : targetScope.includes(job.id)

      if (!isTargeted) continue

      job.configSnapshot = cloneConfig(sanitized)
      if (Array.isArray(targetScope) && targetScope.length > 0) {
        job.hasCustomOverride = true
      } else {
        job.hasCustomOverride = false
      }

      const detectedFmt =
        job.probe?.kind === 'image' ? job.probe.format : 'jpeg'
      job.plannedOutputPath = this.computePlannedPathForJob(
        job.category,
        job.primarySourcePath,
        job.relativeFolder,
        job.configSnapshot,
        detectedFmt
      )
      if (job.category === 'archive') {
        job.displayName = `${job.configSnapshot.archive.archiveBaseName}.${job.configSnapshot.archive.archiveFormat}`
      }
    }

    this.notifyAndPersist()
    return this.getState()
  }

  public startQueue(): QueueStateBroadcast {
    this.isRunning = true
    this.isPaused = false
    this.notifyAndPersist()
    this.pumpQueue()
    return this.getState()
  }

  public pauseQueue(): QueueStateBroadcast {
    this.isPaused = true
    this.notifyAndPersist()
    return this.getState()
  }

  public resumeQueue(): QueueStateBroadcast {
    this.isPaused = false
    this.isRunning = true
    this.notifyAndPersist()
    this.pumpQueue()
    return this.getState()
  }

  public async cancelJob(jobId: string): Promise<QueueStateBroadcast> {
    const job = this.jobs.find((j) => j.id === jobId)
    if (!job) return this.getState()

    if (job.status === 'queued' || job.status === 'probing') {
      job.status = 'cancelled'
      job.statusReason = 'Đã hủy khi đang chờ trong hàng đợi.'
      job.finishedAt = new Date().toISOString()
      this.notifyAndPersist()
      return this.getState()
    }

    const controller = this.activeControllers.get(jobId)
    if (controller) {
      controller.abort()
    }
    return this.getState()
  }

  public async cancelAll(): Promise<QueueStateBroadcast> {
    this.isPaused = false
    this.isRunning = false

    for (const job of this.jobs) {
      if (job.status === 'queued' || job.status === 'probing') {
        job.status = 'cancelled'
        job.statusReason = 'Đã hủy toàn bộ hàng đợi.'
        job.finishedAt = new Date().toISOString()
      }
    }

    for (const [, controller] of this.activeControllers) {
      controller.abort()
    }

    this.notifyAndPersist()
    return this.getState()
  }

  public async retryJob(jobId: string): Promise<QueueStateBroadcast> {
    const job = this.jobs.find((j) => j.id === jobId)
    if (!job) return this.getState()
    if (['running', 'probing', 'validating'].includes(job.status)) {
      return this.getState()
    }

    // Re-stat primary source to refresh size & mtime snapshot on explicit user retry
    if (fs.existsSync(job.primarySourcePath)) {
      const st = fs.statSync(job.primarySourcePath)
      job.inputSizeBytes = st.size
      job.inputMtimeMs = st.mtimeMs
    }

    if (job.category === 'archive') {
      const { probe, unsupportedReason } = await probeArchiveInputs(job.sourcePaths)
      if (!probe || unsupportedReason) {
        job.status = 'failed'
        job.statusReason = unsupportedReason || 'Nguồn archive không còn hợp lệ.'
        this.notifyAndPersist()
        return this.getState()
      }
      job.probe = probe
      job.inputSizeBytes = probe.totalBytes
    }

    job.status = 'queued'
    job.statusReason = undefined
    job.progress = undefined
    job.result = undefined
    job.finishedAt = undefined
    job.retryCount = (job.retryCount || 0) + 1
    job.logs = []

    this.isRunning = true
    this.isPaused = false
    this.notifyAndPersist()
    this.pumpQueue()
    return this.getState()
  }

  public removeJob(jobId: string): QueueStateBroadcast {
    if (this.activeControllers.has(jobId)) {
      return this.getState()
    }
    this.jobs = this.jobs.filter((j) => j.id !== jobId)
    this.notifyAndPersist()
    return this.getState()
  }

  public clearFinishedJobs(): QueueStateBroadcast {
    const activeStatuses = new Set<JobStatus>(['queued', 'probing', 'running', 'validating'])
    this.jobs = this.jobs.filter((j) => activeStatuses.has(j.status))
    this.notifyAndPersist()
    return this.getState()
  }

  private pumpQueue(): void {
    if (!this.isRunning || this.isPaused) return

    const settings = this.store.getSettings()
    const limits: Record<JobCategory, number> = {
      image: settings.maxConcurrentImages,
      video: settings.maxConcurrentVideos,
      pdf: settings.maxConcurrentPdfs,
      archive: settings.maxConcurrentArchives
    }

    const queuedJobs = this.jobs.filter((j) => j.status === 'queued')
    if (queuedJobs.length === 0 && this.activeControllers.size === 0) {
      this.isRunning = false
      this.notifyAndPersist()
      return
    }

    for (const candidate of queuedJobs) {
      if (this.isPaused || !this.isRunning) break
      const cat = candidate.category
      if (this.runningCounts[cat] < limits[cat]) {
        void this.runSingleJob(candidate)
      }
    }
  }

  private async runSingleJob(job: CompressionJob): Promise<void> {
    if (job.status !== 'queued') return

    const cat = job.category
    this.runningCounts[cat]++
    const controller = new AbortController()
    this.activeControllers.set(job.id, controller)

    // Freeze configSnapshot at start
    job.configSnapshot = cloneConfig(job.configSnapshot)
    job.status = 'running'
    job.startedAt = new Date().toISOString()
    job.progress = {
      phase: 'encoding',
      percent: 0,
      detailText: 'Đang khởi chạy tiến trình xử lý...'
    }
    this.notifyAndPersist()

    let lastBroadcastTime = 0
    const onProgress = (p: JobProgressInfo): void => {
      job.progress = p
      if (p.phase === 'validating') {
        job.status = 'validating'
      }
      const now = Date.now()
      if (now - lastBroadcastTime >= 180 || p.percent === 100 || p.phase === 'validating') {
        lastBroadcastTime = now
        this.onStateChange(this.getState())
      }
    }

    const onLog = (line: string): void => {
      if (job.logs.length >= 120) {
        job.logs.shift()
      }
      job.logs.push(line)
    }

    try {
      let outcome: {
        status: JobStatus
        result?: CompressionJob['result']
        reason?: string
      }

      if (!job.probe) {
        await this.probeSingleJob(job.id)
      }

      if (!job.probe) {
        outcome = {
          status: 'unsupported',
          reason: job.statusReason || 'Không thể phân tích metadata đầu vào.'
        }
      } else if (job.category === 'image' && job.probe.kind === 'image') {
        outcome = await executeImageJob(job, job.probe, onProgress, controller.signal)
      } else if (job.category === 'video' && job.probe.kind === 'video') {
        outcome = await executeVideoJob(job, job.probe, onProgress, onLog, controller.signal)
      } else if (job.category === 'pdf' && job.probe.kind === 'pdf') {
        outcome = await executePdfJob(job, job.probe, onProgress, onLog, controller.signal)
      } else if (job.category === 'archive' && job.probe.kind === 'archive') {
        outcome = await executeArchiveJob(job, job.probe, onProgress, onLog, controller.signal)
      } else {
        outcome = { status: 'unsupported', reason: 'Loại tác vụ không khớp với dữ liệu probe.' }
      }

      job.status = outcome.status
      job.statusReason = outcome.reason
      job.result = outcome.result
      job.progress = undefined
      job.finishedAt = new Date().toISOString()

      // Save to history if completed/finished
      if (
        [
          'completed',
          'no_savings',
          'converted_not_smaller',
          'target_unmet',
          'failed',
          'cancelled'
        ].includes(job.status)
      ) {
        this.store.appendHistory(job)
      }
    } catch (err) {
      job.status = controller.signal.aborted ? 'cancelled' : 'failed'
      job.statusReason = controller.signal.aborted
        ? 'Đã hủy tiến trình theo yêu cầu.'
        : `Lỗi thực thi: ${(err as Error).message}`
      job.progress = undefined
      job.finishedAt = new Date().toISOString()
      this.store.appendHistory(job)
    } finally {
      this.activeControllers.delete(job.id)
      this.runningCounts[cat] = Math.max(0, this.runningCounts[cat] - 1)
      this.notifyAndPersist()
      this.pumpQueue()
    }
  }
}

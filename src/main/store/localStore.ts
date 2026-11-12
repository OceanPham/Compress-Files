import fs from 'node:fs'
import path from 'node:path'
import {
  AppSettings,
  CompressionJob,
  UserPreset
} from '../../shared/types'
import {
  BUILTIN_PRESETS,
  cloneConfig,
  DEFAULT_APP_SETTINGS,
  sanitizeJobConfig
} from '../../shared/presets'

export interface PersistedStoreData {
  schemaVersion: number
  settings: AppSettings
  customPresets: UserPreset[]
  activeQueue: CompressionJob[]
  history: CompressionJob[]
}

export class LocalStore {
  private readonly storePath: string
  private data: PersistedStoreData
  private writeChain: Promise<void> = Promise.resolve()

  constructor(storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true })
    this.storePath = path.join(storageDir, 'file-compressor-state-v1.json')
    this.data = this.loadAndMigrate()
  }

  private loadAndMigrate(): PersistedStoreData {
    const initial: PersistedStoreData = {
      schemaVersion: 1,
      settings: JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS)),
      customPresets: [],
      activeQueue: [],
      history: []
    }

    if (!fs.existsSync(this.storePath)) {
      return initial
    }

    try {
      const rawText = fs.readFileSync(this.storePath, 'utf8')
      const parsed = JSON.parse(rawText) as Partial<PersistedStoreData>

      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...(parsed.settings || {}),
        schemaVersion: 1,
        defaultConfig: sanitizeJobConfig(
          parsed.settings?.defaultConfig || DEFAULT_APP_SETTINGS.defaultConfig
        )
      }

      const customPresets: UserPreset[] = Array.isArray(parsed.customPresets)
        ? parsed.customPresets.map((p) => ({
            ...p,
            isBuiltIn: false,
            config: sanitizeJobConfig(p.config)
          }))
        : []

      // Crash recovery: any job left in running/probing/validating from a previous session becomes 'interrupted'
      const activeQueue: CompressionJob[] = Array.isArray(parsed.activeQueue)
        ? parsed.activeQueue.map((j) => {
            if (['running', 'probing', 'validating'].includes(j.status)) {
              return {
                ...j,
                status: 'interrupted' as const,
                statusReason:
                  'Tiến trình bị gián đoạn do ứng dụng đóng đột ngột ở phiên trước. Nhấn "Thử lại" để chạy lại từ đầu.',
                progress: undefined,
                finishedAt: new Date().toISOString()
              }
            }
            return j
          })
        : []

      const history: CompressionJob[] = Array.isArray(parsed.history)
        ? parsed.history.slice(0, settings.maxHistoryItems)
        : []

      return {
        schemaVersion: 1,
        settings,
        customPresets,
        activeQueue,
        history
      }
    } catch {
      // Backup corrupted file and start fresh
      try {
        fs.copyFileSync(this.storePath, `${this.storePath}.corrupt.${Date.now()}.bak`)
      } catch {
        // ignore
      }
      return initial
    }
  }

  private scheduleSave(): void {
    const snapshot = JSON.stringify(this.data, null, 2)
    this.writeChain = this.writeChain
      .then(async () => {
        const tmpPath = `${this.storePath}.${process.pid}.tmp`
        await fs.promises.writeFile(tmpPath, snapshot, 'utf8')
        await fs.promises.rename(tmpPath, this.storePath)
      })
      .catch(() => {
        // ignore background write error
      })
  }

  public async flush(): Promise<void> {
    this.scheduleSave()
    await this.writeChain
  }

  public getSettings(): AppSettings {
    return JSON.parse(JSON.stringify(this.data.settings))
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    const merged: AppSettings = {
      ...this.data.settings,
      ...partial,
      schemaVersion: 1
    }
    if (partial.defaultConfig) {
      merged.defaultConfig = sanitizeJobConfig(partial.defaultConfig)
    }
    merged.maxConcurrentImages = Math.max(1, Math.min(8, Number(merged.maxConcurrentImages) || 3))
    merged.maxConcurrentVideos = Math.max(1, Math.min(4, Number(merged.maxConcurrentVideos) || 1))
    merged.maxConcurrentPdfs = Math.max(1, Math.min(6, Number(merged.maxConcurrentPdfs) || 2))
    merged.maxConcurrentArchives = Math.max(1, Math.min(2, Number(merged.maxConcurrentArchives) || 1))
    merged.maxHistoryItems = Math.max(20, Math.min(1000, Number(merged.maxHistoryItems) || 300))

    this.data.settings = merged
    this.scheduleSave()
    return this.getSettings()
  }

  public getAllPresets(): UserPreset[] {
    return [...BUILTIN_PRESETS, ...this.data.customPresets].map((p) => ({
      ...p,
      config: cloneConfig(p.config)
    }))
  }

  public saveCustomPreset(preset: {
    id?: string
    name: string
    description: string
    baseTier: UserPreset['baseTier']
    config: UserPreset['config']
  }): UserPreset[] {
    const cleanName = (preset.name || 'Preset tùy chỉnh').trim().slice(0, 60)
    const now = new Date().toISOString()
    const existingIdx = preset.id
      ? this.data.customPresets.findIndex((p) => p.id === preset.id)
      : -1

    if (existingIdx >= 0) {
      this.data.customPresets[existingIdx] = {
        ...this.data.customPresets[existingIdx],
        name: cleanName,
        description: (preset.description || '').trim().slice(0, 160),
        baseTier: preset.baseTier,
        config: sanitizeJobConfig(preset.config),
        updatedAt: now
      }
    } else {
      const newPreset: UserPreset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        description: (preset.description || 'Cấu hình cá nhân hóa').trim().slice(0, 160),
        isBuiltIn: false,
        baseTier: preset.baseTier,
        config: sanitizeJobConfig(preset.config),
        updatedAt: now
      }
      this.data.customPresets.push(newPreset)
    }

    this.scheduleSave()
    return this.getAllPresets()
  }

  public deleteCustomPreset(id: string): UserPreset[] {
    this.data.customPresets = this.data.customPresets.filter((p) => p.id !== id)
    this.scheduleSave()
    return this.getAllPresets()
  }

  public resetDefaultPresets(): UserPreset[] {
    this.data.customPresets = []
    this.data.settings.defaultConfig = cloneConfig(BUILTIN_PRESETS[1].config)
    this.scheduleSave()
    return this.getAllPresets()
  }

  public getActiveQueue(): CompressionJob[] {
    return JSON.parse(JSON.stringify(this.data.activeQueue))
  }

  public setActiveQueue(jobs: CompressionJob[]): void {
    this.data.activeQueue = jobs
    this.scheduleSave()
  }

  public getHistory(): CompressionJob[] {
    // Also check if output paths still exist on disk when returning history
    return this.data.history.map((item) => {
      const copy: CompressionJob = JSON.parse(JSON.stringify(item))
      if (copy.result?.outputPath && !fs.existsSync(copy.result.outputPath)) {
        copy.result.warningMessage = 'File kết quả đã bị di chuyển hoặc xóa khỏi vị trí ban đầu.'
      }
      return copy
    })
  }

  public appendHistory(job: CompressionJob): void {
    const copy: CompressionJob = JSON.parse(JSON.stringify(job))
    // Keep logs compact in history
    copy.logs = (copy.logs || []).slice(-30)
    this.data.history = [
      copy,
      ...this.data.history.filter((h) => h.id !== copy.id)
    ].slice(0, this.data.settings.maxHistoryItems)
    this.scheduleSave()
  }

  public removeHistoryItem(jobId: string): CompressionJob[] {
    this.data.history = this.data.history.filter((h) => h.id !== jobId)
    this.scheduleSave()
    return this.getHistory()
  }

  public clearHistory(): CompressionJob[] {
    this.data.history = []
    this.scheduleSave()
    return []
  }
}

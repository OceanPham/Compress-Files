import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppSettings,
  CapabilityMatrix,
  CompressionJob,
  ImagePreviewRequest,
  ImagePreviewResponse,
  ImportBatchResponse,
  JobConfigSnapshot,
  UserPreset
} from '../shared/types'

export interface QueueStatePayload {
  jobs: CompressionJob[]
  isRunning: boolean
  isPaused: boolean
}

export interface InitDataPayload {
  appVersion: string
  settings: AppSettings
  presets: UserPreset[]
  queueState: QueueStatePayload
  history: CompressionJob[]
  capabilities: CapabilityMatrix
}

const compressorApi = {
  getInitData: (): Promise<InitDataPayload> => ipcRenderer.invoke('app:getInitData'),

  getPathForDroppedFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return (file as unknown as { path?: string }).path || ''
    }
  },

  pickFiles: (mode: 'media' | 'any' = 'media'): Promise<string[]> =>
    ipcRenderer.invoke('dialog:pickFiles', { mode }),

  pickFolders: (): Promise<string[]> => ipcRenderer.invoke('dialog:pickFolders'),

  pickOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:pickOutputFolder'),

  importMedia: (paths: string[], config?: JobConfigSnapshot): Promise<ImportBatchResponse> =>
    ipcRenderer.invoke('queue:importMedia', { paths, config }),

  createArchiveJob: (paths: string[], config?: JobConfigSnapshot): Promise<ImportBatchResponse> =>
    ipcRenderer.invoke('queue:createArchiveJob', { paths, config }),

  updateQueueConfig: (
    targetScope: 'all_pending' | string[],
    config: JobConfigSnapshot
  ): Promise<QueueStatePayload> =>
    ipcRenderer.invoke('queue:updateConfig', { targetScope, config }),

  startQueue: (): Promise<QueueStatePayload> => ipcRenderer.invoke('queue:start'),
  pauseQueue: (): Promise<QueueStatePayload> => ipcRenderer.invoke('queue:pause'),
  resumeQueue: (): Promise<QueueStatePayload> => ipcRenderer.invoke('queue:resume'),
  cancelJob: (jobId: string): Promise<QueueStatePayload> =>
    ipcRenderer.invoke('queue:cancelJob', jobId),
  cancelAll: (): Promise<QueueStatePayload> => ipcRenderer.invoke('queue:cancelAll'),
  retryJob: (jobId: string): Promise<QueueStatePayload> =>
    ipcRenderer.invoke('queue:retryJob', jobId),
  removeJob: (jobId: string): Promise<QueueStatePayload> =>
    ipcRenderer.invoke('queue:removeJob', jobId),
  clearFinished: (): Promise<QueueStatePayload> =>
    ipcRenderer.invoke('queue:clearFinished'),

  onQueueStateChanged: (callback: (state: QueueStatePayload) => void): (() => void) => {
    const handler = (_event: unknown, state: QueueStatePayload): void => {
      callback(state)
    }
    ipcRenderer.on('queue:stateChanged', handler)
    return () => {
      ipcRenderer.removeListener('queue:stateChanged', handler)
    }
  },

  previewImage: (req: ImagePreviewRequest): Promise<ImagePreviewResponse> =>
    ipcRenderer.invoke('image:preview', req),

  savePreset: (preset: {
    id?: string
    name: string
    description?: string
    baseTier?: UserPreset['baseTier']
    config: JobConfigSnapshot
  }): Promise<UserPreset[]> => ipcRenderer.invoke('presets:save', preset),

  deletePreset: (id: string): Promise<UserPreset[]> =>
    ipcRenderer.invoke('presets:delete', id),

  resetDefaultPresets: (): Promise<UserPreset[]> =>
    ipcRenderer.invoke('presets:resetDefaults'),

  updateSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:update', partial),

  getHistory: (): Promise<CompressionJob[]> => ipcRenderer.invoke('history:get'),
  removeHistoryItem: (jobId: string): Promise<CompressionJob[]> =>
    ipcRenderer.invoke('history:remove', jobId),
  clearHistory: (): Promise<CompressionJob[]> => ipcRenderer.invoke('history:clear'),
  rerunHistoryJob: (job: {
    category: string
    sourcePaths: string[]
    configSnapshot: JobConfigSnapshot
  }): Promise<ImportBatchResponse> => ipcRenderer.invoke('history:rerun', job),

  openFile: (targetPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('shell:openFile', targetPath),

  showInFolder: (targetPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('shell:showInFolder', targetPath)
}

contextBridge.exposeInMainWorld('compressorApi', compressorApi)

export type CompressorApiType = typeof compressorApi


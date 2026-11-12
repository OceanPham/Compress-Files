import fs from 'node:fs'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
  Menu,
  nativeImage,
  session,
  shell,
  Tray
} from 'electron'
import { LocalStore } from './store/localStore'
import { QueueManager, QueueStateBroadcast } from './queue/queueManager'
import { probeCapabilities } from './utils/binaries'
import { generateImagePreview } from './engines/imageAdapter'
import {
  AppSettings,
  ImagePreviewRequest,
  JobConfigSnapshot,
  UserPreset
} from '../shared/types'
import { sanitizeJobConfig } from '../shared/presets'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let store: LocalStore
let queueManager: QueueManager
let activePreviewController: AbortController | null = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function getAppIconPath(): string {
  const packagedIcon = path.join(process.resourcesPath, '..', 'resources', 'icon.png')
  if (fs.existsSync(packagedIcon)) return packagedIcon
  const devIcon = path.join(process.cwd(), 'build', 'icon.ico')
  if (fs.existsSync(devIcon)) return devIcon
  return path.join(process.cwd(), 'resources', 'icon.png')
}

function validateIpcSender(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) {
    throw new Error('Từ chối lời gọi IPC từ nguồn không hợp lệ.')
  }
}

function ensureTray(): void {
  if (tray) return
  try {
    const iconPath = getAppIconPath()
    const img = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createEmpty()
    tray = new Tray(img)
    tray.setToolTip('File Compressor — Đang chạy nền')
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mở File Compressor',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Hủy tác vụ và Thoát',
        click: async () => {
          isQuitting = true
          await queueManager.cancelAll()
          await store.flush()
          app.quit()
        }
      }
    ])
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })
  } catch {
    // ignore tray failure
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    show: false,
    title: 'File Compressor',
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })

  mainWindow.on('close', async (e) => {
    if (isQuitting || !queueManager.hasRunningJobs()) {
      return
    }

    e.preventDefault()
    const settings = store.getSettings()

    if (settings.closeBehavior === 'minimize_to_tray') {
      ensureTray()
      mainWindow?.hide()
      return
    }

    if (settings.closeBehavior === 'cancel_and_quit') {
      isQuitting = true
      await queueManager.cancelAll()
      await store.flush()
      app.quit()
      return
    }

    const choice = await dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      title: 'Đang có tác vụ nén đang chạy',
      message: 'Hiện đang có file đang được xử lý trong hàng đợi.',
      detail:
        'Bạn muốn thu nhỏ ứng dụng để tiếp tục chạy nền cho tới khi xong, hay hủy các tiến trình đang chạy và thoát hẳn?',
      buttons: [
        'Chạy nền (Thu xuống khay hệ thống)',
        'Hủy tiến trình và Thoát',
        'Ở lại ứng dụng'
      ],
      defaultId: 0,
      cancelId: 2
    })

    if (choice.response === 0) {
      ensureTray()
      mainWindow?.hide()
    } else if (choice.response === 1) {
      isQuitting = true
      await queueManager.cancelAll()
      await store.flush()
      app.quit()
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('app:getInitData', async (e) => {
    validateIpcSender(e)
    const capabilities = await probeCapabilities()
    return {
      appVersion: app.getVersion(),
      settings: store.getSettings(),
      presets: store.getAllPresets(),
      queueState: queueManager.getState(),
      history: store.getHistory(),
      capabilities
    }
  })

  ipcMain.handle('dialog:pickFiles', async (e, options?: { mode?: 'media' | 'any' }) => {
    validateIpcSender(e)
    if (!mainWindow) return []
    const filters =
      options?.mode === 'any'
        ? [{ name: 'Tất cả các file', extensions: ['*'] }]
        : [
            {
              name: 'Media & PDF hỗ trợ (Ảnh, Video, PDF)',
              extensions: [
                'jpg',
                'jpeg',
                'png',
                'webp',
                'avif',
                'mp4',
                'mov',
                'mkv',
                'webm',
                'pdf'
              ]
            },
            { name: 'Ảnh tĩnh (JPEG, PNG, WebP, AVIF)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
            { name: 'Video (MP4, MOV, MKV, WebM)', extensions: ['mp4', 'mov', 'mkv', 'webm'] },
            { name: 'Tài liệu PDF', extensions: ['pdf'] },
            { name: 'Tất cả file (kiểm tra định dạng)', extensions: ['*'] }
          ]

    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn file cần nén',
      properties: ['openFile', 'multiSelections'],
      filters
    })
    return res.canceled ? [] : res.filePaths
  })

  ipcMain.handle('dialog:pickFolders', async (e) => {
    validateIpcSender(e)
    if (!mainWindow) return []
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục',
      properties: ['openDirectory', 'multiSelections']
    })
    return res.canceled ? [] : res.filePaths
  })

  ipcMain.handle('dialog:pickOutputFolder', async (e) => {
    validateIpcSender(e)
    if (!mainWindow) return null
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục xuất kết quả',
      properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle(
    'queue:importMedia',
    async (e, payload: { paths: string[]; config?: JobConfigSnapshot }) => {
      validateIpcSender(e)
      if (!payload || !Array.isArray(payload.paths)) {
        throw new Error('Danh sách đường dẫn không hợp lệ.')
      }
      const cleanPaths = payload.paths.filter((p) => typeof p === 'string' && p.trim().length > 0)
      return queueManager.importMediaPaths(cleanPaths, payload.config)
    }
  )

  ipcMain.handle(
    'queue:createArchiveJob',
    async (e, payload: { paths: string[]; config?: JobConfigSnapshot }) => {
      validateIpcSender(e)
      if (!payload || !Array.isArray(payload.paths)) {
        throw new Error('Danh sách đường dẫn không hợp lệ.')
      }
      const cleanPaths = payload.paths.filter((p) => typeof p === 'string' && p.trim().length > 0)
      return queueManager.createArchiveJob(cleanPaths, payload.config)
    }
  )

  ipcMain.handle(
    'queue:updateConfig',
    async (
      e,
      payload: { targetScope: 'all_pending' | string[]; config: JobConfigSnapshot }
    ) => {
      validateIpcSender(e)
      return queueManager.updateJobsConfig(payload.targetScope, payload.config)
    }
  )

  ipcMain.handle('queue:start', async (e) => {
    validateIpcSender(e)
    return queueManager.startQueue()
  })

  ipcMain.handle('queue:pause', async (e) => {
    validateIpcSender(e)
    return queueManager.pauseQueue()
  })

  ipcMain.handle('queue:resume', async (e) => {
    validateIpcSender(e)
    return queueManager.resumeQueue()
  })

  ipcMain.handle('queue:cancelJob', async (e, jobId: string) => {
    validateIpcSender(e)
    if (typeof jobId !== 'string') throw new Error('jobId không hợp lệ')
    return queueManager.cancelJob(jobId)
  })

  ipcMain.handle('queue:cancelAll', async (e) => {
    validateIpcSender(e)
    return queueManager.cancelAll()
  })

  ipcMain.handle('queue:retryJob', async (e, jobId: string) => {
    validateIpcSender(e)
    if (typeof jobId !== 'string') throw new Error('jobId không hợp lệ')
    return queueManager.retryJob(jobId)
  })

  ipcMain.handle('queue:removeJob', async (e, jobId: string) => {
    validateIpcSender(e)
    if (typeof jobId !== 'string') throw new Error('jobId không hợp lệ')
    return queueManager.removeJob(jobId)
  })

  ipcMain.handle('queue:clearFinished', async (e) => {
    validateIpcSender(e)
    return queueManager.clearFinishedJobs()
  })

  ipcMain.handle('image:preview', async (e, req: ImagePreviewRequest) => {
    validateIpcSender(e)
    if (!req || typeof req.sourcePath !== 'string' || !fs.existsSync(req.sourcePath)) {
      throw new Error('Đường dẫn ảnh xem trước không tồn tại.')
    }
    if (activePreviewController) {
      activePreviewController.abort()
    }
    const controller = new AbortController()
    activePreviewController = controller
    const sanitized = sanitizeJobConfig({
      ...store.getSettings().defaultConfig,
      image: req.config
    }).image
    return generateImagePreview({ sourcePath: req.sourcePath, config: sanitized }, controller.signal)
  })

  ipcMain.handle('presets:save', async (e, preset: Partial<UserPreset> & { name: string; config: JobConfigSnapshot }) => {
    validateIpcSender(e)
    return store.saveCustomPreset({
      id: preset.id,
      name: preset.name,
      description: preset.description || '',
      baseTier: preset.baseTier || 'custom',
      config: preset.config
    })
  })

  ipcMain.handle('presets:delete', async (e, id: string) => {
    validateIpcSender(e)
    if (typeof id !== 'string') throw new Error('id không hợp lệ')
    return store.deleteCustomPreset(id)
  })

  ipcMain.handle('presets:resetDefaults', async (e) => {
    validateIpcSender(e)
    return store.resetDefaultPresets()
  })

  ipcMain.handle('settings:update', async (e, partial: Partial<AppSettings>) => {
    validateIpcSender(e)
    return store.updateSettings(partial)
  })

  ipcMain.handle('history:get', async (e) => {
    validateIpcSender(e)
    return store.getHistory()
  })

  ipcMain.handle('history:remove', async (e, jobId: string) => {
    validateIpcSender(e)
    return store.removeHistoryItem(jobId)
  })

  ipcMain.handle('history:clear', async (e) => {
    validateIpcSender(e)
    return store.clearHistory()
  })

  ipcMain.handle('history:rerun', async (e, job: { category: string; sourcePaths: string[]; configSnapshot: JobConfigSnapshot }) => {
    validateIpcSender(e)
    const missing = (job.sourcePaths || []).filter((p) => !fs.existsSync(p))
    if (missing.length > 0) {
      throw new Error(`Không thể chạy lại vì file nguồn đã bị xóa hoặc di chuyển: ${missing[0]}`)
    }
    if (job.category === 'archive') {
      const res = await queueManager.createArchiveJob(job.sourcePaths, job.configSnapshot)
      queueManager.startQueue()
      return res
    }
    const res = await queueManager.importMediaPaths(job.sourcePaths, job.configSnapshot)
    queueManager.startQueue()
    return res
  })

  ipcMain.handle('shell:openFile', async (e, targetPath: string) => {
    validateIpcSender(e)
    if (typeof targetPath !== 'string' || !fs.existsSync(targetPath)) {
      return { ok: false, error: 'File không còn tồn tại ở đường dẫn này (đã bị di chuyển hoặc xóa).' }
    }
    const errMsg = await shell.openPath(path.resolve(targetPath))
    return errMsg ? { ok: false, error: errMsg } : { ok: true }
  })

  ipcMain.handle('shell:showInFolder', async (e, targetPath: string) => {
    validateIpcSender(e)
    if (typeof targetPath !== 'string' || !fs.existsSync(targetPath)) {
      return { ok: false, error: 'Đường dẫn không còn tồn tại trên ổ đĩa.' }
    }
    shell.showItemInFolder(path.resolve(targetPath))
    return { ok: true }
  })
}

app.whenReady().then(() => {
  // Set strict Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';"
        ]
      }
    })
  })

  store = new LocalStore(app.getPath('userData'))
  queueManager = new QueueManager(store, (state: QueueStateBroadcast) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('queue:stateChanged', state)
    }
    // If running in background tray and all jobs finished, update tray tooltip
    if (tray && !state.isRunning) {
      tray.setToolTip('File Compressor — Đã hoàn tất hàng đợi')
    }
  })

  registerIpcHandlers()
  createMainWindow()
})

app.on('before-quit', async () => {
  isQuitting = true
  if (store) {
    await store.flush()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

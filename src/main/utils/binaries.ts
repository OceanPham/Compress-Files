import fs from 'node:fs'
import path from 'node:path'
import { spawn, execFileSync, ChildProcess } from 'node:child_process'
import sharp from 'sharp'
import { CapabilityMatrix } from '../../shared/types'

export function getBundledBinDir(): string {
  // In packaged Electron app, extraResources copies resources/bin/win32-x64 -> <resourcesPath>/bin
  const isPackaged =
    typeof process.resourcesPath === 'string' &&
    fs.existsSync(path.join(process.resourcesPath, 'bin'))

  if (isPackaged) {
    return path.join(process.resourcesPath, 'bin')
  }

  return path.join(process.cwd(), 'resources', 'bin', 'win32-x64')
}

export function getBinaryPath(name: 'ffmpeg' | 'ffprobe' | 'qpdf' | '7za'): string {
  const exeName = `${name}.exe`
  const bundledPath = path.join(getBundledBinDir(), exeName)
  if (fs.existsSync(bundledPath)) {
    return bundledPath
  }
  throw new Error(`Không tìm thấy công cụ thực thi đóng gói: ${bundledPath}`)
}

export function killProcessTree(proc: ChildProcess | null | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || !proc.pid || proc.exitCode !== null) {
      resolve()
      return
    }
    const pid = proc.pid
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore'
      })
      killer.on('close', () => resolve())
      killer.on('error', () => {
        try {
          proc.kill('SIGKILL')
        } catch {
          // ignore
        }
        resolve()
      })
    } else {
      try {
        proc.kill('SIGKILL')
      } catch {
        // ignore
      }
      resolve()
    }
  })
}

export interface ManagedProcessOptions {
  exePath: string
  args: string[]
  cwd?: string
  timeoutMs?: number
  onStdoutLine?: (line: string) => void
  onStderrLine?: (line: string) => void
  signal?: AbortSignal
}

export interface ManagedProcessResult {
  exitCode: number
  stdoutTail: string[]
  stderrTail: string[]
  cancelled: boolean
  timedOut: boolean
}

const MAX_LOG_LINES = 150

export function runManagedProcess(options: ManagedProcessOptions): Promise<ManagedProcessResult> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      resolve({
        exitCode: -1,
        stdoutTail: [],
        stderrTail: ['Cancelled before start'],
        cancelled: true,
        timedOut: false
      })
      return
    }

    const stdoutTail: string[] = []
    const stderrTail: string[] = []
    let stdoutRemainder = ''
    let stderrRemainder = ''
    let cancelled = false
    let timedOut = false
    let settled = false

    const child = spawn(options.exePath, options.args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const pushLine = (arr: string[], line: string, cb?: (l: string) => void): void => {
      const trimmed = line.trim()
      if (!trimmed) return
      if (arr.length >= MAX_LOG_LINES) {
        arr.shift()
      }
      arr.push(trimmed)
      cb?.(trimmed)
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutRemainder += chunk.toString('utf8')
      const lines = stdoutRemainder.split(/\r?\n|\r/)
      stdoutRemainder = lines.pop() ?? ''
      for (const l of lines) {
        pushLine(stdoutTail, l, options.onStdoutLine)
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrRemainder += chunk.toString('utf8')
      const lines = stderrRemainder.split(/\r?\n|\r/)
      stderrRemainder = lines.pop() ?? ''
      for (const l of lines) {
        pushLine(stderrTail, l, options.onStderrLine)
      }
    })

    let timeoutHandle: NodeJS.Timeout | null = null
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true
        void killProcessTree(child)
      }, options.timeoutMs)
    }

    const onAbort = (): void => {
      cancelled = true
      void killProcessTree(child)
    }

    options.signal?.addEventListener('abort', onAbort, { once: true })

    child.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      options.signal?.removeEventListener('abort', onAbort)
      if (!settled) {
        settled = true
        reject(err)
      }
    })

    child.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      options.signal?.removeEventListener('abort', onAbort)
      if (stdoutRemainder.trim()) {
        pushLine(stdoutTail, stdoutRemainder, options.onStdoutLine)
      }
      if (stderrRemainder.trim()) {
        pushLine(stderrTail, stderrRemainder, options.onStderrLine)
      }
      if (!settled) {
        settled = true
        resolve({
          exitCode: code ?? -1,
          stdoutTail,
          stderrTail,
          cancelled,
          timedOut
        })
      }
    })
  })
}

let cachedCapabilities: CapabilityMatrix | null = null

export async function probeCapabilities(forceRefresh = false): Promise<CapabilityMatrix> {
  if (cachedCapabilities && !forceRefresh) {
    return cachedCapabilities
  }

  const sharpVer = sharp.versions.sharp || 'unknown'
  const vipsVer = sharp.versions.vips || 'unknown'
  const avifSupported = Boolean(sharp.format.heif?.output?.file || sharp.format.heif?.output?.buffer)
  const webpSupported = Boolean(sharp.format.webp?.output?.file || sharp.format.webp?.output?.buffer)

  let ffmpegAvailable = false
  let ffmpegVersion = 'N/A'
  let ffprobeAvailable = false
  const h264Encoders: string[] = []
  const hardwareH264Encoders: string[] = []
  const aacEncoders: string[] = []

  try {
    const ffmpegPath = getBinaryPath('ffmpeg')
    const verOut = execFileSync(ffmpegPath, ['-version'], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true
    })
    ffmpegAvailable = true
    ffmpegVersion = verOut.split(/\r?\n/)[0]?.trim() || 'Available'

    const encOut = execFileSync(ffmpegPath, ['-hide_banner', '-encoders'], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true
    })
    if (encOut.includes('libx264')) h264Encoders.push('libx264')
    for (const hw of ['h264_nvenc', 'h264_qsv', 'h264_amf']) {
      if (encOut.includes(hw)) {
        hardwareH264Encoders.push(hw)
      }
    }
    if (encOut.includes(' aac ')) aacEncoders.push('aac')
  } catch {
    ffmpegAvailable = false
  }

  try {
    const ffprobePath = getBinaryPath('ffprobe')
    execFileSync(ffprobePath, ['-version'], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true
    })
    ffprobeAvailable = true
  } catch {
    ffprobeAvailable = false
  }

  let qpdfAvailable = false
  let qpdfVersion = 'N/A'
  try {
    const qpdfPath = getBinaryPath('qpdf')
    const out = execFileSync(qpdfPath, ['--version'], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true
    })
    qpdfAvailable = true
    qpdfVersion = out.split(/\r?\n/)[0]?.trim() || 'Available'
  } catch {
    qpdfAvailable = false
  }

  let sevenZipAvailable = false
  let sevenZipVersion = 'N/A'
  try {
    const sevenPath = getBinaryPath('7za')
    const out = execFileSync(sevenPath, ['i'], {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true
    })
    sevenZipAvailable = true
    const firstNonEmpty = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s.startsWith('7-Zip'))
    sevenZipVersion = firstNonEmpty || '7-Zip (7za)'
  } catch {
    sevenZipAvailable = false
  }

  cachedCapabilities = {
    sharpVersion: sharpVer,
    libvipsVersion: vipsVer,
    avifSupported,
    webpSupported,
    ffmpegAvailable,
    ffmpegVersion,
    ffprobeAvailable,
    h264Encoders,
    hardwareH264Encoders,
    aacEncoders,
    qpdfAvailable,
    qpdfVersion,
    sevenZipAvailable,
    sevenZipVersion
  }

  return cachedCapabilities
}


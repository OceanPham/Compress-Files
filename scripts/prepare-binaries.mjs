import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const binDir = path.join(rootDir, 'resources', 'bin', 'win32-x64')
const noticesDir = path.join(rootDir, 'resources', 'notices')

fs.mkdirSync(binDir, { recursive: true })
fs.mkdirSync(noticesDir, { recursive: true })

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

async function ensure7za() {
  const sevenBin = require('7zip-bin')
  let src7za = sevenBin.path7za
  const winX64Candidate = path.join(
    rootDir,
    'node_modules',
    '7zip-bin',
    'win',
    'x64',
    '7za.exe'
  )
  if (fs.existsSync(winX64Candidate)) {
    src7za = winX64Candidate
  }
  const dest = path.join(binDir, '7za.exe')
  fs.copyFileSync(src7za, dest)
  console.log('[prepare-binaries] Copied 7za.exe ->', dest)
  return dest
}

async function ensureFfmpegAndFfprobe() {
  const destFfmpeg = path.join(binDir, 'ffmpeg.exe')
  const destFfprobe = path.join(binDir, 'ffprobe.exe')

  let ffmpegSrc = null
  try {
    const ffmpegStatic = require('ffmpeg-static')
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      ffmpegSrc = ffmpegStatic
    }
  } catch {
    // ignore
  }
  if (!ffmpegSrc) {
    const wingetCandidate =
      'C:\\Users\\PC BUG\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe'
    if (fs.existsSync(wingetCandidate)) ffmpegSrc = wingetCandidate
  }
  if (!ffmpegSrc) {
    throw new Error('Could not locate ffmpeg.exe')
  }
  if (!fs.existsSync(destFfmpeg)) {
    fs.copyFileSync(ffmpegSrc, destFfmpeg)
  }
  console.log('[prepare-binaries] Ready ffmpeg.exe ->', destFfmpeg)

  let ffprobeSrc = null
  try {
    const ffprobeStatic = require('ffprobe-static')
    if (ffprobeStatic?.path && fs.existsSync(ffprobeStatic.path)) {
      ffprobeSrc = ffprobeStatic.path
    }
  } catch {
    // ignore
  }
  if (!ffprobeSrc) {
    const wingetProbe =
      'C:\\Users\\PC BUG\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe'
    if (fs.existsSync(wingetProbe)) ffprobeSrc = wingetProbe
  }
  if (!ffprobeSrc) {
    throw new Error('Could not locate ffprobe.exe')
  }
  if (!fs.existsSync(destFfprobe)) {
    fs.copyFileSync(ffprobeSrc, destFfprobe)
  }
  console.log('[prepare-binaries] Ready ffprobe.exe ->', destFfprobe)
  return { destFfmpeg, destFfprobe, ffmpegSrc, ffprobeSrc }
}

async function ensureQpdf(sevenZaPath) {
  const destQpdf = path.join(binDir, 'qpdf.exe')
  if (fs.existsSync(destQpdf)) {
    console.log('[prepare-binaries] qpdf.exe already present ->', destQpdf)
    return { destQpdf, releaseUrl: 'https://github.com/qpdf/qpdf/releases' }
  }

  console.log('[prepare-binaries] Fetching latest qpdf Windows x64 release from GitHub...')
  const res = await fetch('https://api.github.com/repos/qpdf/qpdf/releases/latest', {
    headers: {
      'User-Agent': 'FileCompressor-BuildScript'
    }
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch qpdf releases: HTTP ${res.status}`)
  }
  const release = await res.json()
  const asset =
    release.assets.find((a) => a.name.endsWith('msvc64.zip')) ||
    release.assets.find((a) => a.name.endsWith('mingw64.zip'))
  if (!asset) {
    throw new Error('Could not find msvc64.zip or mingw64.zip in qpdf latest release')
  }

  const tmpZip = path.join(rootDir, 'resources', 'qpdf-win64.zip')
  const tmpExtract = path.join(rootDir, 'resources', 'qpdf-extract')
  console.log(`[prepare-binaries] Downloading ${asset.name} (${asset.browser_download_url})...`)
  const zipRes = await fetch(asset.browser_download_url)
  if (!zipRes.ok) {
    throw new Error(`Failed to download ${asset.name}: HTTP ${zipRes.status}`)
  }
  const arrayBuf = await zipRes.arrayBuffer()
  fs.writeFileSync(tmpZip, Buffer.from(arrayBuf))

  fs.rmSync(tmpExtract, { recursive: true, force: true })
  fs.mkdirSync(tmpExtract, { recursive: true })

  execFileSync(sevenZaPath, ['x', tmpZip, `-o${tmpExtract}`, '-y'], { stdio: 'ignore' })

  // Find bin directory inside extracted folder
  const topDirs = fs.readdirSync(tmpExtract)
  const extractedRoot =
    topDirs.length === 1 ? path.join(tmpExtract, topDirs[0]) : tmpExtract
  const extractedBin = path.join(extractedRoot, 'bin')
  if (!fs.existsSync(extractedBin)) {
    throw new Error('Extracted qpdf archive does not contain a bin directory')
  }

  for (const file of fs.readdirSync(extractedBin)) {
    if (file.endsWith('.exe') || file.endsWith('.dll')) {
      fs.copyFileSync(path.join(extractedBin, file), path.join(binDir, file))
    }
  }

  fs.rmSync(tmpZip, { force: true })
  fs.rmSync(tmpExtract, { recursive: true, force: true })

  console.log('[prepare-binaries] Extracted qpdf.exe and runtime DLLs to', binDir)
  return { destQpdf, releaseUrl: asset.browser_download_url, releaseTag: release.tag_name }
}

function getBinaryVersion(exePath, args) {
  try {
    const out = execFileSync(exePath, args, { encoding: 'utf8', timeout: 10000 })
    return out.split(/\r?\n/).slice(0, 2).join(' | ').trim()
  } catch (err) {
    return String(err.message || 'unknown')
  }
}

async function ensureWinCodeSignCache(sevenZaPath) {
  if (process.platform !== 'win32') return
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return
  const cacheDir = path.join(
    localAppData,
    'electron-builder',
    'Cache',
    'winCodeSign',
    'winCodeSign-2.6.0'
  )
  if (fs.existsSync(path.join(cacheDir, 'rcedit-x64.exe'))) {
    return
  }
  try {
    fs.mkdirSync(cacheDir, { recursive: true })
    const res = await fetch(
      'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z'
    )
    if (!res.ok) return
    const archivePath = path.join(cacheDir, '..', 'winCodeSign-2.6.0.7z')
    fs.writeFileSync(archivePath, Buffer.from(await res.arrayBuffer()))
    execFileSync(sevenZaPath, ['x', archivePath, `-o${cacheDir}`, '-xr!darwin', '-y'], {
      stdio: 'ignore'
    })
    fs.rmSync(archivePath, { force: true })
    console.log('[prepare-binaries] Prepared winCodeSign-2.6.0 cache for non-admin Windows build')
  } catch {
    // ignore
  }
}

async function main() {
  const sevenZaPath = await ensure7za()
  await ensureWinCodeSignCache(sevenZaPath)
  const { destFfmpeg, destFfprobe } = await ensureFfmpegAndFfprobe()
  const { destQpdf, releaseUrl } = await ensureQpdf(sevenZaPath)

  const manifest = {
    generatedAt: new Date().toISOString(),
    platform: 'win32-x64',
    binaries: {
      ffmpeg: {
        file: 'ffmpeg.exe',
        version: getBinaryVersion(destFfmpeg, ['-version']),
        sha256: sha256File(destFfmpeg),
        sizeBytes: fs.statSync(destFfmpeg).size,
        license: 'GPLv3 / LGPLv3 (FFmpeg Project)',
        sourceUrl: 'https://ffmpeg.org/legal.html'
      },
      ffprobe: {
        file: 'ffprobe.exe',
        version: getBinaryVersion(destFfprobe, ['-version']),
        sha256: sha256File(destFfprobe),
        sizeBytes: fs.statSync(destFfprobe).size,
        license: 'GPLv3 / LGPLv3 (FFmpeg Project)',
        sourceUrl: 'https://ffmpeg.org/legal.html'
      },
      qpdf: {
        file: 'qpdf.exe',
        version: getBinaryVersion(destQpdf, ['--version']),
        sha256: sha256File(destQpdf),
        sizeBytes: fs.statSync(destQpdf).size,
        license: 'Apache-2.0',
        sourceUrl: releaseUrl
      },
      sevenZip: {
        file: '7za.exe',
        version: getBinaryVersion(sevenZaPath, ['i']),
        sha256: sha256File(sevenZaPath),
        sizeBytes: fs.statSync(sevenZaPath).size,
        license: 'LGPL-2.1-or-later with unRAR restriction (7-Zip Standalone Console)',
        sourceUrl: 'https://www.7-zip.org/license.txt'
      }
    }
  }

  fs.writeFileSync(
    path.join(noticesDir, 'BINARY_MANIFEST.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  )

  const noticeText = `THIRD-PARTY SOFTWARE NOTICES AND LICENSES
=========================================

File Compressor bundles the following standalone command-line tools and libraries for offline local file compression on Windows x64:

1. FFmpeg & ffprobe
   - Version: ${manifest.binaries.ffmpeg.version}
   - SHA-256 (ffmpeg.exe): ${manifest.binaries.ffmpeg.sha256}
   - SHA-256 (ffprobe.exe): ${manifest.binaries.ffprobe.sha256}
   - License: GPLv3 / LGPLv3
   - Source & Legal Information: https://ffmpeg.org/legal.html

2. QPDF
   - Version: ${manifest.binaries.qpdf.version}
   - SHA-256 (qpdf.exe): ${manifest.binaries.qpdf.sha256}
   - License: Apache License 2.0
   - Source: https://github.com/qpdf/qpdf

3. 7-Zip Standalone Console (7za.exe)
   - Version: ${manifest.binaries.sevenZip.version}
   - SHA-256 (7za.exe): ${manifest.binaries.sevenZip.sha256}
   - License: GNU LGPL + BSD 3-clause
   - Source: https://www.7-zip.org/

4. Sharp & libvips
   - License: Apache License 2.0 (Sharp) / LGPL-2.1-or-later (libvips)
   - Source: https://sharp.pixelplumbing.com/
`
  fs.writeFileSync(path.join(noticesDir, 'THIRD_PARTY_NOTICES.txt'), noticeText, 'utf8')
  console.log('[prepare-binaries] All binaries verified and manifest written.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const binDir = path.join(rootDir, 'resources', 'bin', 'win32-x64')
const noticesDir = path.join(rootDir, 'resources', 'notices')

const PINNED_QPDF_VERSION = '12.4.2'
const PINNED_QPDF_TAG = `v${PINNED_QPDF_VERSION}`
const PINNED_QPDF_ZIP_NAME = `qpdf-${PINNED_QPDF_VERSION}-msvc64.zip`
const PINNED_QPDF_DOWNLOAD_URL = `https://github.com/qpdf/qpdf/releases/download/${PINNED_QPDF_TAG}/${PINNED_QPDF_ZIP_NAME}`
const PINNED_QPDF_EXE_SHA256 = '1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff'

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
  if (!ffmpegSrc && process.env.FFMPEG_BIN_PATH && fs.existsSync(process.env.FFMPEG_BIN_PATH)) {
    ffmpegSrc = process.env.FFMPEG_BIN_PATH
  }
  if (!ffmpegSrc && !fs.existsSync(destFfmpeg)) {
    throw new Error(
      'Could not locate ffmpeg.exe from ffmpeg-static or FFMPEG_BIN_PATH environment variable.'
    )
  }
  if (ffmpegSrc && !fs.existsSync(destFfmpeg)) {
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
  if (!ffprobeSrc && process.env.FFPROBE_BIN_PATH && fs.existsSync(process.env.FFPROBE_BIN_PATH)) {
    ffprobeSrc = process.env.FFPROBE_BIN_PATH
  }
  if (!ffprobeSrc && !fs.existsSync(destFfprobe)) {
    throw new Error(
      'Could not locate ffprobe.exe from ffprobe-static or FFPROBE_BIN_PATH environment variable.'
    )
  }
  if (ffprobeSrc && !fs.existsSync(destFfprobe)) {
    fs.copyFileSync(ffprobeSrc, destFfprobe)
  }
  console.log('[prepare-binaries] Ready ffprobe.exe ->', destFfprobe)
  return { destFfmpeg, destFfprobe, ffmpegSrc, ffprobeSrc }
}

async function ensureQpdf(sevenZaPath) {
  const destQpdf = path.join(binDir, 'qpdf.exe')
  if (fs.existsSync(destQpdf)) {
    const currentHash = sha256File(destQpdf)
    if (currentHash === PINNED_QPDF_EXE_SHA256) {
      console.log(
        `[prepare-binaries] Verified pinned qpdf.exe (${PINNED_QPDF_TAG}) ->`,
        destQpdf
      )
      return {
        destQpdf,
        releaseUrl: PINNED_QPDF_DOWNLOAD_URL,
        releaseTag: PINNED_QPDF_TAG
      }
    }
    console.warn(
      `[prepare-binaries] Existing qpdf.exe SHA-256 (${currentHash}) differs from pinned ${PINNED_QPDF_TAG}; re-extracting...`
    )
  }

  const tmpZip = path.join(rootDir, 'resources', 'qpdf-win64.zip')
  const tmpExtract = path.join(rootDir, 'resources', 'qpdf-extract')

  if (process.env.QPDF_WIN64_ZIP_PATH && fs.existsSync(process.env.QPDF_WIN64_ZIP_PATH)) {
    console.log(
      `[prepare-binaries] Using local QPDF archive from QPDF_WIN64_ZIP_PATH (${process.env.QPDF_WIN64_ZIP_PATH})...`
    )
    fs.copyFileSync(process.env.QPDF_WIN64_ZIP_PATH, tmpZip)
  } else {
    console.log(
      `[prepare-binaries] Downloading pinned QPDF ${PINNED_QPDF_TAG} (${PINNED_QPDF_DOWNLOAD_URL})...`
    )
    const zipRes = await fetch(PINNED_QPDF_DOWNLOAD_URL, {
      headers: {
        'User-Agent': 'FileCompressor-BuildScript'
      }
    })
    if (!zipRes.ok) {
      throw new Error(`Failed to download ${PINNED_QPDF_ZIP_NAME}: HTTP ${zipRes.status}`)
    }
    const arrayBuf = await zipRes.arrayBuffer()
    fs.writeFileSync(tmpZip, Buffer.from(arrayBuf))
  }

  fs.rmSync(tmpExtract, { recursive: true, force: true })
  fs.mkdirSync(tmpExtract, { recursive: true })

  execFileSync(sevenZaPath, ['x', tmpZip, `-o${tmpExtract}`, '-y'], { stdio: 'ignore' })

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

  const extractedSha = sha256File(destQpdf)
  if (extractedSha !== PINNED_QPDF_EXE_SHA256) {
    throw new Error(
      `SHA-256 mismatch for qpdf.exe: expected ${PINNED_QPDF_EXE_SHA256}, got ${extractedSha}`
    )
  }

  console.log('[prepare-binaries] Extracted and verified qpdf.exe and runtime DLLs to', binDir)
  return {
    destQpdf,
    releaseUrl: PINNED_QPDF_DOWNLOAD_URL,
    releaseTag: PINNED_QPDF_TAG
  }
}

function getBinaryVersion(exePath, args) {
  try {
    const out = execFileSync(exePath, args, { encoding: 'utf8', timeout: 10000 })
    return out.split(/\r?\n/).slice(0, 2).join(' | ').trim()
  } catch (err) {
    return String(err.message || 'unknown')
  }
}

function getFfmpegBuildFlags(exePath) {
  try {
    const out = execFileSync(exePath, ['-version'], { encoding: 'utf8', timeout: 10000 })
    const configLine = out
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('configuration:'))
    return configLine ? configLine.trim() : 'unknown'
  } catch {
    return 'unknown'
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

function ensureNoticeLicenseFiles() {
  const rootLicense = path.join(rootDir, 'LICENSE')
  const bundledGplLicense = path.join(noticesDir, 'LICENSE-GPLv3.txt')
  const ffmpegStaticLicense = path.join(
    rootDir,
    'node_modules',
    'ffmpeg-static',
    'ffmpeg.exe.LICENSE'
  )
  const ffmpegStaticReadme = path.join(
    rootDir,
    'node_modules',
    'ffmpeg-static',
    'ffmpeg.exe.README'
  )

  if (fs.existsSync(ffmpegStaticLicense)) {
    if (!fs.existsSync(rootLicense)) {
      fs.copyFileSync(ffmpegStaticLicense, rootLicense)
    }
    fs.copyFileSync(ffmpegStaticLicense, bundledGplLicense)
  } else if (fs.existsSync(rootLicense)) {
    fs.copyFileSync(rootLicense, bundledGplLicense)
  }

  if (fs.existsSync(ffmpegStaticReadme)) {
    fs.copyFileSync(ffmpegStaticReadme, path.join(noticesDir, 'FFMPEG_BUILD_INFO.txt'))
  }
}

async function main() {
  ensureNoticeLicenseFiles()
  const sevenZaPath = await ensure7za()
  await ensureWinCodeSignCache(sevenZaPath)
  const { destFfmpeg, destFfprobe } = await ensureFfmpegAndFfprobe()
  const { destQpdf, releaseUrl } = await ensureQpdf(sevenZaPath)

  const qpdfRuntimeFiles = fs
    .readdirSync(binDir)
    .filter(
      (f) =>
        (f.endsWith('.dll') || (f.startsWith('qpdf') && f.endsWith('.exe'))) &&
        f !== 'qpdf.exe'
    )
    .sort()
    .map((file) => {
      const fullPath = path.join(binDir, file)
      return {
        file,
        sha256: sha256File(fullPath),
        sizeBytes: fs.statSync(fullPath).size
      }
    })

  const manifest = {
    generatedAt: new Date().toISOString(),
    platform: 'win32-x64',
    binaries: {
      ffmpeg: {
        file: 'ffmpeg.exe',
        version: getBinaryVersion(destFfmpeg, ['-version']),
        buildConfiguration: getFfmpegBuildFlags(destFfmpeg),
        sha256: sha256File(destFfmpeg),
        sizeBytes: fs.statSync(destFfmpeg).size,
        license: 'GPL-3.0-or-later (--enable-gpl --enable-version3)',
        sourceUrl: 'https://www.gyan.dev/ffmpeg/builds/',
        upstreamSourceCommit: 'https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3',
        binaryDistributionUrl: 'https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0'
      },
      ffprobe: {
        file: 'ffprobe.exe',
        version: getBinaryVersion(destFfprobe, ['-version']),
        buildConfiguration: getFfmpegBuildFlags(destFfprobe),
        sha256: sha256File(destFfprobe),
        sizeBytes: fs.statSync(destFfprobe).size,
        license: 'GPL-3.0-or-later (--enable-gpl --enable-version3)',
        sourceUrl: 'https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz',
        upstreamSourceTag: 'https://github.com/FFmpeg/FFmpeg/releases/tag/n4.0.2'
      },
      qpdf: {
        file: 'qpdf.exe',
        version: getBinaryVersion(destQpdf, ['--version']),
        sha256: sha256File(destQpdf),
        sizeBytes: fs.statSync(destQpdf).size,
        license: 'Apache-2.0',
        sourceUrl: releaseUrl,
        upstreamSourceTag: `https://github.com/qpdf/qpdf/releases/tag/${PINNED_QPDF_TAG}`,
        runtimeFiles: qpdfRuntimeFiles
      },
      sevenZip: {
        file: '7za.exe',
        version: getBinaryVersion(sevenZaPath, ['i']),
        sha256: sha256File(sevenZaPath),
        sizeBytes: fs.statSync(sevenZaPath).size,
        license: 'LGPL-2.1-or-later + BSD 3-clause (7-Zip Standalone Console; no RAR creation)',
        sourceUrl: 'https://www.7-zip.org/license.txt',
        upstreamSourceArchive: 'https://www.7-zip.org/a/7z2107-src.7z'
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

File Compressor is distributed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).
See LICENSE / notices/LICENSE-GPLv3.txt for the full text of the GNU General Public License v3.0.

File Compressor bundles the following standalone command-line tools and native libraries in extraResources/unpacked directories for 100% offline local file compression on Windows x64:

1. FFmpeg (ffmpeg.exe) & ffprobe (ffprobe.exe)
   - ffmpeg.exe Version: ${manifest.binaries.ffmpeg.version}
   - ffmpeg.exe SHA-256: ${manifest.binaries.ffmpeg.sha256}
   - ffmpeg.exe Build Config: Compiled with --enable-gpl --enable-version3 (gyan.dev 6.0-essentials_build, upstream FFmpeg commit https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3, distributed via https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0)
   - ffprobe.exe Version: ${manifest.binaries.ffprobe.version}
   - ffprobe.exe SHA-256: ${manifest.binaries.ffprobe.sha256}
   - ffprobe.exe Build Config: Compiled with --enable-gpl --enable-version3 (FFmpeg 4.0.2, upstream source https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz)
   - License: GNU General Public License v3.0 or later (GPL-3.0-or-later)
   - Legal & Source Information: https://ffmpeg.org/legal.html & https://www.gyan.dev/ffmpeg/builds/
   - Full License Text: Included in notices/LICENSE-GPLv3.txt and root LICENSE.
   - Build Info: Included in notices/FFMPEG_BUILD_INFO.txt.

2. QPDF (qpdf.exe & companion DLLs: qpdf30.dll, MSVC runtime DLLs)
   - Version: ${manifest.binaries.qpdf.version}
   - SHA-256 (qpdf.exe): ${manifest.binaries.qpdf.sha256}
   - License: Apache License 2.0
   - Official Binary Release: ${manifest.binaries.qpdf.sourceUrl}
   - Official Source Code: ${manifest.binaries.qpdf.upstreamSourceTag}

3. 7-Zip Standalone Console (7za.exe)
   - Version: ${manifest.binaries.sevenZip.version}
   - SHA-256 (7za.exe): ${manifest.binaries.sevenZip.sha256}
   - License: GNU LGPL v2.1 or later + BSD 3-Clause (Used strictly for .zip and .7z archives; unRAR code is not used to create RAR archives)
   - Official License & Source Code: https://www.7-zip.org/license.txt | https://www.7-zip.org/a/7z2107-src.7z

4. Sharp & libvips (@img/sharp-win32-x64, @img/sharp-libvips-win32-x64)
   - Version: sharp 0.33.5 (libvips 8.15.3)
   - License: Apache License 2.0 (Sharp) / GNU LGPL v2.1 or later (libvips)
   - Source: https://github.com/lovell/sharp & https://github.com/libvips/libvips
`
  fs.writeFileSync(path.join(noticesDir, 'THIRD_PARTY_NOTICES.txt'), noticeText, 'utf8')
  console.log('[prepare-binaries] All binaries verified and manifest written.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

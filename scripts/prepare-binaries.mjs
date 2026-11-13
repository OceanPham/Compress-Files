import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const binDir = path.join(rootDir, 'resources', 'bin', 'win32-x64')
const noticesDir = path.join(rootDir, 'resources', 'notices')

// Pinned QPDF 12.4.2 MSVC64
const PINNED_QPDF_VERSION = '12.4.2'
const PINNED_QPDF_TAG = `v${PINNED_QPDF_VERSION}`
const PINNED_QPDF_ZIP_NAME = `qpdf-${PINNED_QPDF_VERSION}-msvc64.zip`
const PINNED_QPDF_DOWNLOAD_URL = `https://github.com/qpdf/qpdf/releases/download/${PINNED_QPDF_TAG}/${PINNED_QPDF_ZIP_NAME}`
const PINNED_QPDF_EXE_SHA256 = '1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff'

// Pinned Unified FFmpeg & ffprobe 7.1.5 win64-gpl (BtbN/FFmpeg-Builds)
const PINNED_FFMPEG_RELEASE_TAG = 'autobuild-2026-07-31-14-10'
const PINNED_FFMPEG_ZIP_NAME = 'ffmpeg-n7.1.5-12-g1fdbca85aa-win64-gpl-7.1.zip'
const PINNED_FFMPEG_DOWNLOAD_URL = `https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/${PINNED_FFMPEG_RELEASE_TAG}/${PINNED_FFMPEG_ZIP_NAME}`
const PINNED_FFMPEG_ZIP_SHA256 = 'c067a1ca58f4fc4449f4bab0890fbcd65cbb3e5f46e066cf9c768e06c0c1d4d9'
const PINNED_FFMPEG_EXE_SHA256 = 'efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de'
const PINNED_FFPROBE_EXE_SHA256 = '69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2'
const PINNED_FFMPEG_SOURCE_COMMIT = '1fdbca85aaea513c9cc6c14d347f76543346d3da'
const PINNED_RECIPE_COMMIT = 'a99e8230eae00d1cee38f23076a7a1f55cd984e2'

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

async function ensureFfmpegAndFfprobe(sevenZaPath) {
  const destFfmpeg = path.join(binDir, 'ffmpeg.exe')
  const destFfprobe = path.join(binDir, 'ffprobe.exe')

  const ffmpegValid = fs.existsSync(destFfmpeg) && sha256File(destFfmpeg) === PINNED_FFMPEG_EXE_SHA256
  const ffprobeValid = fs.existsSync(destFfprobe) && sha256File(destFfprobe) === PINNED_FFPROBE_EXE_SHA256

  if (ffmpegValid && ffprobeValid) {
    console.log(
      `[prepare-binaries] Verified pinned unified ffmpeg.exe & ffprobe.exe (${PINNED_FFMPEG_RELEASE_TAG}) ->`,
      binDir
    )
    return { destFfmpeg, destFfprobe }
  }

  console.warn(
    `[prepare-binaries] ffmpeg/ffprobe missing or SHA-256 mismatch; preparing unified archive...`
  )

  const tmpZip = path.join(rootDir, 'resources', PINNED_FFMPEG_ZIP_NAME)
  const tmpExtract = path.join(rootDir, 'resources', 'ffmpeg-extract')

  // Check local override or project cache
  const cacheDir = process.env.FFMPEG_CACHE_DIR || path.join(rootDir, '.cache')
  const projectCache = path.join(cacheDir, PINNED_FFMPEG_ZIP_NAME)
  const localZipCandidate =
    process.env.FFMPEG_WIN64_ZIP_PATH || (fs.existsSync(projectCache) ? projectCache : null)

  if (localZipCandidate && fs.existsSync(localZipCandidate)) {
    console.log(
      `[prepare-binaries] Using local FFmpeg unified archive from ${localZipCandidate}...`
    )
    fs.copyFileSync(localZipCandidate, tmpZip)
  } else {
    console.log(
      `[prepare-binaries] Downloading pinned unified FFmpeg ${PINNED_FFMPEG_RELEASE_TAG} (${PINNED_FFMPEG_DOWNLOAD_URL})...`
    )
    const zipRes = await fetch(PINNED_FFMPEG_DOWNLOAD_URL, {
      headers: {
        'User-Agent': 'FileCompressor-BuildScript'
      }
    })
    if (!zipRes.ok) {
      throw new Error(`Failed to download ${PINNED_FFMPEG_ZIP_NAME}: HTTP ${zipRes.status}`)
    }
    const arrayBuf = await zipRes.arrayBuffer()
    fs.writeFileSync(tmpZip, Buffer.from(arrayBuf))
  }

  const zipHash = sha256File(tmpZip)
  if (zipHash !== PINNED_FFMPEG_ZIP_SHA256) {
    throw new Error(
      `SHA-256 mismatch for ${PINNED_FFMPEG_ZIP_NAME}: expected ${PINNED_FFMPEG_ZIP_SHA256}, got ${zipHash}`
    )
  }

  fs.rmSync(tmpExtract, { recursive: true, force: true })
  fs.mkdirSync(tmpExtract, { recursive: true })

  execFileSync(sevenZaPath, ['x', tmpZip, `-o${tmpExtract}`, '-y'], { stdio: 'ignore' })

  const topDirs = fs.readdirSync(tmpExtract)
  const extractedRoot =
    topDirs.length === 1 ? path.join(tmpExtract, topDirs[0]) : tmpExtract
  const extractedBin = path.join(extractedRoot, 'bin')
  if (!fs.existsSync(extractedBin)) {
    throw new Error('Extracted ffmpeg archive does not contain a bin directory')
  }

  fs.copyFileSync(path.join(extractedBin, 'ffmpeg.exe'), destFfmpeg)
  fs.copyFileSync(path.join(extractedBin, 'ffprobe.exe'), destFfprobe)

  fs.rmSync(tmpZip, { force: true })
  fs.rmSync(tmpExtract, { recursive: true, force: true })

  const ffmpegSha = sha256File(destFfmpeg)
  const ffprobeSha = sha256File(destFfprobe)
  if (ffmpegSha !== PINNED_FFMPEG_EXE_SHA256) {
    throw new Error(
      `SHA-256 mismatch for extracted ffmpeg.exe: expected ${PINNED_FFMPEG_EXE_SHA256}, got ${ffmpegSha}`
    )
  }
  if (ffprobeSha !== PINNED_FFPROBE_EXE_SHA256) {
    throw new Error(
      `SHA-256 mismatch for extracted ffprobe.exe: expected ${PINNED_FFPROBE_EXE_SHA256}, got ${ffprobeSha}`
    )
  }

  console.log('[prepare-binaries] Extracted and verified unified ffmpeg.exe and ffprobe.exe to', binDir)
  return { destFfmpeg, destFfprobe }
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

function ensureNoticeLicenseFiles(destFfmpeg) {
  const rootLicense = path.join(rootDir, 'LICENSE')
  const bundledGplLicense = path.join(noticesDir, 'LICENSE-GPLv3.txt')

  if (fs.existsSync(rootLicense)) {
    fs.copyFileSync(rootLicense, bundledGplLicense)
  }

  // Generate official FFMPEG_BUILD_INFO.txt
  const buildConfig = getFfmpegBuildFlags(destFfmpeg)
  const buildInfoText = `FFmpeg Build and Toolchain Information
========================================
Source Release Tag: ${PINNED_FFMPEG_RELEASE_TAG}
FFmpeg Version: n7.1.5-12-g1fdbca85aa-20260731
FFmpeg Source Commit: ${PINNED_FFMPEG_SOURCE_COMMIT}
Build Recipe Commit: ${PINNED_RECIPE_COMMIT} (repo: https://github.com/FFmpeg-Builds/FFmpeg-Builds)
Local Vendored Recipe: third_party/ffmpeg-build-recipe/
Compiler: gcc 15.2.0 (crosstool-NG 1.28.0.23_185f348)
Target: x86_64-w64-mingw32 (static linking with ucrt runtime)
License: GNU General Public License v3.0 or later (GPL-3.0-or-later)

Binaries in this distribution:
- ffmpeg.exe (SHA-256: ${PINNED_FFMPEG_EXE_SHA256})
- ffprobe.exe (SHA-256: ${PINNED_FFPROBE_EXE_SHA256})

Build Configuration:
${buildConfig}
`
  fs.writeFileSync(path.join(noticesDir, 'FFMPEG_BUILD_INFO.txt'), buildInfoText, 'utf8')
}

async function main() {
  const sevenZaPath = await ensure7za()
  await ensureWinCodeSignCache(sevenZaPath)
  const { destFfmpeg, destFfprobe } = await ensureFfmpegAndFfprobe(sevenZaPath)
  ensureNoticeLicenseFiles(destFfmpeg)
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
        sourceReleaseTag: PINNED_FFMPEG_RELEASE_TAG,
        sourceArchiveUrl: `https://github.com/FFmpeg/FFmpeg/archive/${PINNED_FFMPEG_SOURCE_COMMIT}.tar.gz`,
        upstreamSourceCommit: `https://github.com/FFmpeg/FFmpeg/commit/${PINNED_FFMPEG_SOURCE_COMMIT}`,
        buildRecipeCommit: `https://github.com/FFmpeg-Builds/FFmpeg-Builds/tree/${PINNED_RECIPE_COMMIT}`,
        vendoredRecipePath: 'third_party/ffmpeg-build-recipe',
        binaryDistributionUrl: PINNED_FFMPEG_DOWNLOAD_URL,
        binaryArchiveSha256: PINNED_FFMPEG_ZIP_SHA256
      },
      ffprobe: {
        file: 'ffprobe.exe',
        version: getBinaryVersion(destFfprobe, ['-version']),
        buildConfiguration: getFfmpegBuildFlags(destFfprobe),
        sha256: sha256File(destFfprobe),
        sizeBytes: fs.statSync(destFfprobe).size,
        license: 'GPL-3.0-or-later (--enable-gpl --enable-version3)',
        sourceReleaseTag: PINNED_FFMPEG_RELEASE_TAG,
        sourceArchiveUrl: `https://github.com/FFmpeg/FFmpeg/archive/${PINNED_FFMPEG_SOURCE_COMMIT}.tar.gz`,
        upstreamSourceCommit: `https://github.com/FFmpeg/FFmpeg/commit/${PINNED_FFMPEG_SOURCE_COMMIT}`,
        buildRecipeCommit: `https://github.com/FFmpeg-Builds/FFmpeg-Builds/tree/${PINNED_RECIPE_COMMIT}`,
        vendoredRecipePath: 'third_party/ffmpeg-build-recipe',
        binaryDistributionUrl: PINNED_FFMPEG_DOWNLOAD_URL,
        binaryArchiveSha256: PINNED_FFMPEG_ZIP_SHA256
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

1. FFmpeg (ffmpeg.exe) & ffprobe (ffprobe.exe) - Unified Build
   - Release Tag: ${PINNED_FFMPEG_RELEASE_TAG} (BtbN/FFmpeg-Builds)
   - ffmpeg.exe Version: ${manifest.binaries.ffmpeg.version}
   - ffmpeg.exe SHA-256: ${manifest.binaries.ffmpeg.sha256}
   - ffprobe.exe Version: ${manifest.binaries.ffprobe.version}
   - ffprobe.exe SHA-256: ${manifest.binaries.ffprobe.sha256}
   - FFmpeg Upstream Source Commit: ${PINNED_FFMPEG_SOURCE_COMMIT}
   - Build Recipe Commit: ${PINNED_RECIPE_COMMIT} (https://github.com/FFmpeg-Builds/FFmpeg-Builds)
   - Vendored Build Recipe: third_party/ffmpeg-build-recipe/
   - Toolchain: gcc 15.2.0 (crosstool-NG 1.28.0.23_185f348)
   - License: GNU General Public License v3.0 or later (GPL-3.0-or-later, --enable-gpl --enable-version3)
   - System Libraries: Dynamically loaded Windows OS DLLs (KERNEL32.dll, USER32.dll, ADVAPI32.dll, api-ms-win-crt-*) fall under the GPLv3 Section 1 System Library exception.
   - Corresponding Source: Detailed in docs/CORRESPONDING_SOURCE.md, reproducible via .github/workflows/build-ffmpeg-source.yml or bundled via release/FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip.

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

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { getBinaryPath } from '../src/main/utils/binaries.ts'

const rootDir = process.cwd()
const scratchDir = path.join(
  rootDir,
  '..',
  '..',
  '..',
  'Users',
  'PC BUG',
  '.gemini',
  'antigravity',
  'brain',
  '309b5121-3406-4c1f-b3f0-93a2e9b62a0b',
  'scratch'
)

const FFMPEG_COMMIT = '1fdbca85aaea513c9cc6c14d347f76543346d3da'
const FFMPEG_TAR_NAME = `FFmpeg-${FFMPEG_COMMIT}.tar.gz`
const FFMPEG_TAR_URL = `https://github.com/FFmpeg/FFmpeg/archive/${FFMPEG_COMMIT}.tar.gz`

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

async function ensureFfmpegSourceTarball(destDir) {
  const localCandidate = path.join(scratchDir, FFMPEG_TAR_NAME)
  const targetTar = path.join(destDir, FFMPEG_TAR_NAME)

  if (fs.existsSync(localCandidate)) {
    console.log(`[bundle-source] Using cached FFmpeg tarball from scratch -> ${localCandidate}`)
    fs.copyFileSync(localCandidate, targetTar)
  } else {
    console.log(`[bundle-source] Downloading FFmpeg source tarball from ${FFMPEG_TAR_URL}...`)
    const res = await fetch(FFMPEG_TAR_URL, {
      headers: { 'User-Agent': 'FileCompressor-SourceBundler' }
    })
    if (!res.ok) throw new Error(`Failed to download FFmpeg tarball: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(targetTar, buf)
  }

  const h = sha256File(targetTar)
  console.log(`[bundle-source] Bundled FFmpeg source tarball: ${targetTar} (SHA-256: ${h})`)
  return { targetTar, sha256: h }
}

async function main() {
  const args = process.argv.slice(2)
  let outZip = path.join(
    rootDir,
    'release',
    'FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip'
  )
  const outIndex = args.indexOf('--out')
  if (outIndex !== -1 && args[outIndex + 1]) {
    outZip = path.resolve(rootDir, args[outIndex + 1])
  }

  fs.mkdirSync(path.dirname(outZip), { recursive: true })

  const stagingDir = path.join(rootDir, 'tmp-source-bundle-staging')
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true })
  }
  fs.mkdirSync(stagingDir, { recursive: true })

  console.log(`[bundle-source] Staging Corresponding Source components...`)

  // 1. Copy full vendored recipe
  const recipeSrc = path.join(rootDir, 'third_party', 'ffmpeg-build-recipe')
  const recipeDst = path.join(stagingDir, 'ffmpeg-build-recipe')
  if (!fs.existsSync(recipeSrc)) {
    throw new Error(`Vendored recipe not found at ${recipeSrc}`)
  }
  fs.cpSync(recipeSrc, recipeDst, { recursive: true })

  // 2. Bundle FFmpeg source code archive
  await ensureFfmpegSourceTarball(stagingDir)

  // 3. Copy documentation & manifests
  const docFiles = [
    'docs/CORRESPONDING_SOURCE.md',
    'docs/THIRD_PARTY_NOTICES.md',
    'resources/notices/BINARY_MANIFEST.json',
    'resources/notices/FFMPEG_BUILD_INFO.txt',
    'resources/notices/THIRD_PARTY_NOTICES.txt'
  ]
  const docsDst = path.join(stagingDir, 'documentation')
  fs.mkdirSync(docsDst, { recursive: true })
  for (const doc of docFiles) {
    const srcDoc = path.join(rootDir, doc)
    if (fs.existsSync(srcDoc)) {
      fs.copyFileSync(srcDoc, path.join(docsDst, path.basename(doc)))
    }
  }

  // 4. Add root README for the Corresponding Source package
  const sourceReadme = `# File Compressor v1.0.0 — FFmpeg Corresponding Source Package
Tác giả: Ngọc Huy Dev · Ocean Labs
Website: https://oceanlabs.pro.vn/
Giấy phép: GNU General Public License v3.0 (GPL-3.0-or-later)

Gói tài liệu và mã nguồn tương ứng này được cung cấp theo Điều 6 của giấy phép GNU GPL v3.0 dành cho hai binary được đóng gói kèm theo ứng dụng File Compressor:
- ffmpeg.exe (SHA-256: efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de)
- ffprobe.exe (SHA-256: 69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2)

Các thành phần trong gói này:
1. FFmpeg-${FFMPEG_COMMIT}.tar.gz:
   Toàn bộ cây mã nguồn chính xác của FFmpeg tại commit ${FFMPEG_COMMIT} (nhánh release/7.1, tag n7.1.5-12-g1fdbca85aa).
2. ffmpeg-build-recipe/:
   Toàn bộ công thức build được ghim cố định từ repo https://github.com/FFmpeg-Builds/FFmpeg-Builds tại commit a99e8230eae00d1cee38f23076a7a1f55cd984e2, bao gồm:
   - DEPENDENCY_SOURCE_MANIFEST.json: Manifest chi tiết của toàn bộ 120 thư viện phụ thuộc, URL upstream repository, mã commit git / bản sửa đổi SVN, các tệp vá lỗi (patches), cấu hình bản build và giấy phép.
   - scripts.d/: Toàn bộ script shell định nghĩa quá trình tải và biên dịch từng thư viện phụ thuộc.
   - patches/: Toàn bộ các bản vá (patches) được áp dụng trong quá trình biên dịch cross-compile x86_64-w64-mingw32.
   - images/: Cấu hình Dockerfile container và ct-ng-config (crosstool-NG 1.28.0.23_185f348, GCC 15.2.0, binutils 2.46.0, mingw-w64 v13.0.0 với UCRT runtime).
   - build.sh, download.sh, generate.sh: Các script tự động hóa tải mã nguồn và biên dịch.
3. documentation/:
   - CORRESPONDING_SOURCE.md: Báo cáo đối chiếu và hướng dẫn lấy nguồn đầy đủ.
   - THIRD_PARTY_NOTICES.txt: Thông báo bản quyền và phân loại thư viện (gồm ngoại lệ Thư viện Hệ điều hành Windows).
   - BINARY_MANIFEST.json & FFMPEG_BUILD_INFO.txt: Bằng chứng kỹ thuật và cấu hình biên dịch chi tiết.

Hướng dẫn biên dịch tái lập:
- Cách 1: Chạy workflow thủ công trên GitHub Actions: .github/workflows/build-ffmpeg-source.yml.
- Cách 2: Sử dụng Docker trên máy Linux:
  cd ffmpeg-build-recipe
  TARGET=win64 VARIANT=gpl ADDINS="7.1" ./generate.sh
  TARGET=win64 VARIANT=gpl ADDINS="7.1" GIT_BRANCH="${FFMPEG_COMMIT}" ./build.sh
`
  fs.writeFileSync(path.join(stagingDir, 'README.txt'), sourceReadme, 'utf8')

  // 5. Compress using 7za.exe
  const sevenZa = getBinaryPath('7za')
  if (fs.existsSync(outZip)) {
    fs.rmSync(outZip, { force: true })
  }

  console.log(`[bundle-source] Compressing staging directory to ${outZip}...`)
  execFileSync(sevenZa, ['a', '-tzip', '-mx=9', outZip, path.join(stagingDir, '*')], {
    stdio: 'ignore'
  })

  // Cleanup staging
  fs.rmSync(stagingDir, { recursive: true, force: true })

  const zipHash = sha256File(outZip)
  const zipSize = fs.statSync(outZip).size
  fs.writeFileSync(`${outZip}.sha256`, `${zipHash} *${path.basename(outZip)}\n`, 'utf8')

  console.log(`[bundle-source] Created Corresponding Source bundle:`)
  console.log(`  Path  : ${outZip}`)
  console.log(`  Size  : ${zipSize} bytes (${(zipSize / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`  SHA256: ${zipHash}`)
}

main().catch((err) => {
  console.error('[bundle-source ERROR]', err)
  process.exit(1)
})


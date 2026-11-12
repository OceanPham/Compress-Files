import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const rootDir = process.cwd()
const buildDir = path.join(rootDir, 'build')
const resourcesDir = path.join(rootDir, 'resources')

fs.mkdirSync(buildDir, { recursive: true })
fs.mkdirSync(resourcesDir, { recursive: true })

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect x="24" y="24" width="464" height="464" rx="104" fill="url(#bg)" stroke="#38bdf8" stroke-width="12" stroke-opacity="0.45"/>
  <!-- Top press arrow -->
  <path d="M256 76 L256 176 M212 136 L256 180 L300 136" stroke="url(#accent)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Compressed file box -->
  <rect x="116" y="206" width="280" height="100" rx="22" fill="#0f172a" stroke="url(#accent)" stroke-width="20"/>
  <line x1="168" y1="242" x2="344" y2="242" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
  <line x1="168" y1="274" x2="292" y2="274" stroke="#38bdf8" stroke-width="16" stroke-linecap="round"/>
  <!-- Bottom press arrow -->
  <path d="M256 436 L256 336 M212 376 L256 332 L300 376" stroke="url(#accent)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`

function createIcoFromPngBuffers(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length
  const headerSize = 6
  const dirEntrySize = 16
  let offset = headerSize + count * dirEntrySize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type 1 = ICO
  header.writeUInt16LE(count, 4)

  const dirEntries = []
  for (const item of pngBuffersWithSizes) {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0)
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1)
    entry.writeUInt8(0, 2) // Palette
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += item.buffer.length
    dirEntries.push(entry)
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffersWithSizes.map((i) => i.buffer)
  ])
}

async function main() {
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = []
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(svgIcon)).resize(size, size).png().toBuffer()
    pngBuffers.push({ size, buffer: buf })
  }

  const icoBuffer = createIcoFromPngBuffers(pngBuffers)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)

  const png512 = await sharp(Buffer.from(svgIcon)).resize(512, 512).png().toBuffer()
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png512)
  console.log('Generated build/icon.ico, build/icon.png, resources/icon.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

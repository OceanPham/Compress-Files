# Thông báo Phần mềm Bên thứ ba & Giấy phép (`docs/THIRD_PARTY_NOTICES.md`)

Ứng dụng **File Compressor** được phát hành theo giấy phép **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (toàn văn tại [`LICENSE`](../LICENSE) và được đóng gói kèm bộ cài tại `resources/LICENSE` cùng `resources/notices/LICENSE-GPLv3.txt`).

Để hoạt động **100% Offline** sau khi cài đặt trên Windows x64, ứng dụng đóng gói kèm các công cụ dòng lệnh độc lập trong `resources/bin` (`extraResources`) và thư viện native trong `resources/app.asar.unpacked`. Hồ sơ đối chiếu chi tiết về **Mã nguồn tương ứng (Corresponding Source)** của từng binary được ghi nhận tại [`docs/CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md).

---

## 1. Các Binary Đóng gói trong `resources/bin/win32-x64` (`extraResources`)

### 1.1. FFmpeg (`ffmpeg.exe`) & ffprobe (`ffprobe.exe`) — Bộ Build Đồng nhất (Unified Build)
- **Nguồn bản build**: [BtbN/FFmpeg-Builds](https://github.com/FFmpeg-Builds/FFmpeg-Builds)
- **Thẻ phát hành (Release Tag)**: `autobuild-2026-07-31-14-10`
- **Phiên bản hiển thị**: `ffmpeg / ffprobe version n7.1.5-12-g1fdbca85aa-20260731`
- **Trình biên dịch**: `gcc 15.2.0 (crosstool-NG 1.28.0.23_185f348)` (kiến trúc `x86_64-w64-mingw32` liên kết tĩnh)
- **Định danh `ffmpeg.exe`**:
  - Kích thước: `138,059,776 bytes`
  - SHA-256: `efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de`
- **Định danh `ffprobe.exe`**:
  - Kích thước: `137,923,584 bytes`
  - SHA-256: `69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2`
- **Giấy phép**: **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (biên dịch tĩnh với `--enable-gpl --enable-version3`).
- **Phân loại Thư viện Hệ thống (GPLv3 Section 1)**:
  Các DLL hệ điều hành Windows được nạp động tại thời điểm chạy (`KERNEL32.dll`, `USER32.dll`, `ADVAPI32.dll`, `GDI32.dll`, `SHELL32.dll`, `api-ms-win-crt-*`, `ntdll.dll`...) thuộc phạm vi **Ngoại lệ Thư viện Hệ thống (System Library Exception)** của GPLv3 Điều 1.
- **Mã nguồn Tương ứng (Corresponding Source — GPLv3 Điều 6)**:
  1. **Mã nguồn chương trình chính FFmpeg**: Commit [`1fdbca85aaea513c9cc6c14d347f76543346d3da`](https://github.com/FFmpeg/FFmpeg/commit/1fdbca85aaea513c9cc6c14d347f76543346d3da) (nhánh `release/7.1`). Gói mã nguồn gốc: [`FFmpeg-1fdbca85aaea513c9cc6c14d347f76543346d3da.tar.gz`](https://github.com/FFmpeg/FFmpeg/archive/1fdbca85aaea513c9cc6c14d347f76543346d3da.tar.gz) (`15.2 MB`, SHA-256: `1312ecd4b87383182530278450c204c27e6787d033b190a28072a149cca59ed3`).
  2. **Công thức build & 120 thư viện phụ thuộc**: Lưu trữ trực tiếp trong repo tại `third_party/ffmpeg-build-recipe/` (ghim cố định commit `a99e8230eae00d1cee38f23076a7a1f55cd984e2`). Từng thư viện đều có manifest URL, commit/rev và patch cụ thể trong `DEPENDENCY_SOURCE_MANIFEST.json`.
  3. **Gói Corresponding Source phát hành**: `release/FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` (`15.30 MB`, SHA-256: `2120cc865dfdf0423ea1bdefbdb24ee6c21d77f00e3a89b621f587793af12217`).
  4. **Kịch bản tái lập tự động**: Workflow GitHub Actions `.github/workflows/build-ffmpeg-source.yml`.

### 1.2. QPDF (`qpdf.exe` và các thư viện runtime MSVC x64 đi kèm)
- **Phiên bản**: `qpdf version 12.4.2` (MSVC x64 official release, cố định phiên bản `v12.4.2` trong `scripts/prepare-binaries.mjs`)
- **SHA-256 (`qpdf.exe`)**: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff` (`19,456 bytes`)
- **SHA-256 (`qpdf30.dll`)**: `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041` (`7,448,064 bytes`)
- **Các thư viện MSVC Runtime đi kèm trong `resources/bin`**: `concrt140.dll`, `msvcp140.dll`, `msvcp140_1.dll`, `msvcp140_2.dll`, `msvcp140_atomic_wait.dll`, `msvcp140_codecvt_ids.dll`, `vcruntime140.dll`, `vcruntime140_1.dll` (chi tiết SHA-256 từng file trong `resources/notices/BINARY_MANIFEST.json`).
- **Giấy phép**: Apache License 2.0
- **Nguồn nhị phân & mã nguồn chính thức (Đã xác minh đầy đủ)**:
  - Binary: `https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip`
  - Mã nguồn `v12.4.2`: `https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2.tar.gz` (`https://github.com/qpdf/qpdf/releases/tag/v12.4.2`)

### 1.3. 7-Zip Standalone Console (`7za.exe`)
- **Phiên bản**: `7-Zip (a) 21.07 (x64)` — Copyright (c) 1999-2021 Igor Pavlov (`2021-12-26`)
- **SHA-256 (`7za.exe`)**: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` (`1,231,360 bytes`)
- **Giấy phép**: GNU LGPL v2.1 or later + BSD 3-Clause (`7za.exe` chỉ được ứng dụng dùng cho định dạng `.zip` và `.7z`, không chứa hoặc sử dụng thành phần tạo `.rar`).
- **Nguồn chính thức (Đã xác minh đầy đủ)**:
  - Giấy phép: `https://www.7-zip.org/license.txt`
  - Mã nguồn gốc `21.07`: `https://www.7-zip.org/a/7z2107-src.7z` (`https://www.7-zip.org/a/7z2107-src.tar.xz`)

---

## 2. Các Thư viện Native & NPM Chính

| Thư viện | Phiên bản | Giấy phép | Nguồn & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `sharp` (`@img/sharp-win32-x64` + `libvips`) | `0.33.5` (`libvips 8.15.3`) | Apache-2.0 (Sharp) / LGPL-2.1+ (libvips) | Giải mã, xoay EXIF, quản lý ICC/sRGB, resize và nén ảnh JPEG, PNG, WebP, AVIF. Nguồn: [`lovell/sharp v0.33.5`](https://github.com/lovell/sharp/releases/tag/v0.33.5), [`lovell/sharp-libvips`](https://github.com/lovell/sharp-libvips), [`libvips v8.15.3`](https://github.com/libvips/libvips/releases/tag/v8.15.3) |
| `electron` | `33.2.0` | MIT | Nền tảng ứng dụng Desktop đa tiến trình |
| `react` & `react-dom` | `18.3.1` | MIT | Giao diện người dùng |
| `lucide-react` | `0.460.0` | ISC | Bộ biểu tượng giao diện trực quan |
| `clsx` & `tailwind-merge` | `2.1.1` / `2.5.4` | MIT | Hợp nhất class giao diện |
| `tailwindcss` | `3.4.15` | MIT | Hệ thống thiết kế giao diện |
| `pdf-lib` | `1.17.1` | MIT | Sinh dữ liệu fixture PDF phục vụ bộ kiểm thử tự động |

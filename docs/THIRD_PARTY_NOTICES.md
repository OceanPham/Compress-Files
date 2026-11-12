# Thông báo Phần mềm Bên thứ ba & Giấy phép (`docs/THIRD_PARTY_NOTICES.md`)

Ứng dụng **File Compressor** được phát hành theo giấy phép **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (toàn văn tại [`LICENSE`](../LICENSE) và được đóng gói kèm bộ cài tại `resources/LICENSE` cùng `resources/notices/LICENSE-GPLv3.txt`).

Để hoạt động **100% Offline** sau khi cài đặt trên Windows x64, ứng dụng đóng gói kèm các công cụ dòng lệnh độc lập trong `resources/bin` (`extraResources`) và thư viện native trong `resources/app.asar.unpacked`. Dưới đây là thông tin phiên bản, cấu hình biên dịch, mã băm SHA-256, nguồn tải chính thức và nghĩa vụ giấy phép tương ứng.

---

## 1. Các Binary Đóng gói trong `resources/bin/win32-x64` (`extraResources`)

### 1.1. FFmpeg (`ffmpeg.exe`) & ffprobe (`ffprobe.exe`)
- **Phiên bản `ffmpeg.exe`**: `ffmpeg version 6.0-essentials_build-www.gyan.dev` (Built with GCC 12.2.0, MSYS2 project)
- **SHA-256 (`ffmpeg.exe`)**: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1` (`81,114,624 bytes`)
- **Cấu hình biên dịch `ffmpeg.exe`**: Biên dịch với `--enable-gpl --enable-version3` (bao gồm `libx264`, `libx265`, `libvpx`, `libaom`, `libwebp`, v.v. — chi tiết đầy đủ trong `resources/notices/BINARY_MANIFEST.json` và `resources/notices/FFMPEG_BUILD_INFO.txt`).
- **Nguồn mã nguồn upstream (`ffmpeg.exe`)**: Commit [`ea3d24bbe3`](https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3) (đóng gói qua [`ffmpeg-static` release `b6.0`](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0) từ bản build của [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)).
- **Phiên bản `ffprobe.exe`**: `ffprobe version 4.0.2` (Built with GCC 7.3.1)
- **SHA-256 (`ffprobe.exe`)**: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5` (`63,059,968 bytes`)
- **Cấu hình biên dịch `ffprobe.exe`**: Biên dịch với `--enable-gpl --enable-version3`.
- **Nguồn mã nguồn upstream (`ffprobe.exe`)**: [FFmpeg 4.0.2 (`n4.0.2`)](https://github.com/FFmpeg/FFmpeg/releases/tag/n4.0.2) / [`ffmpeg-4.0.2.tar.xz`](https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz).
- **Giấy phép**: **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (do cả hai binary đều được biên dịch với cờ `--enable-gpl --enable-version3`).
- **Thông tin pháp lý & Tuân thủ GPLv3**:
  - Toàn văn giấy phép GPLv3 được cung cấp tại [`LICENSE`](../LICENSE) và trong thư mục cài đặt (`resources/LICENSE`, `resources/notices/LICENSE-GPLv3.txt`).
  - Mã nguồn đầy đủ của ứng dụng **File Compressor** được công khai tại kho lưu trữ GitHub [`https://github.com/OceanPham/Compress-Files`](https://github.com/OceanPham/Compress-Files).
  - Các tiến trình `ffmpeg.exe` và `ffprobe.exe` được thực thi dưới dạng tiến trình con độc lập (`child_process.spawn` với `shell: false`).
  - **Lưu ý khi phân phối bộ cài công khai (GPLv3 Section 6)**: Khi phát hành bộ cài nhị phân có kèm `ffmpeg.exe` / `ffprobe.exe` biên dịch `--enable-gpl --enable-version3`, nhà phân phối cần duy trì quyền truy cập mã nguồn tương ứng (Corresponding Source) của FFmpeg và các thư viện GPL liên kết tĩnh (hoặc đính kèm gói mã nguồn upstream tương ứng vào trang Release / lưu trữ cùng phiên bản phát hành).

### 1.2. QPDF (`qpdf.exe` và các thư viện runtime MSVC x64 đi kèm)
- **Phiên bản**: `qpdf version 12.4.2` (MSVC x64 official release, cố định phiên bản `v12.4.2` trong `scripts/prepare-binaries.mjs`)
- **SHA-256 (`qpdf.exe`)**: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff` (`19,456 bytes`)
- **SHA-256 (`qpdf30.dll`)**: `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041` (`7,448,064 bytes`)
- **Các thư viện MSVC Runtime đi kèm trong `resources/bin`**: `concrt140.dll`, `msvcp140.dll`, `msvcp140_1.dll`, `msvcp140_2.dll`, `msvcp140_atomic_wait.dll`, `msvcp140_codecvt_ids.dll`, `vcruntime140.dll`, `vcruntime140_1.dll` (chi tiết SHA-256 từng file trong `resources/notices/BINARY_MANIFEST.json`).
- **Giấy phép**: Apache License 2.0
- **Nguồn nhị phân & mã nguồn chính thức**:
  - Binary: `https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip`
  - Source tag: `https://github.com/qpdf/qpdf/releases/tag/v12.4.2`

### 1.3. 7-Zip Standalone Console (`7za.exe`)
- **Phiên bản**: `7-Zip (a) 21.07 (x64)` — Copyright (c) 1999-2021 Igor Pavlov (`2021-12-26`)
- **SHA-256 (`7za.exe`)**: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` (`1,231,360 bytes`)
- **Giấy phép**: GNU LGPL v2.1 or later + BSD 3-Clause (`7za.exe` chỉ được ứng dụng dùng cho định dạng `.zip` và `.7z`, không chứa hoặc sử dụng thành phần tạo `.rar`).
- **Nguồn chính thức**:
  - Giấy phép: `https://www.7-zip.org/license.txt`
  - Mã nguồn gốc 21.07: `https://www.7-zip.org/a/7z2107-src.7z`

---

## 2. Các Thư viện Native & NPM Chính

| Thư viện | Phiên bản | Giấy phép | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `sharp` (`@img/sharp-win32-x64` + `libvips`) | `0.33.5` (`libvips 8.15.3`) | Apache-2.0 (Sharp) / LGPL-2.1+ (libvips) | Giải mã, xoay EXIF, quản lý ICC/sRGB, resize và nén ảnh JPEG, PNG, WebP, AVIF (được unpack tại `app.asar.unpacked`) |
| `electron` | `33.2.0` | MIT | Nền tảng ứng dụng Desktop đa tiến trình |
| `react` & `react-dom` | `18.3.1` | MIT | Giao diện người dùng |
| `lucide-react` | `0.460.0` | ISC | Bộ biểu tượng giao diện trực quan |
| `clsx` & `tailwind-merge` | `2.1.1` / `2.5.4` | MIT | Hợp nhất class giao diện |
| `tailwindcss` | `3.4.15` | MIT | Hệ thống thiết kế giao diện |
| `pdf-lib` | `1.17.1` | MIT | Sinh dữ liệu fixture PDF phục vụ bộ kiểm thử tự động |

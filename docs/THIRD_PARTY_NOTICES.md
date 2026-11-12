# Thông báo Phần mềm Bên thứ ba & Giấy phép (`docs/THIRD_PARTY_NOTICES.md`)

Ứng dụng **File Compressor** được phát hành theo giấy phép **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (toàn văn tại [`LICENSE`](../LICENSE) và được đóng gói kèm bộ cài tại `resources/LICENSE` cùng `resources/notices/LICENSE-GPLv3.txt`).

Để hoạt động **100% Offline** sau khi cài đặt trên Windows x64, ứng dụng đóng gói kèm các công cụ dòng lệnh độc lập trong `resources/bin` (`extraResources`) và thư viện native trong `resources/app.asar.unpacked`. Hồ sơ đối chiếu chi tiết về **Mã nguồn tương ứng (Corresponding Source)** của từng binary được ghi nhận tại [`docs/CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md).

---

## 1. Các Binary Đóng gói trong `resources/bin/win32-x64` (`extraResources`)

### 1.1. FFmpeg (`ffmpeg.exe`) & ffprobe (`ffprobe.exe`)
- **Phiên bản `ffmpeg.exe`**: `ffmpeg version 6.0-essentials_build-www.gyan.dev` (Built with `gcc 12.2.0 (Rev10, Built by MSYS2 project)`)
- **SHA-256 (`ffmpeg.exe`)**: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1` (`81,114,624 bytes`)
- **Nguồn tải `ffmpeg.exe`**: Qua `ffmpeg-static@5.2.0` (`https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-win32-x64`), trích xuất từ gói `ffmpeg-6.0-essentials_build.7z` tại [`GyanD/codexffmpeg` release `6.0`](https://github.com/GyanD/codexffmpeg/releases/tag/6.0) (cập nhật ngày `2023-03-04`).
- **Mã nguồn FFmpeg chính của `ffmpeg.exe` (đã xác minh)**: Commit [`ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2`](https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2) (tag `n6.0`), tải tại `https://ffmpeg.org/releases/ffmpeg-6.0.tar.xz` hoặc `https://github.com/FFmpeg/FFmpeg/archive/ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2.tar.gz`.
- **Phiên bản `ffprobe.exe`**: `ffprobe version 4.0.2` (Built with `gcc 7.3.1 (GCC) 20180722`)
- **SHA-256 (`ffprobe.exe`)**: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5` (`63,059,968 bytes`)
- **Nguồn tải `ffprobe.exe`**: Qua `ffprobe-static@3.1.0` (commit [`6655ee75ccb9c1e56b7fd438130d2ec9866b3618`](https://github.com/joshwnj/ffprobe-static/commit/6655ee75ccb9c1e56b7fd438130d2ec9866b3618)), có nguồn gốc từ Zeranoe FFmpeg Builds (`http://ffmpeg.zeranoe.com/builds/win64/static/`).
- **Mã nguồn FFmpeg chính của `ffprobe.exe` (đã xác minh)**: Tag [`n4.0.2`](https://github.com/FFmpeg/FFmpeg/releases/tag/n4.0.2) (commit `0a155c57bd8eb92ccaf7f5857dc6ab276d235846`), tải tại `https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz`.
- **Giấy phép**: **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** (cả hai binary đều được biên dịch tĩnh với cờ `--enable-gpl --enable-version3`).
- **Trạng thái Hồ sơ Mã nguồn Tương ứng (Corresponding Source — Điều 1 & Điều 6 GPLv3)**:
  - **Đã hoàn thành**: Cung cấp toàn văn GPLv3 (`LICENSE`, `resources/notices/LICENSE-GPLv3.txt`), thông tin cấu hình build (`resources/notices/FFMPEG_BUILD_INFO.txt`, `BINARY_MANIFEST.json`), mã nguồn đầy đủ của ứng dụng **File Compressor**, và xác định chính xác commit/tarball gốc của chương trình chính FFmpeg (`6.0` và `4.0.2`).
  - **Chưa hoàn tất (Đang xử lý trước khi chốt phát hành)**:
    1. Với `ffmpeg.exe` (`6.0-essentials_build-www.gyan.dev`): File `README.txt` của bản build ngày `2023-03-04` liệt kê tên 39 thư viện ngoài được liên kết tĩnh nhưng chưa công bố số phiên bản/commit chính xác, gói mã nguồn của từng thư viện phụ thuộc và script build. Cần liên hệ `builds@gyan.dev` theo hướng dẫn tại [`GyanD/codexffmpeg#249`](https://github.com/GyanD/codexffmpeg/issues/249#issuecomment-6264377917) để nhận trọn bộ Corresponding Source hoặc chuyển sang nguồn build có công thức mở.
    2. Với `ffprobe.exe` (`4.0.2` từ `ffprobe-static`): Do dịch vụ Zeranoe đã ngừng hoạt động từ tháng 09/2020 và `ffprobe-static` không lưu trữ gói nguồn/script build của 35 thư viện liên kết tĩnh, phần Corresponding Source của các thư viện phụ thuộc trong binary `ffprobe.exe` 4.0.2 này **không thể xác minh đầy đủ**. Xem phương án thay thế cụ thể tại [`docs/CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md).

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

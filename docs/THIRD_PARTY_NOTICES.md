# Thông báo Phần mềm Bên thứ ba & Giấy phép (`docs/THIRD_PARTY_NOTICES.md`)

Ứng dụng **File Compressor** đóng gói kèm các công cụ thực thi độc lập và thư viện mã nguồn mở cho Windows x64 để hoạt động hoàn toàn offline. Dưới đây là thông tin phiên bản, nguồn tải, mã băm SHA-256 và giấy phép tương ứng.

---

## 1. Các Binary Đóng gói trong `resources/bin/win32-x64` (`extraResources`)

### 1.1. FFmpeg (`ffmpeg.exe`) & ffprobe (`ffprobe.exe`)
- **Phiên bản `ffmpeg.exe`**: `ffmpeg version 6.0-essentials_build-www.gyan.dev` (Built with GCC 12.2.0, MSYS2 project)
- **SHA-256 (`ffmpeg.exe`)**: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1`
- **Phiên bản `ffprobe.exe`**: `ffprobe version 4.0.2` (FFmpeg developers)
- **SHA-256 (`ffprobe.exe`)**: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5`
- **Giấy phép**: GNU General Public License v3 (GPLv3) / GNU Lesser General Public License v3 (LGPLv3)
- **Nguồn chính thức & Thông tin pháp lý**: https://ffmpeg.org/legal.html & https://www.gyan.dev/ffmpeg/builds/
- **Cách gọi trong ứng dụng**: Được gọi như tiến trình độc lập bên ngoài ASAR qua `child_process.spawn` (`shell: false`).

### 1.2. QPDF (`qpdf.exe` và các thư viện runtime đi kèm)
- **Phiên bản**: `qpdf version 12.4.2` (MSVC x64 official release)
- **SHA-256 (`qpdf.exe`)**: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`
- **Giấy phép**: Apache License 2.0
- **Nguồn chính thức**: https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip

### 1.3. 7-Zip Standalone Console (`7za.exe`)
- **Phiên bản**: `7-Zip (a) 21.07 (x64)` — Copyright (c) 1999-2021 Igor Pavlov
- **SHA-256 (`7za.exe`)**: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95`
- **Giấy phép**: GNU LGPL v2.1+ / BSD 3-Clause (Chỉ sử dụng cho định dạng `.zip` và `.7z`, không tạo `.rar`)
- **Nguồn chính thức**: https://www.7-zip.org/license.txt

---

## 2. Các Thư viện Native & NPM Chính

| Thư viện | Phiên bản | Giấy phép | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `sharp` (`@img/sharp-win32-x64` + `libvips`) | `0.33.5` (`libvips 8.15.3`) | Apache-2.0 / LGPL-2.1+ | Giải mã, xoay EXIF, quản lý ICC/sRGB, resize và nén ảnh JPEG, PNG, WebP, AVIF |
| `electron` | `33.2.0` | MIT | Nền tảng ứng dụng Desktop đa tiến trình |
| `react` & `react-dom` | `18.3.1` | MIT | Giao diện người dùng |
| `lucide-react` | `0.460.0` | ISC | Bộ biểu tượng giao diện trực quan |
| `pdf-lib` | `1.17.1` | MIT | Sinh dữ liệu fixture PDF phục vụ kiểm thử tự động |
| `tailwindcss` | `3.4.15` | MIT | Hệ thống thiết kế giao diện |


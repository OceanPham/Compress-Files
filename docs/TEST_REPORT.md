# Báo cáo Kiểm thử & Nghiệm thu (`docs/TEST_REPORT.md`)

## 1. Môi trường Kiểm thử Thực tế
- **Hệ điều hành**: Windows 11 x64 (`OS build 10.0.26100`)
- **Node.js / npm**: `v22.19.0` / `npm 10.9.3`
- **Electron**: `33.2.0` (`win32-x64`)
- **Các Engine thực thi đóng gói ngoài ASAR (`resources/bin`)**:
  - `Sharp`: `0.33.5` (`libvips 8.15.3`, giải nén tại `app.asar.unpacked/node_modules`)
  - `FFmpeg`: `6.0-essentials_build` (`ffmpeg.exe`, `--enable-gpl --enable-version3`, SHA-256: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1`)
  - `ffprobe`: `4.0.2` (`ffprobe.exe`, `--enable-gpl --enable-version3`, SHA-256: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5`)
  - `QPDF`: `12.4.2 MSVC x64` (`qpdf.exe`, SHA-256: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`, kèm `qpdf30.dll` và 8 DLL MSVC runtime x64)
  - `7-Zip`: `21.07 x64` (`7za.exe`, SHA-256: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95`)

---

## 2. Kết quả Chạy Kiểm thử Tự động & Thực tế

### 2.1. Kiểm tra Kiểu dữ liệu & Build (`npm run typecheck && npm run build`)
- `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`: **PASS (0 lỗi)**.
- `electron-vite build`: **PASS** (Main `126.19 kB`, Preload `2.69 kB`, Renderer `425.26 kB`).

### 2.2. Bộ Kiểm thử Tích hợp Engine, An toàn File & Hàng đợi (`npm test`)
- **Lệnh chạy**: `npm test` (`vitest run`)
- **Kết quả**: **10 / 10 test suites PASSED (100%)** trong `tests/engines-and-queue.test.ts`:
  1. **Kiểm chứng Binary & Capability Matrix**: Xác nhận đầy đủ `Sharp`, `WebP`, `AVIF`, `FFmpeg (libx264, aac)`, `ffprobe`, `QPDF`, `7za`.
  2. **An toàn Đường dẫn & Chống ghi đè**: Xác nhận `areSameFilePaths()` chặn đường dẫn trùng nguồn (kể cả khác hoa/thường), `allocateUniqueOutputPath()` tự động tạo hậu tố `(1)` khi trùng tên.
  3. **Module Ảnh — EXIF Orientation, Alpha, Preview 100%**:
     - Fixture `exif_orient6.jpg` (`600×400`, EXIF Orientation `6`): Xoay đúng 1 lần thành `400×600`, reset tag Orientation về `1`, không bị xoay kép.
     - Fixture `alpha_transparent.png`: Chuyển sang JPEG gộp nền `#FFFFFF` thành công; giữ nguyên Alpha khi xuất PNG/WebP/AVIF.
     - Tạo Preview Trước/Sau ở Zoom 100% trả về đúng kích thước và dung lượng thật.
  4. **Module Ảnh — Target Size Search & Ranh giới định dạng**:
     - Fixture `large_noisy.jpg` với mục tiêu `<= 350 KB`: Hội tụ thành công (`completed`) dưới ngưỡng `350,000 bytes`.
     - Khi đặt mục tiêu không khả thi (`5 KB`, khóa `minQuality: 90`, `allowResize: false`): Trả về đúng trạng thái `target_unmet` và giữ nguyên file gốc.
     - Từ chối đúng ảnh động (`animated.gif`) và ảnh 16-bit (`hdr_16bit.png` `rgb16/ushort`).
  5. **Module Ảnh — Multi-size & Phân biệt `no_savings` / `converted_not_smaller`**:
     - Xuất đồng thời 2 kích thước (`800px` và `400px`) trong 1 job thành công.
     - Với ảnh đã nén tối ưu (`tiny_already_opt.jpg`): Giữ định dạng báo `no_savings` (giữ nguyên nguồn); yêu cầu đổi sang PNG Lossless báo `converted_not_smaller` kèm kích thước thật.
  6. **Module Video — Nén SDR, 2-Pass Target Size, HDR Rejection & Hủy Process Tree**:
     - Nén video SDR có âm thanh (`1280×720`, `30fps`, `AAC`) sang `MP4 H.264`, kiểm chứng bằng `ffprobe` và giải mã thử (`ffmpeg -v error`), giữ đúng thời lượng và luồng âm thanh.
     - Video dọc (`720×1280`) ở chế độ **Target Size 2-Pass (`1 MB`)**: Hoàn tất dưới `1,000,000 bytes`.
     - Từ chối rõ video `HDR 10-bit (yuv420p10le / smpte2084 / bt2020)` và video hỏng (`corrupt.mp4`).
     - Hủy giữa chừng (`AbortController.abort()`): Dừng ngay cây tiến trình `ffmpeg.exe`, dọn sạch thư mục tạm và trả trạng thái `cancelled`.
  7. **Module PDF — Nén cấu trúc/stream, Bảo toàn số trang, Từ chối mật khẩu & chữ ký số**:
     - Tối ưu PDF 5 trang chưa nén: Giảm dung lượng thực tế, bảo toàn đúng `5/5 trang`.
     - Chạy lại trên file đã tối ưu: Trả về `no_savings`.
     - Phát hiện và từ chối đúng PDF có mật khẩu (`encrypted.pdf`) và PDF có chữ ký số (`digitally_signed.pdf`).
  8. **Module Archive (ZIP & 7z) — Tiếng Việt Unicode, Thư mục rỗng, Trùng tên gốc & Kiểm chứng Hash**:
     - Đóng gói 2 nhánh thư mục trùng tên gốc (`Tài liệu chung`), chứa file tiếng Việt có dấu (`Báo cáo tiếng Việt có dấu 2026.txt`) và `Thư mục rỗng` vào cả `.zip` và `.7z`.
     - Giải nén vào thư mục kiểm tra độc lập và đối chiếu mã băm **SHA-256** của từng file: **Khớp 100% đến từng byte**.
  9. **Phục hồi sau Crash (`LocalStore`)**:
     - Giả lập trạng thái ứng dụng bị đóng đột ngột khi job đang `running`: Khi mở lại, job tự động chuyển sang `interrupted` để người dùng chạy lại.
  10. **Hàng đợi Hỗn hợp (`QueueManager`)**:
      - Chạy batch gồm Ảnh + PDF + Video lỗi: File lỗi được gắn nhãn `unsupported`, các file hợp lệ vẫn chạy đến khi hoàn tất và ghi vào lịch sử.

---

## 3. Kiểm thử Đóng gói, Nội dung ASAR & Cài đặt Thực tế (`Setup .exe`)
- **Đường dẫn Artifact**: `release/File Compressor-Setup-1.0.0-x64.exe`
- **File đối chiếu SHA-256 & Manifest**: `release/File Compressor-Setup-1.0.0-x64.exe.sha256` & `release/RELEASE_MANIFEST.json` *(xem giá trị SHA-256 chính xác của bản build cuối tại hai file này trong thư mục `release/` để tránh lệch vòng lặp hash khi commit)*.
- **Metadata thực thi (`FileCompressor.exe` VersionInfo)**:
  - `ProductName`: `File Compressor`
  - `CompanyName`: `Ngọc Huy Dev - Ocean Labs`
  - `LegalCopyright`: `Copyright © 2026 Ngọc Huy Dev - Ocean Labs`
  - `FileVersion`: `1.0.0`
- **Kiểm tra cấu trúc gói (`win-unpacked`)**:
  - `resources/app.asar`: Chỉ chứa bundle runtime (`out/main`, `out/preload`, `out/renderer`, `package.json`, `resources/icon.png` và runtime dependencies cần thiết); không lẫn `src/`, `tests/`, `docs/`, `scripts/`, `local-handoff/`, `.patch` hay `*.tsbuildinfo`.
  - `resources/app.asar.unpacked`: Chứa `sharp` và `@img/sharp-win32-x64` (`libvips`).
  - `resources/bin`: Chứa đủ `ffmpeg.exe`, `ffprobe.exe`, `qpdf.exe`, `qpdf30.dll` (+ 8 MSVC runtime DLLs) và `7za.exe`.
  - `resources/notices` & `resources/LICENSE`: Chứa `BINARY_MANIFEST.json`, `THIRD_PARTY_NOTICES.txt`, `LICENSE-GPLv3.txt`, `FFMPEG_BUILD_INFO.txt` và `LICENSE`.
- **Kiểm tra cài đặt thực tế**:
  - Chạy cài đặt NSIS (`/S /D=...`) vào thư mục độc lập thành công.
  - Xác nhận đầy đủ `resources/bin/ffmpeg.exe`, `ffprobe.exe`, `qpdf.exe` (+ DLLs), `7za.exe` và `resources/app.asar.unpacked/node_modules/sharp` hoạt động độc lập không cần Node/npm hay PATH hệ thống.
  - Trình gỡ cài đặt (`Uninstall File Compressor.exe`) hoạt động chuẩn xác.
  - Ghi chú về Code Signing: Bản cài đặt hiện tại là **Unsigned artifact** (do không có chứng thư số thương mại được cấp trong môi trường).

## 4. Hạn chế Đã Công bố Rõ
- Không hỗ trợ nén trực tiếp ảnh động (GIF/APNG/WebP động), ảnh RAW/HEIC, hoặc video HDR/10-bit/Dolby Vision (hệ thống tự động phát hiện và báo `unsupported` thay vì làm hỏng màu sắc hoặc mất frame).
- Với PDF chỉ sử dụng tối ưu cấu trúc và nén lại stream không mất dữ liệu qua `qpdf`; không tự động giảm độ phân giải (downsample) ảnh scan bên trong PDF để tránh làm mờ chữ tài liệu.

# Báo cáo Kiểm thử & Nghiệm thu (`docs/TEST_REPORT.md`)

## 1. Môi trường Kiểm thử Thực tế
- **Hệ điều hành**: Windows 11 x64 (`OS build 10.0.26100`)
- **Node.js / npm**: `v22.19.0` / `npm 10.9.3`
- **Electron**: `33.2.0` (`win32-x64`)
- **Các Engine thực thi đóng gói ngoài ASAR (`resources/bin`)**:
  - `Sharp`: `0.33.5` (`libvips 8.15.3`, giải nén tại `app.asar.unpacked/node_modules`)
  - `FFmpeg`: `n7.1.5-12-g1fdbca85aa-20260731` (`ffmpeg.exe`, `--enable-gpl --enable-version3`, SHA-256: `efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de`)
  - `ffprobe`: `n7.1.5-12-g1fdbca85aa-20260731` (`ffprobe.exe`, `--enable-gpl --enable-version3`, SHA-256: `69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2`)
  - `QPDF`: `12.4.2 MSVC x64` (`qpdf.exe`, SHA-256: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`, kèm `qpdf30.dll` và 8 DLL MSVC runtime x64)
  - `7-Zip`: `21.07 x64` (`7za.exe`, SHA-256: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95`)

---

## 2. Kết quả Chạy Kiểm thử Tự động & Thực tế

### 2.1. Kiểm tra Kiểu dữ liệu & Build (`npm run typecheck && npm run build`)
- `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`: **PASS (0 lỗi)**.
- `electron-vite build`: **PASS** (Main `127.25 kB`, Preload `2.85 kB`, Renderer `436.29 kB`).

### 2.2. Kiểm thử Chuyên biệt 7 Hạng mục Xử lý Video trên Windows (`scripts/verify-ffmpeg-windows.mjs`)
- **Lệnh chạy**: `npx vite-node scripts/verify-ffmpeg-windows.mjs`
- **Kết quả**: **7 / 7 bài kiểm tra ĐẠT 100%**:
  1. **Đọc thông tin video thông thường (`probeVideoFile`)**: Nhận diện chuẩn 1920x1080, 30fps, codec h264, 1 audio track AAC, thời lượng 3.00s.
  2. **Nén CRF / Quality Mode & xử lý âm thanh**: Đúng cấu hình `mode: 'quality'`, `encoderPreset: 'slow'`. Nén tiết kiệm 85.8% dung lượng, giữ nguyên luồng âm thanh AAC mono 128 kbps, giải mã và đồng bộ chuẩn xác.
  3. **Nén dung lượng mục tiêu 2-Pass**: Đặt ngân sách 250 KB (250,000 bytes), xuất ra 174,798 bytes (đáp ứng điều kiện dung lượng nghiêm ngặt `<= 250,000 bytes`, pass kiểm tra decode).
  4. **Video dọc & cờ xoay (Metadata Rotate / Display Matrix)**:
     - Nhận diện đúng video dọc tự nhiên 720x1280 (rotation = 0).
     - Nhận diện chính xác Display Matrix rotation 90 độ (`rotated_90deg.mp4`).
     - Nén hoàn tất, video đầu ra tự động chuẩn hóa dạng khung hình dọc 1080x1920 (rotation = 0), đảm bảo hiển thị đúng tỷ lệ khung hình 9:16.
  5. **Đường dẫn và tên file tiếng Việt có dấu Unicode**: Xử lý mượt mà nguồn tại `Thư mục Tiếng Việt có dấu - Ngọc Huy Dev/Video gốc kiểm thử tiếng Việt đầy đủ thanh điệu.mp4` sang `Thư mục xuất - Ocean Labs Việt Nam/...` không bị lỗi font hay ký tự đặc biệt.
  6. **Hủy tác vụ, dọn file tạm và bảo toàn file gốc**: Kích hoạt `AbortController.abort()` khi đang nén -> Dừng ngay cây tiến trình, dọn sạch thư mục tạm `.fc_tmp_*` và không để sót file tạm nào trong thư mục đích. Xác minh không còn tiến trình con `ffmpeg.exe` mồ côi nào chạy ngầm. File gốc được đối chiếu mã SHA-256 trước và sau: **Khớp nguyên vẹn 100%**.
  7. **Tùy chọn phần cứng GPU**: Kiểm tra cờ `useHardwareEncoder: true`. Trên hệ thống không có driver NVENC tương thích, ứng dụng ghi nhận chẩn đoán và tự động fallback sang `libx264` chuẩn, xuất file thành công và kiểm chứng giải mã đạt 100%.

### 2.3. Bộ Kiểm thử Tích hợp Engine, An toàn File & Hàng đợi (`npm test`)
- **Lệnh chạy**: `npm test` (`vitest run`)
- **Kết quả**: **10 / 10 test cases PASSED (100%)** trong 1 test suite (`tests/engines-and-queue.test.ts`).

### 2.4. Đóng gói & Kiểm tra Bộ cài Windows x64 (`npm run dist:win`)
- Tệp bộ cài: `release/File Compressor-Setup-1.0.0-x64.exe` (`172,059,165 bytes`, `~164.09 MB`).
- Mã băm SHA-256: `40BD37AF571E13A435CE691DFFCDD05B6953B920DEA2E8FA5F18371F8285CF2B`.
- Gói Corresponding Source: `release/FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` (`16,046,502 bytes`, SHA-256: `2dd3785d352f8b6ca58d5eda5f083c2dfb267a4955ade901a9d094ab0a8cc6a4`).
- Đối chiếu binary trong `release/win-unpacked/resources/bin`:
  - `ffmpeg.exe`: `efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de` (**KHỚP 100%**)
  - `ffprobe.exe`: `69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2` (**KHỚP 100%**)
  - `qpdf.exe`: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff` (**KHỚP 100%**)
  - `7za.exe`: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` (**KHỚP 100%**)

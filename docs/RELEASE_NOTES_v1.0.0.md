# File Compressor v1.0.0 — Bản Phát Hành Đầu Tiên cho Windows x64

**Phát triển bởi Ngọc Huy Dev · Ocean Labs**  
🌐 Website: [https://oceanlabs.pro.vn/](https://oceanlabs.pro.vn/) · 💬 Zalo hỗ trợ: [0876557737](https://zalo.me/0876557737)

---

## 1. Giới thiệu

**File Compressor v1.0.0** là ứng dụng desktop dành cho **Windows 10/11 (x64)** giúp nén, tối ưu hóa dung lượng và đóng gói file hoàn toàn cục bộ (**100% Offline** sau khi cài đặt). Ứng dụng tuân thủ nguyên tắc **không bao giờ ghi đè lên file gốc**: mọi kết quả được xử lý trong vùng tạm cô lập, kiểm tra toàn vẹn trước khi xuất thành file mới.

### Các nhóm tính năng trong v1.0.0
1. **Ảnh tĩnh (`JPEG`, `PNG`, `WebP`, `AVIF`)**:
   - Nén giữ nguyên định dạng hoặc chuyển đổi định dạng phục vụ tối ưu dung lượng.
   - Tự động chuẩn hóa chiều xoay EXIF (`orientation`), giữ profile màu `ICC` hoặc chuyển về `sRGB`, gộp màu nền khi chuyển ảnh trong suốt sang `JPEG`.
   - Thu nhỏ kích thước (`cạnh dài`, `rộng × cao`, `%`), xuất đa kích thước (`Multi-size`) trong một lần chạy.
   - Dò **Dung lượng mục tiêu (`KB`/`MB`/`KiB`/`MiB`)** và **Xem trước So sánh Trước/Sau ở Zoom 100%**.
2. **Video (`MP4`, `MOV`, `MKV`, `WebM` → `MP4 H.264`)**:
   - Xuất chuẩn `MP4 (H.264 + AAC/Copy)` có `+faststart` tương thích rộng.
   - Hỗ trợ chế độ chất lượng (`CRF`) và **Dung lượng mục tiêu 2-Pass (`MB`/`MiB`)** có tính ngân sách âm thanh & container overhead.
   - Bảo toàn tỷ lệ khung hình dọc/ngang và thời lượng; hỗ trợ hủy tức thì toàn bộ cây tiến trình.
3. **Tài liệu PDF (`QPDF 12.4.2`)**:
   - Tối ưu cấu trúc bảng tham chiếu, nén Object Streams, nén lại luồng Flate mức 9 và tùy chọn Linearize không làm giảm chất lượng hình ảnh/văn bản.
   - Tự động phát hiện và từ chối PDF có mật khẩu hoặc chữ ký số để bảo vệ tính toàn vẹn pháp lý của tài liệu.
4. **Đóng gói Archive (`.zip`, `.7z` qua `7-Zip 7za 21.07`)**:
   - Nén nhiều file và thư mục bất kỳ (hỗ trợ đầy đủ tên tiếng Việt Unicode, thư mục rỗng, tự động xử lý trùng tên thư mục gốc) và kiểm chứng CRC (`7za t`) ngay sau khi đóng gói.

---

## 2. Giới hạn & Ranh giới Đã Công bố Rõ

- **Các định dạng ngoài phạm vi xử lý trực tiếp** (ứng dụng sẽ tự động nhận diện và thông báo rõ trạng thái `Không hỗ trợ` thay vì âm thầm làm hỏng file):
  - Ảnh động (`GIF`, `APNG`, `WebP` động), ảnh nhiều trang (`TIFF`), ảnh `HEIC`/`RAW`, ảnh `16-bit/HDR`.
  - Video `HDR / 10-bit / Dolby Vision / HLG`.
  - PDF bị khóa mật khẩu hoặc có chữ ký số.
- **Lưu ý về PDF scan**: Ứng dụng chỉ tối ưu cấu trúc và nén lại stream không mất dữ liệu (`lossless stream compression`), không tự động giảm độ phân giải ảnh scan bên trong PDF để tránh làm mờ chữ. Với PDF đã tối ưu sẵn, ứng dụng sẽ thông báo `Không giảm thêm` và giữ nguyên file gốc.

---

## 3. Tải về, Kiểm tra SHA-256 & Cài đặt

### File đính kèm trong bản phát hành
- `File Compressor-Setup-1.0.0-x64.exe` — Bộ cài đặt chuẩn NSIS cho Windows 10/11 x64.
- `File Compressor-Setup-1.0.0-x64.exe.sha256` — Mã băm SHA-256 để kiểm tra tính toàn vẹn.

### Kiểm tra mã băm SHA-256 bằng PowerShell
```powershell
Get-FileHash ".\File Compressor-Setup-1.0.0-x64.exe" -Algorithm SHA256
Get-Content ".\File Compressor-Setup-1.0.0-x64.exe.sha256"
```

### Lưu ý khi cài đặt trên Windows (Unsigned Build)
Bản phát hành `v1.0.0` hiện chưa ký chứng thư số thương mại (Code Signing). Khi khởi chạy bộ cài lần đầu, nếu Windows SmartScreen hiển thị hộp thoại **Windows protected your PC**, bạn chỉ cần bấm **More info (Thêm thông tin)** → **Run anyway (Vẫn chạy)** sau khi đã kiểm tra khớp mã SHA-256.

---

## 4. Giấy phép & Thành phần Bên thứ ba

- **Giấy phép ứng dụng**: `GPL-3.0-or-later` (toàn văn trong file `LICENSE` ở kho mã nguồn và trong thư mục cài đặt).
- **Các công cụ đóng gói kèm (`extraResources` / `app.asar.unpacked`)**:
  - `FFmpeg 6.0` & `ffprobe 4.0.2` (`GPL-3.0-or-later`)
  - `QPDF 12.4.2` (`Apache-2.0`)
  - `7-Zip Standalone Console 21.07` (`LGPL-2.1-or-later` + `BSD-3-Clause`)
  - `Sharp 0.33.5` / `libvips 8.15.3` (`Apache-2.0` / `LGPL-2.1-or-later`)
  - Chi tiết mã băm SHA-256 và nguồn mã nguồn gốc được đính kèm tại `docs/THIRD_PARTY_NOTICES.md` và `resources/notices/`.


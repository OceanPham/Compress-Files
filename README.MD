# File Compressor — Ứng dụng Nén & Tối ưu Dung lượng File cho Windows x64

**File Compressor** là ứng dụng desktop hiện đại cho Windows x64, cho phép nén và tối ưu hóa dung lượng **Ảnh tĩnh** (`JPEG`, `PNG`, `WebP`, `AVIF`), **Video** (`MP4`, `MOV`, `MKV`, `WebM` xuất sang `MP4 H.264`), **Tài liệu PDF** (`QPDF`) và đóng gói **Archive** (`.zip`, `.7z`) hoàn toàn cục bộ (**100% Offline** sau khi cài đặt).

---

## 1. Tính năng nổi bật

- **An toàn dữ liệu gốc tuyệt đối**: Mọi file đầu vào chỉ được đọc (immutable). Quá trình xử lý diễn ra trong thư mục tạm cô lập, được kiểm chứng giải mã/cấu trúc rồi mới xuất ra đường dẫn mới. Không bao giờ ghi đè ngầm lên file gốc.
- **4 Nhóm công cụ trong một ứng dụng**:
  1. **Ảnh tĩnh (`Sharp / libvips`)**: Tối ưu nguyên định dạng hoặc chuyển đổi giữa `JPEG`, `PNG`, `WebP`, `AVIF`; tự động chuẩn hóa chiều xoay EXIF (`orientation`) không xoay kép; quản lý profile màu (`ICC` / `sRGB`); gộp nền trong suốt khi sang JPEG; thu nhỏ kích thước (`cạnh dài`, `rộng × cao`, `%`); xuất đa kích thước (`Multi-size`); dò **Dung lượng mục tiêu (`KB`/`MB`/`KiB`/`MiB`)** và **Xem trước So sánh Trước/Sau ở Zoom 100%**.
  2. **Video (`FFmpeg + ffprobe`)**: Đọc thông số thực tế từ container/stream, xuất chuẩn `MP4 (H.264 + AAC/Copy)` có `+faststart`; hỗ trợ chế độ chất lượng (`CRF`) và **Dung lượng mục tiêu 2-Pass (`MB`/`MiB`)** có tính ngân sách trừ âm thanh và container overhead; bảo toàn tỷ lệ khung hình dọc/ngang và thời lượng; từ chối rõ nguồn HDR/10-bit thay vì tự ý tone-map làm sai màu.
  3. **Tài liệu PDF (`QPDF 12.4.2`)**: Tối ưu cấu trúc bảng tham chiếu, tạo Object Streams, nén lại luồng dữ liệu Flate mức 9 và tùy chọn Linearize không làm giảm chất lượng hình ảnh/văn bản; tự động phát hiện và từ chối PDF có mật khẩu hoặc chữ ký số để không làm hỏng tính pháp lý của tài liệu.
  4. **Archive (`7-Zip 7za`)**: Đóng gói nhiều file và thư mục bất kỳ (hỗ trợ tên tiếng Việt Unicode, thư mục rỗng, tự động giải quyết trùng tên thư mục gốc) thành `.zip` hoặc `.7z` và kiểm chứng toàn vẹn CRC (`7za t`) sau khi tạo.
- **Hàng đợi & Phục hồi**: Giới hạn xử lý đồng thời theo từng loại file, hỗ trợ tạm dừng nhận việc mới, hủy toàn bộ cây tiến trình con (`taskkill /T /F`), lưu lịch sử cục bộ và tự động đánh dấu `interrupted` để chạy lại nếu ứng dụng đóng đột ngột ở phiên trước.

---

## 2. Yêu cầu Môi trường Phát triển (Development)

- **Hệ điều hành**: Windows 10 / 11 (x64)
- **Node.js**: `>= 20.x` (Đã kiểm chứng trên `v22.19.0`)
- **Trình quản lý gói**: `npm >= 10.x`

---

## 3. Hướng dẫn Cài đặt, Chạy, Kiểm thử & Đóng gói Setup `.exe`

```powershell
# 1. Cài đặt dependencies
npm install

# 2. Tạo bộ icon ứng dụng (.ico / .png) và chuẩn bị bộ binary đóng gói (ffmpeg, ffprobe, qpdf, 7za)
npm run generate:icons
npm run prepare:binaries

# 3. Kiểm tra kiểu dữ liệu TypeScript (Strict mode)
npm run typecheck

# 4. Chạy bộ kiểm thử tự động (Vitest — kiểm thử thực tế trên 4 engine, file safety và queue)
npm test

# 5. Chạy ứng dụng ở chế độ phát triển (Development mode với Hot Reload)
npm run dev

# 6. Build mã nguồn và đóng gói bộ cài đặt Windows x64 NSIS Setup (.exe)
npm run dist:win
```

---

## 4. Vị trí Artifact Bộ cài đặt

Sau khi chạy `npm run dist:win`, bộ cài đặt được xuất tại:
- **Bản cài đặt NSIS Setup**: `release/File Compressor-Setup-1.0.0-x64.exe`
- **Thư mục kiểm tra đóng gói giải nén**: `release/win-unpacked/FileCompressor.exe`
- **Manifest & Thông báo giấy phép đi kèm**: `resources/notices/BINARY_MANIFEST.json` và `resources/notices/THIRD_PARTY_NOTICES.txt`

---

## 5. Tài liệu Dự án

- [Kế hoạch triển khai (`docs/IMPLEMENTATION_PLAN.md`)](docs/IMPLEMENTATION_PLAN.md)
- [Đặc tả sản phẩm (`docs/PRODUCT_SPEC.md`)](docs/PRODUCT_SPEC.md)
- [Kiến trúc hệ thống (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- [Bảng hỗ trợ định dạng & giới hạn (`docs/FORMAT_SUPPORT.md`)](docs/FORMAT_SUPPORT.md)
- [Báo cáo kiểm thử & nghiệm thu (`docs/TEST_REPORT.md`)](docs/TEST_REPORT.md)
- [Giấy phép & thông tin phần mềm bên thứ ba (`docs/THIRD_PARTY_NOTICES.md`)](docs/THIRD_PARTY_NOTICES.md)
- [Theo dõi tiến độ (`PROGRESS.md`)](PROGRESS.md)

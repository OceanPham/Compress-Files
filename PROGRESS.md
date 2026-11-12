# Tiến độ Thực thi (PROGRESS.md)

## Trạng thái tổng quan
- **Mốc hiện tại**: **HOÀN TẤT TOÀN BỘ (Mốc A → G)**
- **Bộ cài đặt Windows x64**: `release/File Compressor-Setup-1.0.0-x64.exe`
- **SHA-256**: `2FAB2431916E7804614FA165E912E2824D1EFCAEE66EFBF2B2715B2BE8A7DCA3`

---

## Chi tiết các mốc đã hoàn thành

### [x] Mốc A: Khảo sát repo, chốt scope và tài liệu triển khai ngắn
- Khảo sát thư mục dự án, môi trường Windows x64, Node.js `v22.19.0`.
- Thiết lập kế hoạch tại `docs/IMPLEMENTATION_PLAN.md` và bảng hỗ trợ định dạng `docs/FORMAT_SUPPORT.md`.

### [x] Mốc B: Vertical slice (Import 1 ảnh & 1 video, nén thật, xuất thật, tạo Setup thử)
- Tạo script `scripts/generate-icons.mjs` sinh bộ icon đa độ phân giải `build/icon.ico` & `resources/icon.png`.
- Tạo script `scripts/prepare-binaries.mjs` đóng gói `ffmpeg.exe`, `ffprobe.exe`, `qpdf.exe` (+ DLLs MSVC x64) và `7za.exe` vào `resources/bin/win32-x64` kèm manifest SHA-256 tại `resources/notices/BINARY_MANIFEST.json`.
- Xác nhận nén thật Ảnh (`Sharp`) và Video (`FFmpeg`) cùng đóng gói NSIS Setup.

### [x] Mốc C: Xây dựng UI hoàn chỉnh, API nội bộ, quản lý file/output, hàng đợi và persistence
- Xây dựng `LocalStore` (`src/main/store/localStore.ts`) ghi JSON nguyên tử (`atomic rename`), hỗ trợ khôi phục trạng thái `interrupted` sau khi đóng đột ngột.
- Xây dựng `QueueManager` (`src/main/queue/queueManager.ts`) quản lý giới hạn xử lý song song theo từng loại file, tạm dừng/tiếp tục hàng đợi, hủy cây tiến trình (`taskkill /PID /T /F`), lịch sử xử lý.
- Xây dựng `FileSafety` (`src/main/utils/fileSafety.ts`) nhận diện header/magic bytes, chặn ghi đè nguồn, khóa chống trùng tên đầu ra và quét đệ quy an toàn (bỏ qua symlink/junction và file tạm).
- Xây dựng giao diện React + Tailwind tiếng Việt hoàn chỉnh (`src/renderer/src/App.tsx`, `ConfigSidebar.tsx`, `ImagePreviewModal.tsx`, `StatusBadge.tsx`), hỗ trợ Sáng / Tối / Theo hệ thống.

### [x] Mốc D: Hoàn thành module ảnh và video (preset, preview, target-size, cancel, kiểm tra đầu ra)
- Module Ảnh (`src/main/engines/imageAdapter.ts`): Hỗ trợ JPEG, PNG, WebP, AVIF; xoay EXIF Orientation đúng 1 lần; giữ ICC hoặc chuyển sRGB; gộp nền Alpha khi sang JPEG; dò **Target Size (`KB`/`MB`/`KiB`/`MiB`)** hữu hạn; xuất **Multi-size**; **Xem trước Trước/Sau ở Zoom 100%** có đồng bộ cuộn và debounce.
- Module Video (`src/main/engines/videoAdapter.ts`): Probe bằng `ffprobe`, từ chối rõ HDR/10-bit/Dolby Vision; xuất `MP4 (H.264 + AAC/Copy)` có `+faststart`; hỗ trợ chế độ CRF và **Target Size 2-Pass** có tính ngân sách bitrate và độ phân giải sàn; kiểm chứng đầu ra bằng `ffprobe` và decode test.

### [x] Mốc E: Hoàn thành PDF và ZIP/7z, tích hợp hàng đợi và lịch sử
- Module PDF (`src/main/engines/pdfAdapter.ts`): Tối ưu cấu trúc, tạo Object Streams, nén lại luồng Flate mức 9 và Linearize qua `qpdf`; phát hiện và từ chối PDF có mật khẩu hoặc chữ ký số; kiểm chứng số trang trước/sau.
- Module Archive (`src/main/engines/archiveAdapter.ts`): Tạo `.zip` và `.7z` qua `7za.exe`; bảo toàn tên tiếng Việt Unicode và thư mục rỗng; tự động đổi tên khi trùng thư mục gốc; phát hiện nếu nguồn bị sửa đổi trong lúc chạy; kiểm chứng toàn vẹn `7za t`.

### [x] Mốc F: Hoàn thiện xử lý lỗi, visual QA, bộ cài, offline, upgrade và bộ kiểm thử cuối
- Chạy bộ kiểm thử tự động `tests/engines-and-queue.test.ts` (10 test suites lớn bao phủ toàn bộ 4 engine, biên lỗi, hủy tiến trình, phục hồi crash và hàng đợi hỗn hợp): **10/10 PASS**.
- Đóng gói và kiểm thử cài đặt thực tế (`File Compressor-Setup-1.0.0-x64.exe`), xác nhận các binary trong thư mục cài đặt hoạt động độc lập và gỡ cài đặt sạch.

### [x] Mốc G: Bàn giao source, artifact, tài liệu, kết quả và giới hạn thực tế
- Hoàn thiện toàn bộ tài liệu bàn giao: `README.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FORMAT_SUPPORT.md`, `docs/TEST_REPORT.md`, `docs/THIRD_PARTY_NOTICES.md`, `PROGRESS.md`.

---

## Known Issues & Hướng phát triển tiếp theo
- **Known Issues**: Không có lỗi chặn. Bản cài đặt `.exe` hiện chưa ký chứng thư số thương mại (Unsigned build) nên Windows SmartScreen có thể hiển thị thông báo xác nhận khi chạy trên máy khác.
- **Hướng tiếp theo (Future Scope)**:
  - Tích hợp ký số (Code Signing) trong CI/CD khi có chứng thư EV/OV.
  - Bổ sung tùy chọn chuyển mã HEVC / AV1 cho Video khi người dùng chọn container đầu ra nâng cao.

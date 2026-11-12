# Kế hoạch Triển khai — File Compressor (Windows x64 Desktop App)

## 1. Tổng quan & Mục tiêu
Xây dựng ứng dụng desktop **File Compressor** cho Windows x64 (bản cài đặt NSIS Setup `.exe`), hoạt động hoàn toàn offline sau khi cài đặt, tối ưu hóa dung lượng cho 4 nhóm định dạng chính:
1. **Ảnh tĩnh**: JPEG, PNG, WebP, AVIF (qua `sharp`), hỗ trợ tối ưu nguyên định dạng, đổi định dạng, resize (cạnh dài, rộng/cao, %), xử lý EXIF orientation, quản lý ICC/sRGB, metadata policy, multi-size preset và target size (binary/step search hữu hạn).
2. **Video**: MP4, MOV, MKV, WebM (qua `ffmpeg` + `ffprobe` đóng gói sẵn), xuất MP4 (H.264 + AAC/copy), hỗ trợ preset chất lượng (CRF), chế độ dung lượng mục tiêu (2-pass bitrate calculation có trừ audio & container overhead, giới hạn độ phân giải/fps tối thiểu), kiểm soát HDR/10-bit/multi-track rõ ràng.
3. **PDF**: Tối ưu cấu trúc, object streams và nén lại stream không mất chất lượng thông qua `qpdf` đóng gói sẵn; phát hiện PDF có mật khẩu hoặc chữ ký số để từ chối an toàn thay vì làm hỏng chữ ký.
4. **Archive (ZIP / 7z)**: Đóng gói nhiều file/thư mục thành `.zip` hoặc `.7z` qua `7za` (7-Zip CLI đóng gói sẵn) với các mức độ nén Nhanh / Cân bằng / Nén cao, giữ nguyên cấu trúc thư mục & tên Unicode, kiểm tra tính toàn vẹn (`7za t`) sau khi tạo.

## 2. Kiến trúc & Công nghệ
- **Runtime & Bundler**: Electron + `electron-vite` + TypeScript (strict mode).
- **UI/UX**: React 18 + Tailwind CSS + Lucide Icons, hỗ trợ sáng/tối/hệ thống, ngôn ngữ mặc định Tiếng Việt.
- **Đóng gói**: `electron-builder` xuất bản cài đặt NSIS Setup `.exe` (Windows x64, per-user mặc định, có icon riêng, unpack native modules & bundled binaries trong `extraResources` / `asarUnpack`).
- **Phân tách Process**:
  - `src/main`: Quản lý vòng đời app, IPC handlers có xác thực payload/path, Queue Manager (concurrency control, pause/resume queue, cancel process tree, crash recovery `interrupted`), Local Store (atomic JSON persistence có schema version), Engine Adapters (`ImageAdapter`, `VideoAdapter`, `PdfAdapter`, `ArchiveAdapter`).
  - `src/preload`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, chỉ expose API nghiệp vụ có kiểu dữ liệu rõ ràng (`window.compressorApi`).
  - `src/renderer`: Giao diện người dùng hiện đại (4 khu vực: Nén Media/PDF, Tạo ZIP/7z, Lịch sử, Cài đặt), Preview so sánh ảnh Trước/Sau ở zoom 100% (debounce), quản lý hàng đợi, bộ lọc, cấu hình và preset cá nhân.

## 3. Lộ trình Thực thi (Milestones A → G)
- **Mốc A**: Khảo sát môi trường, thiết lập cấu trúc dự án `electron-vite`, tài liệu kế hoạch (`docs/IMPLEMENTATION_PLAN.md`, `PROGRESS.md`, `docs/FORMAT_SUPPORT.md`).
- **Mốc B**: Vertical slice — đóng gói các binary thực thi (`sharp`, `ffmpeg`, `ffprobe`, `qpdf`, `7za`), chạy thử nghiệm nén thật trên 1 ảnh và 1 video, đóng gói bản cài thử NSIS Setup `.exe` đầu tiên.
- **Mốc C**: Hoàn thiện kiến trúc Core — Local Store (atomic write, crash recovery), Queue Manager (concurrency, process tree cancellation, pause/resume), File safety & naming collision resolver, cùng giao diện React hoàn chỉnh.
- **Mốc D**: Hoàn thiện sâu Module Ảnh (preview Trước/Sau 100%, EXIF orientation, ICC/sRGB, alpha background, target-size search, multi-size output) & Module Video (ffprobe capability matrix, HDR/10-bit detection, 2-pass target-size, machine-readable progress, stream validation).
- **Mốc E**: Hoàn thiện Module PDF (`qpdf` structural/stream compression, phát hiện mật khẩu/chữ ký số, page count verification) & Module Archive (`7za` ZIP/7z creation, root folder collision resolution, integrity verification).
- **Mốc F**: Kiểm thử rủi ro thực tế với bộ fixture đầy đủ (Ảnh, Video, PDF, Archive, Queue/App edge cases), Visual QA, đóng gói bản Setup `.exe` cuối cùng và kiểm tra hoạt động thực tế.
- **Mốc G**: Hoàn thiện toàn bộ tài liệu bàn giao (`README.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FORMAT_SUPPORT.md`, `docs/TEST_REPORT.md`, `docs/THIRD_PARTY_NOTICES.md`, `PROGRESS.md`) và tổng kết SHA-256 artifact.

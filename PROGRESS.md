# Tiến độ Thực thi (PROGRESS.md)

## Trạng thái tổng quan
- **Mốc hiện tại**: **HOÀN TẤT TOÀN BỘ (Mốc A → G + Nhận diện tác giả Ocean Labs + Chuẩn bị Phát hành v1.0.0)**
- **Phiên bản phát hành**: `1.0.0` (`Windows x64 NSIS Setup`)
- **Bộ cài đặt Windows x64**: `release/File Compressor-Setup-1.0.0-x64.exe`
- **File đối chiếu SHA-256 & Manifest phát hành**: `release/File Compressor-Setup-1.0.0-x64.exe.sha256` và `release/RELEASE_MANIFEST.json` *(tách khỏi file tracked trong Git để tránh vòng lặp lệch hash giữa commit source và NSIS timestamp khi đóng gói bản cuối)*.

---

## Chi tiết các mốc đã hoàn thành

### [x] Mốc A: Khảo sát repo, chốt scope và tài liệu triển khai ngắn
- Khảo sát thư mục dự án, môi trường Windows x64, Node.js `v22.19.0`.
- Thiết lập kế hoạch tại `docs/IMPLEMENTATION_PLAN.md` và bảng hỗ trợ định dạng `docs/FORMAT_SUPPORT.md`.

### [x] Mốc B: Vertical slice (Import 1 ảnh & 1 video, nén thật, xuất thật, tạo Setup thử)
- Tạo script `scripts/generate-icons.mjs` sinh bộ icon đa độ phân giải `build/icon.ico`, `build/icon.png` & `resources/icon.png`.
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
- Hoàn thiện toàn bộ tài liệu bàn giao: `README.MD`, `CHANGELOG.md`, `docs/RELEASE_NOTES_v1.0.0.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FORMAT_SUPPORT.md`, `docs/TEST_REPORT.md`, `docs/THIRD_PARTY_NOTICES.md`, `PROGRESS.md`.

---

## Nhận diện Tác giả & Chuẩn bị Phát hành Công khai — 2026-11-13
- **Nhận diện tác giả Ocean Labs**:
  - Thêm dấu tác giả **Ngọc Huy Dev · Ocean Labs** (`src/renderer/src/components/AuthorCredit.tsx`) ở cuối sidebar; bấm để mở và focus thẻ **Giới thiệu & Liên hệ** (`src/renderer/src/components/AboutCard.tsx`) trong Cài đặt & Hỗ trợ.
  - Thẻ liên hệ có website `https://oceanlabs.pro.vn/`, Zalo `0876557737`, nút mở liên kết ngoài và sao chép số điện thoại. Thông tin dùng chung tại `src/shared/branding.ts`; phiên bản lấy từ ứng dụng.
  - Đồng bộ author/homepage/copyright trong `package.json`, `electron-builder.yml`, tiêu đề cửa sổ và `README.MD`.
- **Dọn Repo, Chuẩn hóa Binary & Giấy phép GPLv3**:
  - Bỏ theo dõi `tsconfig.web.tsbuildinfo` khỏi Git (`git rm --cached`), chuyển các file bàn giao tạm (`FileCompressor-OceanLabs-Branding.patch`, `HUONG_DAN.md`, `PROMPT_CHO_AGENT.md`) vào `local-handoff/` (được ignore khỏi Git và loại trừ khỏi gói `app.asar`).
  - Chuẩn hóa `scripts/prepare-binaries.mjs`: Loại bỏ đường dẫn fallback phụ thuộc máy cá nhân, ghim cứng QPDF `v12.4.2` (`qpdf-12.4.2-msvc64.zip`) kèm kiểm tra SHA-256 `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`, xuất đầy đủ cấu hình biên dịch (`--enable-gpl --enable-version3`) và danh sách DLL runtime vào `resources/notices/BINARY_MANIFEST.json`.
  - Bổ sung toàn văn giấy phép GNU GPLv3 tại `LICENSE` và `resources/notices/LICENSE-GPLv3.txt`, thông tin build FFmpeg tại `resources/notices/FFMPEG_BUILD_INFO.txt`, nhật ký phiên bản `CHANGELOG.md` và ghi chú phát hành `docs/RELEASE_NOTES_v1.0.0.md`.

## Quản lý Chủ động Bộ Binary FFmpeg & Hoàn tất Corresponding Source — 2026-11-13
- **Chuyển đổi bộ binary đồng nhất (Unified Build)**:
  - Thay thế toàn bộ `ffmpeg.exe` (Gyan 6.0 cũ) và `ffprobe.exe` (Zeranoe 4.0.2 cũ) sang bản build đồng nhất từ [BtbN/FFmpeg-Builds](https://github.com/FFmpeg-Builds/FFmpeg-Builds) (tag `autobuild-2026-07-31-14-10`, GCC 15.2.0, commit `1fdbca85aaea513c9cc6c14d347f76543346d3da`, ghim 120 thư viện phụ thuộc).
  - Gỡ bỏ hoàn toàn dependency không còn dùng `ffmpeg-static` và `ffprobe-static` khỏi `package.json`.
  - Cập nhật `scripts/prepare-binaries.mjs` kiểm tra mã băm SHA-256 nghiêm ngặt cho tệp zip, `ffmpeg.exe` (`efabedca4b59...`) và `ffprobe.exe` (`69743e708062...`).
- **Lưu trữ công thức build & gói mã nguồn phát hành**:
  - Lưu trữ toàn bộ công thức build vào thư mục `third_party/ffmpeg-build-recipe/` kèm `DEPENDENCY_SOURCE_MANIFEST.json`.
  - Tạo script `scripts/bundle-ffmpeg-corresponding-source.mjs` tạo gói phát hành `release/FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` (`15.30 MB`, SHA-256: `2120cc865dfdf0423ea1bdefbdb24ee6c21d77f00e3a89b621f587793af12217`).
  - Chuẩn bị workflow GitHub Actions `.github/workflows/build-ffmpeg-source.yml` cho phép tự động biên dịch lại trên nền tảng Linux độc lập.
- **Kiểm thử chuyên sâu 7 hạng mục trên Windows**:
  - Viết và chạy `scripts/verify-ffmpeg-windows.mjs`: Kiểm tra đọc thông tin SDR/khung hình, nén CRF kèm âm thanh AAC, nén dung lượng mục tiêu 2-Pass (250 KB), video dọc 720x1280 & cờ xoay Display Matrix 90 độ, đường dẫn và tên file có dấu tiếng Việt Unicode, hủy tác vụ đang chạy (`AbortController`) bảo toàn file gốc nguyên vẹn, và kiểm tra tăng tốc phần cứng GPU: **Tất cả 7/7 bài kiểm tra đạt 100%**.
  - Toàn bộ test suite tự động `npm test` đạt **10/10 PASS**.
- **Đóng gói lại bộ cài đặt Setup .exe**:
  - Build lại `release/File Compressor-Setup-1.0.0-x64.exe` (`172,059,165 bytes`, SHA-256: `40BD37AF571E13A435CE691DFFCDD05B6953B920DEA2E8FA5F18371F8285CF2B`).
  - Kiểm tra các binary bên trong `release/win-unpacked/resources/bin` khớp 100% với `BINARY_MANIFEST.json`.

## Known Issues & Hướng phát triển tiếp theo
- **Known Issues**: Không có lỗi chặn. Bản cài đặt `.exe` hiện chưa ký chứng thư số thương mại (Unsigned build) nên Windows SmartScreen có thể hiển thị thông báo xác nhận khi chạy trên máy khác.
- **Hướng tiếp theo (Future Scope)**:
  - Tích hợp ký số (Code Signing) trong CI/CD khi có chứng thư EV/OV.
  - Bổ sung tùy chọn chuyển mã HEVC / AV1 cho Video khi người dùng chọn container đầu ra nâng cao.

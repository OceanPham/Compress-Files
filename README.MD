# File Compressor — Ứng dụng Nén & Tối ưu Dung lượng File cho Windows x64

**Phát triển bởi Ngọc Huy Dev · Ocean Labs**

[Website: oceanlabs.pro.vn](https://oceanlabs.pro.vn/) · [Zalo hỗ trợ: 0876557737](https://zalo.me/0876557737) · [GitHub Repository](https://github.com/OceanPham/Compress-Files)

**File Compressor** là ứng dụng desktop cho Windows x64 giúp nén, chuyển đổi tối ưu và đóng gói dung lượng **Ảnh tĩnh** (`JPEG`, `PNG`, `WebP`, `AVIF`), **Video** (`MP4`, `MOV`, `MKV`, `WebM` sang `MP4 H.264`), **Tài liệu PDF** (`QPDF`) và **Archive** (`.zip`, `.7z`). Toàn bộ quá trình xử lý diễn ra cục bộ trên máy người dùng (**100% Offline** sau khi cài đặt), bảo toàn nguyên vẹn file gốc.

---

## 1. Tải về & Cài đặt (Người dùng Windows)

### Yêu cầu hệ thống
- **Hệ điều hành**: Windows 10 hoặc Windows 11 (64-bit / `x64`).
- **Kết nối mạng**: **Không yêu cầu** sau khi cài đặt (mọi công cụ nén `Sharp/libvips`, `FFmpeg`, `ffprobe`, `QPDF 12.4.2`, `7-Zip 7za` đã được đóng gói sẵn bên trong bộ cài).

### Tải bộ cài đặt
- **Trang phát hành chính thức**: [GitHub Releases — OceanPham/Compress-Files](https://github.com/OceanPham/Compress-Files/releases) *(Trạng thái: Đang chờ tạo GitHub Release công khai cho `v1.0.0`)*.
- **Tên file bộ cài**: `File Compressor-Setup-1.0.0-x64.exe`
- **File kiểm tra toàn vẹn**: `File Compressor-Setup-1.0.0-x64.exe.sha256`

### Cách cài đặt & Kiểm tra SHA-256 trên Windows
1. *(Tùy chọn)* Kiểm tra mã băm SHA-256 bằng PowerShell trước khi chạy:
   ```powershell
   Get-FileHash ".\File Compressor-Setup-1.0.0-x64.exe" -Algorithm SHA256
   Get-Content ".\File Compressor-Setup-1.0.0-x64.exe.sha256"
   ```
2. Chạy `File Compressor-Setup-1.0.0-x64.exe`, chọn thư mục cài đặt và hoàn tất trình cài đặt NSIS.
3. Mở **File Compressor** từ Desktop hoặc Start Menu.
   > **Lưu ý về Windows SmartScreen**: Bản phát hành `v1.0.0` hiện chưa ký chứng thư số thương mại (Unsigned build). Nếu Windows SmartScreen hiển thị cảnh báo *Windows protected your PC*, bấm **More info (Thêm thông tin)** → **Run anyway (Vẫn chạy)** sau khi đã đối chiếu khớp mã SHA-256.

---

## 2. Khả năng Thực tế & Giới hạn Công bố Rõ

- **An toàn dữ liệu gốc tuyệt đối**: Mọi file đầu vào chỉ được đọc (immutable). Kết quả luôn được tạo trong thư mục tạm cô lập, kiểm tra giải mã/cấu trúc hợp lệ rồi mới xuất sang file mới; ứng dụng không bao giờ ghi đè lên file gốc.
- **4 Nhóm công cụ trong cùng ứng dụng**:
  1. **Ảnh tĩnh (`Sharp / libvips`)**:
     - **Hỗ trợ**: Nén giữ nguyên định dạng hoặc chuyển đổi giữa `JPEG`, `PNG`, `WebP`, `AVIF`; tự động xoay đúng chiều EXIF (`orientation`) một lần duy nhất; giữ profile màu `ICC` hoặc chuyển về `sRGB`; gộp nền màu tùy chọn khi chuyển ảnh có kênh trong suốt (Alpha) sang `JPEG`; thu nhỏ kích thước (`cạnh dài`, `rộng × cao`, `%`); xuất đa kích thước (`Multi-size`); dò **Dung lượng mục tiêu (`KB`/`MB`/`KiB`/`MiB`)** và **Xem trước So sánh Trước/Sau ở Zoom 100%**.
     - **Ngoài phạm vi (tự động nhận diện & báo rõ)**: Ảnh động (`GIF`, `APNG`, `WebP` động), ảnh đa trang (`TIFF`), ảnh `HEIC`/`RAW` hoặc ảnh `16-bit/HDR`. Không bao gồm tính năng AI upscale, khử nhiễu hay làm nét.
  2. **Video (`FFmpeg + ffprobe`)**:
     - **Hỗ trợ**: Đọc thông số thực tế từ container/stream (`MP4`, `MOV`, `MKV`, `WebM`), xuất chuẩn `MP4 (H.264 + AAC/Copy)` có `+faststart`; hỗ trợ chế độ chất lượng (`CRF`) và **Dung lượng mục tiêu 2-Pass (`MB`/`MiB`)** có tính ngân sách trừ âm thanh và container overhead; bảo toàn tỷ lệ khung hình dọc/ngang và thời lượng; hỗ trợ hủy toàn bộ cây tiến trình ngay lập tức.
     - **Ngoài phạm vi (tự động nhận diện & báo rõ)**: Video `HDR / 10-bit / Dolby Vision / HLG` (từ chối rõ để không làm sai lệch màu sắc khi không có pipeline tone-mapping chuyên dụng).
  3. **Tài liệu PDF (`QPDF 12.4.2`)**:
     - **Hỗ trợ**: Tối ưu cấu trúc bảng tham chiếu (xref), đóng gói Object Streams, nén lại luồng Flate mức 9 và tùy chọn Linearize không làm giảm chất lượng văn bản/hình ảnh; kiểm chứng bảo toàn đủ số trang trước và sau khi tối ưu.
     - **Giới hạn & Ngoài phạm vi**: Không giảm độ phân giải ảnh scan bên trong PDF (vì vậy các file PDF scan đã nén JPEG sẵn có thể trả về trạng thái `Không giảm thêm` và giữ nguyên gốc). Tự động phát hiện và từ chối PDF có mật khẩu hoặc chữ ký số để không làm hỏng tính pháp lý của tài liệu.
  4. **Archive (`7-Zip 7za 21.07`)**:
     - **Hỗ trợ**: Đóng gói nhiều file và thư mục bất kỳ (hỗ trợ tên tiếng Việt Unicode, thư mục rỗng, tự động giải quyết trùng tên thư mục gốc) thành `.zip` hoặc `.7z` và tự động kiểm tra toàn vẹn dữ liệu (`7za t`) sau khi tạo.

---

## 3. Hướng dẫn Build từ Mã nguồn (Dành cho Lập trình viên)

### Yêu cầu môi trường build
- **Hệ điều hành**: Windows 10 / 11 x64
- **Node.js**: `>= 20.x` (đã kiểm chứng trên `v22.19.0`) & `npm >= 10.x`

### Quy trình chuẩn bị & đóng gói
> **Lưu ý về kết nối mạng khi build**: Bước `npm ci` và lần chạy đầu tiên của `npm run prepare:binaries` cần kết nối mạng để tải dependencies và gói `qpdf-12.4.2-msvc64.zip` chính thức (đã ghim cứng phiên bản `v12.4.2` và kiểm tra mã băm SHA-256 của `qpdf.exe`). Sau khi `resources/bin/win32-x64` đã có đủ binary hoặc khi truyền biến môi trường `QPDF_WIN64_ZIP_PATH`, toàn bộ quá trình build, kiểm thử và ứng dụng sau cài đặt đều chạy **100% Offline**.

```powershell
# 1. Cài đặt đúng phiên bản dependencies từ package-lock.json
npm ci

# 2. (Tùy chọn) Sinh lại bộ icon ứng dụng (.ico / .png)
npm run generate:icons

# 3. Chuẩn bị và xác minh SHA-256 cho bộ binary đóng gói (ffmpeg, ffprobe, qpdf 12.4.2, 7za)
npm run prepare:binaries

# 4. Kiểm tra kiểu dữ liệu TypeScript (Strict mode)
npm run typecheck

# 5. Chạy bộ kiểm thử tích hợp tự động (Vitest — 10 suites kiểm tra thật trên 4 engine, file safety và queue)
npm test

# 6. Chạy ứng dụng ở chế độ phát triển (Development mode với Hot Reload)
npm run dev

# 7. Build mã nguồn và đóng gói bộ cài đặt Windows x64 NSIS Setup (.exe)
npm run dist:win
# (Hoặc dùng lệnh tương đương: npm run dist)
```

Sau khi chạy `npm run dist:win`, bộ cài đặt được xuất tại:
- **Bản cài đặt NSIS Setup**: `release/File Compressor-Setup-1.0.0-x64.exe`
- **Thư mục kiểm tra đóng gói giải nén**: `release/win-unpacked/FileCompressor.exe`
- **Manifest & Thông báo giấy phép đi kèm**: `resources/notices/BINARY_MANIFEST.json`, `resources/notices/THIRD_PARTY_NOTICES.txt`, `resources/notices/LICENSE-GPLv3.txt`

---

## 4. Giấy phép & Phần mềm Bên thứ ba

- **Giấy phép dự án**: Ứng dụng **File Compressor** được phát hành theo giấy phép **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** — xem toàn văn tại [`LICENSE`](LICENSE).
- **Thành phần bên thứ ba đi kèm**:
  - `FFmpeg 6.0` & `ffprobe 4.0.2`: `GPL-3.0-or-later` (`--enable-gpl --enable-version3`).
  - `QPDF 12.4.2`: `Apache-2.0`.
  - `7-Zip Standalone Console (7za 21.07)`: `LGPL-2.1-or-later` + `BSD-3-Clause`.
  - `Sharp 0.33.5` & `libvips 8.15.3`: `Apache-2.0` / `LGPL-2.1-or-later`.
  - Chi tiết phiên bản, cấu hình build, mã băm SHA-256 và đường dẫn mã nguồn gốc của từng thành phần được ghi đầy đủ tại [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md) và đóng gói kèm ứng dụng tại `resources/notices/`.

---

## 5. Tài liệu Dự án & Liên hệ Hỗ trợ

### Danh mục tài liệu kỹ thuật
- [Thay đổi qua các phiên bản (`CHANGELOG.md`)](CHANGELOG.md)
- [Ghi chú phát hành v1.0.0 (`docs/RELEASE_NOTES_v1.0.0.md`)](docs/RELEASE_NOTES_v1.0.0.md)
- [Kế hoạch triển khai (`docs/IMPLEMENTATION_PLAN.md`)](docs/IMPLEMENTATION_PLAN.md)
- [Đặc tả sản phẩm (`docs/PRODUCT_SPEC.md`)](docs/PRODUCT_SPEC.md)
- [Kiến trúc hệ thống (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- [Bảng hỗ trợ định dạng & giới hạn (`docs/FORMAT_SUPPORT.md`)](docs/FORMAT_SUPPORT.md)
- [Báo cáo kiểm thử & nghiệm thu (`docs/TEST_REPORT.md`)](docs/TEST_REPORT.md)
- [Giấy phép & thông tin phần mềm bên thứ ba (`docs/THIRD_PARTY_NOTICES.md`)](docs/THIRD_PARTY_NOTICES.md)
- [Theo dõi tiến độ (`PROGRESS.md`)](PROGRESS.md)

### Thông tin Tác giả & Báo lỗi
- **Tác giả**: **Ngọc Huy Dev**
- **Thương hiệu**: **Ocean Labs**
- **Website**: [https://oceanlabs.pro.vn/](https://oceanlabs.pro.vn/)
- **Zalo hỗ trợ**: [0876557737](https://zalo.me/0876557737)
- **Báo lỗi / Đóng góp**: Tạo issue tại [GitHub Issues](https://github.com/OceanPham/Compress-Files/issues) hoặc liên hệ trực tiếp qua Zalo / Website của Ocean Labs.

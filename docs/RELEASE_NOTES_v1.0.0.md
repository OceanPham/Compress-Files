# File Compressor v1.0.0 — Bản Phát Hành Đầu Tiên cho Windows x64

**Phát triển bởi Ngọc Huy Dev · Ocean Labs**  
🌐 Website: [https://oceanlabs.pro.vn/](https://oceanlabs.pro.vn/) · 💬 Zalo hỗ trợ: [0876557737](https://zalo.me/0876557737) · 📦 Repo: [https://github.com/OceanPham/Compress-Files](https://github.com/OceanPham/Compress-Files)

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
   - Bảo toàn tỷ lệ khung hình dọc/ngang, nhận diện cờ xoay Display Matrix / metadata rotate; hỗ trợ hủy tức thì toàn bộ cây tiến trình.
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
- `File Compressor-Setup-1.0.0-x64.exe` — Bộ cài đặt chuẩn NSIS cho Windows 10/11 x64 (`172,059,165 bytes`).
- `File Compressor-Setup-1.0.0-x64.exe.sha256` — Mã băm SHA-256 để kiểm tra tính toàn vẹn:
  ```text
  40BD37AF571E13A435CE691DFFCDD05B6953B920DEA2E8FA5F18371F8285CF2B *File Compressor-Setup-1.0.0-x64.exe
  ```
- `FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` — Gói Corresponding Source và công thức build (`16,047,257 bytes`, `~15.30 MB`):
  ```text
  2120cc865dfdf0423ea1bdefbdb24ee6c21d77f00e3a89b621f587793af12217 *FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip
  ```

### Kiểm tra mã băm SHA-256 bằng PowerShell
```powershell
Get-FileHash ".\File Compressor-Setup-1.0.0-x64.exe" -Algorithm SHA256
Get-Content ".\File Compressor-Setup-1.0.0-x64.exe.sha256"
```

### Lưu ý khi cài đặt trên Windows (Unsigned Build)
Bản phát hành `v1.0.0` hiện chưa ký chứng thư số thương mại (Code Signing). Khi khởi chạy bộ cài lần đầu, nếu Windows SmartScreen hiển thị hộp thoại **Windows protected your PC**, bạn bấm **More info (Thêm thông tin)** → **Run anyway (Vẫn chạy)** sau khi đã kiểm tra khớp mã SHA-256.

---

## 4. Giấy phép & Mã nguồn các thành phần đóng kèm (Corresponding Source)

- **Giấy phép ứng dụng File Compressor**: **GNU General Public License v3.0 or later (`GPL-3.0-or-later`)** — toàn văn trong file [`LICENSE`](../LICENSE) ở kho mã nguồn và trong thư mục cài đặt (`resources/LICENSE`, `resources/notices/LICENSE-GPLv3.txt`).
- **Mã nguồn của ứng dụng File Compressor**: Công khai tại [`https://github.com/OceanPham/Compress-Files`](https://github.com/OceanPham/Compress-Files).

### Bảng đối chiếu Binary & Mã nguồn các thành phần bên thứ ba đóng kèm

| Thành phần (`extraResources` / `unpacked`) | Phiên bản & SHA-256 của Binary đóng gói | Giấy phép | Nguồn Binary & Mã nguồn đã xác minh | Trạng thái Corresponding Source |
| :--- | :--- | :--- | :--- | :--- |
| **FFmpeg** (`resources/bin/ffmpeg.exe`) | `n7.1.5-12-g1fdbca85aa-20260731`<br>`138,059,776 bytes`<br>SHA-256: `efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de` | `GPL-3.0-or-later`<br>(`--enable-gpl --enable-version3`) | - Cùng bản build với `ffprobe.exe` từ BtbN/FFmpeg-Builds (`autobuild-2026-07-31-14-10`).<br>- Mã nguồn FFmpeg chính tại commit [`1fdbca85aaea513c9cc6c14d347f76543346d3da`](https://github.com/FFmpeg/FFmpeg/commit/1fdbca85aaea513c9cc6c14d347f76543346d3da).<br>- Toàn bộ recipe và 120 thư viện phụ thuộc ghim tại commit `a99e8230eae00d1cee38f23076a7a1f55cd984e2`. | **Đã hoàn tất & đối chiếu 100%**: Đi kèm gói nguồn `FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` và workflow tái lập `.github/workflows/build-ffmpeg-source.yml`. |
| **ffprobe** (`resources/bin/ffprobe.exe`) | `n7.1.5-12-g1fdbca85aa-20260731`<br>`137,923,584 bytes`<br>SHA-256: `69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2` | `GPL-3.0-or-later`<br>(`--enable-gpl --enable-version3`) | - Cùng bản build với `ffmpeg.exe` từ BtbN/FFmpeg-Builds (`autobuild-2026-07-31-14-10`).<br>- Cùng trình biên dịch GCC 15.2.0, cùng commit FFmpeg gốc và cùng recipe với `ffmpeg.exe`. | **Đã hoàn tất & đối chiếu 100%**: Sử dụng chung bộ Corresponding Source với `ffmpeg.exe`. |
| **QPDF** (`resources/bin/qpdf.exe`, `qpdf30.dll`) | `12.4.2` (MSVC x64)<br>`qpdf.exe` SHA-256: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`<br>`qpdf30.dll` SHA-256: `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041` | `Apache-2.0` | - Binary: [`qpdf-12.4.2-msvc64.zip`](https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip)<br>- Mã nguồn: [`qpdf-12.4.2.tar.gz`](https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2.tar.gz) ([tag `v12.4.2`](https://github.com/qpdf/qpdf/releases/tag/v12.4.2)) | **Đã xác minh đầy đủ** |
| **7-Zip Standalone** (`resources/bin/7za.exe`) | `21.07 (x64)` (`2021-12-26`)<br>`1,231,360 bytes`<br>SHA-256: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` | `LGPL-2.1-or-later` + `BSD-3-Clause` | - Giấy phép: [`7-zip.org/license.txt`](https://www.7-zip.org/license.txt)<br>- Mã nguồn `21.07`: [`7z2107-src.7z`](https://www.7-zip.org/a/7z2107-src.7z) / [`7z2107-src.tar.xz`](https://www.7-zip.org/a/7z2107-src.tar.xz) | **Đã xác minh đầy đủ** |
| **Sharp & libvips** (`app.asar.unpacked`) | `sharp 0.33.5` / `libvips 8.15.3` | `Apache-2.0` / `LGPL-2.1-or-later` | - Mã nguồn Sharp: [`lovell/sharp v0.33.5`](https://github.com/lovell/sharp/releases/tag/v0.33.5)<br>- Công thức build & nguồn libvips: [`lovell/sharp-libvips`](https://github.com/lovell/sharp-libvips) & [`libvips v8.15.3`](https://github.com/libvips/libvips/releases/tag/v8.15.3) | **Đã xác minh đầy đủ** |

Chi tiết toàn bộ hồ sơ xác minh, phân loại Thư viện Hệ điều hành Windows theo GPLv3 và công thức build được ghi tại [`docs/CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md) và [`docs/THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

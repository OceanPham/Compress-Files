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
- `File Compressor-Setup-1.0.0-x64.exe` — Bộ cài đặt chuẩn NSIS cho Windows 10/11 x64 (`132,457,754 bytes`).
- `File Compressor-Setup-1.0.0-x64.exe.sha256` — Mã băm SHA-256 để kiểm tra tính toàn vẹn:
  ```text
  5B2769E15DEC6652F2CC28FE302B607D7BEEE0DDDDC465BE22DC5E3E4921EFF0 *File Compressor-Setup-1.0.0-x64.exe
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
| **FFmpeg** (`resources/bin/ffmpeg.exe`) | `6.0-essentials_build-www.gyan.dev`<br>`81,114,624 bytes`<br>SHA-256: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1` | `GPL-3.0-or-later`<br>(`--enable-gpl --enable-version3 --enable-static`) | - Binary lấy qua [`ffmpeg-static b6.0`](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.0) từ [`GyanD/codexffmpeg` tag `6.0`](https://github.com/GyanD/codexffmpeg/releases/tag/6.0).<br>- Mã nguồn FFmpeg chính tại commit [`ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2`](https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2) ([`ffmpeg-6.0.tar.xz`](https://ffmpeg.org/releases/ffmpeg-6.0.tar.xz)).<br>- Cấu hình `./configure` đầy đủ lưu tại [`resources/notices/FFMPEG_BUILD_INFO.txt`](../resources/notices/FFMPEG_BUILD_INFO.txt). | **Chưa hoàn tất**: Đã xác minh nguồn FFmpeg chính và cấu hình build, nhưng bản build `2023-03-04` của `gyan.dev` chưa công bố công khai phiên bản/nguồn/script build của 39 thư viện ngoài liên kết tĩnh (đang gửi yêu cầu xác nhận tới `builds@gyan.dev`). |
| **ffprobe** (`resources/bin/ffprobe.exe`) | `4.0.2` (`gcc 7.3.1`)<br>`63,059,968 bytes`<br>SHA-256: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5` | `GPL-3.0-or-later`<br>(`--enable-gpl --enable-version3`) | - Binary lấy từ `ffprobe-static@3.1.0` ([commit `6655ee75`](https://github.com/joshwnj/ffprobe-static/commit/6655ee75ccb9c1e56b7fd438130d2ec9866b3618), nguồn gốc từ Zeranoe Builds).<br>- Mã nguồn FFmpeg chính tại tag [`n4.0.2` (`0a155c57bd8eb92ccaf7f5857dc6ab276d235846`)](https://github.com/FFmpeg/FFmpeg/releases/tag/n4.0.2) ([`ffmpeg-4.0.2.tar.xz`](https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz)). | **Chưa hoàn tất**: Do dịch vụ Zeranoe đã đóng cửa từ 09/2020 và `ffprobe-static` không lưu kèm nguồn/script build của 35 thư viện liên kết tĩnh, hồ sơ nguồn phụ thuộc của binary `ffprobe.exe` 4.0.2 này không thể khôi phục từ nhà cung cấp cũ. |
| **QPDF** (`resources/bin/qpdf.exe`, `qpdf30.dll`) | `12.4.2` (MSVC x64)<br>`qpdf.exe` SHA-256: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`<br>`qpdf30.dll` SHA-256: `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041` | `Apache-2.0` | - Binary: [`qpdf-12.4.2-msvc64.zip`](https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip)<br>- Mã nguồn: [`qpdf-12.4.2.tar.gz`](https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2.tar.gz) ([tag `v12.4.2`](https://github.com/qpdf/qpdf/releases/tag/v12.4.2)) | **Đã xác minh đầy đủ** |
| **7-Zip Standalone** (`resources/bin/7za.exe`) | `21.07 (x64)` (`2021-12-26`)<br>`1,231,360 bytes`<br>SHA-256: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` | `LGPL-2.1-or-later` + `BSD-3-Clause` | - Giấy phép: [`7-zip.org/license.txt`](https://www.7-zip.org/license.txt)<br>- Mã nguồn `21.07`: [`7z2107-src.7z`](https://www.7-zip.org/a/7z2107-src.7z) / [`7z2107-src.tar.xz`](https://www.7-zip.org/a/7z2107-src.tar.xz) | **Đã xác minh đầy đủ** |
| **Sharp & libvips** (`app.asar.unpacked`) | `sharp 0.33.5` / `libvips 8.15.3` | `Apache-2.0` / `LGPL-2.1-or-later` | - Mã nguồn Sharp: [`lovell/sharp v0.33.5`](https://github.com/lovell/sharp/releases/tag/v0.33.5)<br>- Công thức build & nguồn libvips: [`lovell/sharp-libvips`](https://github.com/lovell/sharp-libvips) & [`libvips v8.15.3`](https://github.com/libvips/libvips/releases/tag/v8.15.3) | **Đã xác minh đầy đủ** |

Chi tiết toàn bộ hồ sơ xác minh, danh sách các thư viện liên kết tĩnh và lộ trình hoàn thiện Corresponding Source được ghi tại [`docs/CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md) và [`docs/THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

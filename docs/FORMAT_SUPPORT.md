# Bảng Hỗ trợ Định dạng & Ranh giới Kỹ thuật (`docs/FORMAT_SUPPORT.md`)

Tài liệu này mô tả chính xác các định dạng đầu vào, đầu ra, chế độ xử lý, giới hạn kỹ thuật và trạng thái đã kiểm thử thực tế trên bản đóng gói Windows x64 của **File Compressor**. Giao diện ứng dụng phản ánh đồng nhất với bảng này.

---

## 1. Nhóm Ảnh tĩnh (Static Images)

- **Engine xử lý**: `sharp v0.33.5` (`libvips` đóng gói native cho Windows x64 qua `asarUnpack`).

| Định dạng Đầu vào | Định dạng Đầu ra hỗ trợ | Chế độ hỗ trợ | Giới hạn & Hành vi Bảo toàn | Trạng thái Kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **JPEG** (`.jpg`, `.jpeg`) | JPEG (`mozjpeg`), PNG, WebP, AVIF | • Tối ưu cùng định dạng<br>• Đổi định dạng<br>• Resize (cạnh dài, rộng×cao, %)<br>• Target Size (KB/MB/KiB/MiB)<br>• Multi-size xuất nhiều cỡ | • Xử lý đúng EXIF Orientation (1–8) một lần duy nhất, chuẩn hóa tag về `1` để tránh xoay hai lần.<br>• Giữ ICC Profile gốc hoặc chuyển chuẩn hóa về sRGB.<br>• Giới hạn an toàn: tối đa 268 Megapixels (`16384×16384`). | **Đã kiểm thử & Đạt** |
| **PNG** (`.png`) | PNG, JPEG, WebP, AVIF | • Nén Lossless (`compressionLevel 0–9`)<br>• Giảm bảng màu 256-color Palette (Lossy tùy chọn riêng)<br>• Đổi định dạng, Resize, Target Size | • Giữ nguyên kênh trong suốt (Alpha) khi xuất PNG/WebP/AVIF.<br>• Khi xuất sang JPEG, gộp nền theo màu người dùng chọn (mặc định `#FFFFFF`). | **Đã kiểm thử & Đạt** |
| **WebP tĩnh** (`.webp`) | WebP, JPEG, PNG, AVIF | • Nén Lossy (`quality 1–100`, `effort 0–6`)<br>• Nén Lossless thực sự (`lossless: true`)<br>• Resize, Target Size, Multi-size | • Bảo toàn kênh Alpha trong cả Lossy và Lossless. | **Đã kiểm thử & Đạt** |
| **AVIF tĩnh** (`.avif`) | AVIF, JPEG, PNG, WebP | • Nén Lossy (`quality 1–100`, `effort 0–9`)<br>• Nén Lossless<br>• Resize, Target Size, Multi-size | • Đã xác minh bộ mã hóa/giải mã HEIF/AVIF trong bản đóng gói native. | **Đã kiểm thử & Đạt** |

### Các định dạng Ảnh từ chối rõ ràng (`unsupported`):
- **Ảnh động / Nhiều trang** (GIF động, WebP động, APNG, AVIF Sequence, TIFF nhiều trang): Báo rõ `unsupported` (*"Ảnh động hoặc ảnh nhiều trang nằm ngoài phạm vi tối ưu ảnh tĩnh"*), **không** âm thầm lấy frame đầu tiên.
- **HEIC / HEIF / RAW máy ảnh** (`.heic`, `.heif`, `.cr2`, `.cr3`, `.nef`, `.arw`, `.dng`, `.orf`, `.rw2`, `.tiff`): Nhận diện qua header/magic bytes + phần mở rộng và báo rõ ngoài phạm vi.
- **Ảnh chiều sâu màu cao (>8-bit HDR / 16-bit `ushort`/`rgb16`/`float`)**: Phát hiện và từ chối để không tự ý hạ bit-depth làm mất dải màu.

---

## 2. Nhóm Video (SDR Video)

- **Engine xử lý**: `ffmpeg.exe` (`v6.0-essentials_build`) + `ffprobe.exe` đóng gói sẵn trong `resources/bin`.

| Container Đầu vào | Video Codec Đầu vào hỗ trợ | Đầu ra Bắt buộc | Chế độ hỗ trợ | Giới hạn & Ranh giới | Trạng thái Kiểm thử |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MP4, MOV, MKV, WebM** | `h264`, `hevc`, `vp8`, `vp9`, `av1`, `mpeg4`, `mpeg2video`, `prores`, `mjpeg` (8-bit SDR) | **MP4 (`.mp4`)**<br>• Video: `H.264 (libx264)` `yuv420p` (`+faststart`)<br>• Audio: `AAC` hoặc `Stream Copy` (khi nguồn là AAC/MP3 tương thích)<br>• Phụ đề: `mov_text` hoặc loại bỏ | • **Quality Mode**: CRF `18–34`, preset `faster` → `slow`<br>• **Target Size Mode**: Mã hóa 2-Pass có tính ngân sách bitrate trừ audio & container overhead<br>• Giới hạn độ phân giải (`2160p`/`1440p`/`1080p`/`720p`/`480p`), tự làm tròn số chẵn, giữ tỷ lệ dọc/ngang | • Giữ nguyên timing/VFR gốc khi chọn `Giữ nguyên FPS` (`-fps_mode passthrough`).<br>• Nếu ngân sách Target Size thấp hơn ngưỡng bitrate/độ phân giải sàn, trả `target_unmet` và giữ nguồn, **không** cắt ngắn video hay tự ý bỏ âm thanh. | **Đã kiểm thử & Đạt** |

### Các trường hợp Video từ chối rõ ràng (`unsupported`):
- **HDR / 10-bit / 12-bit / Dolby Vision** (`smpte2084` PQ, `arib-std-b67` HLG, `bt2020`, `yuv420p10le`, `DOVI`): Phát hiện bằng `ffprobe` và từ chối xử lý, **không** tự động tone-map sang SDR.
- **Phụ đề dạng ảnh Bitmap** (`hdmv_pgs_subtitle`, `dvd_subtitle`) khi người dùng chọn giữ phụ đề trong MP4: Báo rõ MP4 `mov_text` không hỗ trợ phụ đề ảnh và hướng dẫn chọn *"Loại bỏ phụ đề"* nếu muốn tiếp tục.

---

## 3. Nhóm Tài liệu PDF

- **Engine xử lý**: `qpdf.exe` (`v12.4.2` MSVC x64 đóng gói kèm DLL runtime).

| Đầu vào | Đầu ra | Chế độ hỗ trợ | Giới hạn & Chính sách An toàn | Trạng thái Kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **PDF chuẩn** (`.pdf` không mật khẩu, không chữ ký số) | **PDF (`.pdf`)** | • **Nén lại luồng Flate + Object Streams** (`--decode-level=generalized --recompress-flate --compression-level=9 --object-streams=generate`)<br>• **Chỉ tối ưu cấu trúc** (`--decode-level=specialized`)<br>• Tùy chọn **Linearize** (Fast Web View) | • Giữ nguyên 100% chất lượng hình ảnh, văn bản, vector, liên kết và số trang.<br>• Không hứa giảm mạnh các file PDF scan đã nén JPEG chặt; nếu kết quả không nhỏ hơn nguồn sẽ báo `no_savings` và giữ nguyên file gốc.<br>• **Từ chối PDF có mật khẩu/mã hóa** và **PDF có chữ ký số (`/Type /Sig`, `/ByteRange`)** để không làm hỏng hiệu lực chữ ký số. | **Đã kiểm thử & Đạt** |

---

## 4. Nhóm Archive (ZIP / 7z)

- **Engine xử lý**: `7za.exe` (`7-Zip Standalone Console v21.07 x64`).

| Đầu vào | Đầu ra | Chế độ hỗ trợ | Giới hạn & Kiểm chứng | Trạng thái Kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **Mọi File & Thư mục** (bao gồm Office, EXE, mã nguồn, tên tiếng Việt có dấu, thư mục rỗng) | **`.zip`** (Deflate, UTF-8 `-mcu=on`)<br>**`.7z`** (LZMA2, từ điển giới hạn an toàn `16MB` / `32MB` / `64MB`, tùy chọn Solid) | • **Nhanh** (`-mx=1`)<br>• **Cân bằng** (`-mx=5`)<br>• **Nén cao** (`-mx=9`) | • Giữ nguyên 100% nội dung byte của các file được chọn (không nén mất dữ liệu các file bên trong).<br>• Tự động xử lý trùng tên giữa nhiều thư mục/file gốc (`Tên_2`).<br>• Kiểm chứng toàn vẹn bằng `7za t` sau khi tạo và phát hiện nếu nguồn bị sửa đổi trong lúc đang đóng gói. | **Đã kiểm thử & Đạt** |


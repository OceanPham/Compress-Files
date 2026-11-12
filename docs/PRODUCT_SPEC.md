# Đặc tả Sản phẩm — File Compressor (`docs/PRODUCT_SPEC.md`)

## 1. Mục tiêu Sản phẩm
**File Compressor** là ứng dụng desktop chuyên dụng cho Windows x64, giúp người dùng cá nhân và văn phòng nén/giảm dung lượng **Ảnh tĩnh**, **Video**, **Tài liệu PDF** và đóng gói **Archive ZIP/7z** hoàn toàn cục bộ (100% offline sau khi cài đặt), đảm bảo:
- **An toàn tuyệt đối cho dữ liệu gốc**: File nguồn chỉ được đọc (immutable); mọi kết quả được tạo trong thư mục tạm riêng, kiểm chứng tính hợp lệ rồi mới xuất ra đường dẫn mới.
- **Trung thực về kết quả**: Phân biệt rõ ràng giữa nén giảm dung lượng (`completed`), nguồn đã tối ưu sẵn (`no_savings`), chuyển định dạng theo yêu cầu nhưng lớn hơn nguồn (`converted_not_smaller`), và không đạt ngân sách dung lượng mục tiêu (`target_unmet`).

## 2. Luồng Trải nghiệm Người dùng (UX Flow)
1. **Thêm dữ liệu**: Kéo thả trực tiếp từ Windows Explorer hoặc nhấn nút **Thêm File** / **Thêm Thư mục** (quét đệ quy có giới hạn độ sâu, tự bỏ qua symlink/junction và file tạm/đầu ra của chính ứng dụng).
2. **Phân tích tự động (Probing)**: Ứng dụng đọc magic bytes/header và chạy `sharp` / `ffprobe` / `qpdf` để hiển thị thông số kỹ thuật thật (độ phân giải, codec, thời lượng, số trang, kênh màu, EXIF orientation) hoặc cảnh báo ngay nếu file nằm ngoài phạm vi hỗ trợ (`unsupported`).
3. **Chọn mục tiêu & Preset**:
   - Người dùng phổ thông chỉ cần chọn 1 trong 3 mức: **Chất lượng cao**, **Cân bằng (Mặc định)**, hoặc **Ưu tiên dung lượng**.
   - Người dùng nâng cao có thể mở bảng tùy chỉnh chi tiết (Target Size KB/MB, Multi-size, ICC/sRGB, Metadata policy, Audio/Subtitle track, 2-Pass Video, LZMA2 Dictionary) và lưu thành Preset cá nhân.
   - Có thể chọn phạm vi áp dụng: **Tất cả file chờ xử lý** hoặc **Chỉ file đang chọn**.
4. **Xem trước & So sánh (Ảnh)**: Nhấn nút **So sánh** trên bất kỳ tác vụ ảnh nào để mở cửa sổ so sánh Trước/Sau ở **Zoom 100% (Điểm ảnh thật)** hoặc **Vừa khung nhìn**, có đồng bộ vị trí cuộn và tính toán dung lượng thật theo thời gian thực (debounce 280ms).
5. **Thực thi & Điều phối Hàng đợi**: Nhấn **Bắt đầu xử lý**. Có thể **Tạm dừng nhận việc mới**, **Tiếp tục**, hoặc **Hủy từng tác vụ / Hủy tất cả** (dừng toàn bộ cây tiến trình con ngay lập tức).
6. **Kiểm tra Kết quả & Lịch sử**: Xem dung lượng giảm được, mở file kết quả hoặc mở thư mục chứa, và tra cứu lại trong tab **Lịch sử**.

## 3. Định nghĩa 3 Preset Phổ thông

| Tham số | Chất lượng cao (`high_quality`) | Cân bằng (`balanced` - Mặc định) | Ưu tiên dung lượng (`small_size`) |
| :--- | :--- | :--- | :--- |
| **Ảnh tĩnh** | Giữ định dạng, Quality `88`, Effort `6`, giữ độ phân giải gốc, giữ ICC Profile & EXIF cơ bản | Giữ định dạng, Quality `80`, Effort `5`, giữ độ phân giải gốc, giữ ICC Profile, xóa EXIF phụ | Giữ định dạng, Quality `68`, Effort `6`, giới hạn cạnh dài `1920px`, chuyển về `sRGB`, xóa EXIF |
| **Video (MP4 H.264)** | CRF `20`, preset `medium`, giữ độ phân giải & FPS gốc, Audio Copy/AAC `192 kbps` | CRF `23`, preset `medium`, giữ độ phân giải & FPS gốc, Audio Copy/AAC `128 kbps` | CRF `27`, preset `medium`, tối đa `1080p` / `30fps`, Audio AAC `96 kbps`, bỏ phụ đề |
| **PDF (QPDF)** | Tối ưu cấu trúc & tạo Object Streams (`--decode-level=specialized`) | Nén lại luồng Flate mức 9 + tạo Object Streams (`--recompress-flate`) | Nén lại luồng Flate mức 9 + Object Streams + Linearize |
| **Archive (7-Zip)** | `.zip` mức Nhanh (`-mx=1`) | `.zip` mức Cân bằng (`-mx=5`) | `.7z` LZMA2 mức Cao (`-mx=9`, từ điển `32MB`, Solid) |

## 4. Chính sách Trạng thái Đầu ra (Output Semantics)
- `completed`: File đầu ra hợp lệ, vượt qua bước kiểm tra giải mã/cấu trúc và đạt mục tiêu giảm dung lượng (hoặc tạo xong archive hợp lệ).
- `no_savings`: Khi người dùng chỉ yêu cầu tối ưu nguyên định dạng nhưng file nguồn đã được nén tối ưu từ trước (đầu ra thử nghiệm $\ge$ nguồn). Ứng dụng không xuất file lớn hơn dư thừa và giữ nguyên file gốc.
- `converted_not_smaller`: Khi người dùng chủ động yêu cầu đổi định dạng hoặc kích thước (ví dụ chuyển JPEG nhỏ sang PNG Lossless) khiến file mới lớn hơn nguồn. Ứng dụng vẫn xuất file theo yêu cầu và gắn nhãn rõ kích thước thật.
- `target_unmet`: Khi bật chế độ Dung lượng mục tiêu (KB/MB) nhưng không thể đạt giới hạn đó trong ngưỡng chất lượng/độ phân giải tối thiểu đã đặt. Ứng dụng giữ nguyên nguồn và gợi ý thông số điều chỉnh.


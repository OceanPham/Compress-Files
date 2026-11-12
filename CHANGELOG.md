# Changelog

Mọi thay đổi đáng chú ý của dự án **File Compressor** được ghi nhận tại tài liệu này.

## [1.0.0] - 2026-11-13

### Tính năng chính (Initial Public Release — Windows x64)
- **4 nhóm công cụ nén & tối ưu cục bộ (100% Offline sau khi cài đặt)**:
  - **Ảnh tĩnh (`Sharp 0.33.5 / libvips 8.15.3`)**: Tối ưu cùng định dạng hoặc chuyển đổi giữa `JPEG`, `PNG`, `WebP`, `AVIF`; tự động xoay chuẩn EXIF Orientation đúng 1 lần; giữ ICC profile hoặc chuyển về `sRGB`; gộp nền màu tùy chọn khi chuyển ảnh có Alpha sang JPEG; resize (`cạnh dài`, `rộng × cao`, `%`); xuất đa kích thước (`Multi-size`); dò **Dung lượng mục tiêu (`KB`/`MB`/`KiB`/`MiB`)** và **Xem trước So sánh Trước/Sau ở Zoom 100%**.
  - **Video (`FFmpeg 6.0 + ffprobe 4.0.2`)**: Đọc metadata thực tế từ container/stream (`MP4`, `MOV`, `MKV`, `WebM`), xuất `MP4 (H.264 + AAC/Copy)` có `+faststart`; hỗ trợ chế độ chất lượng (`CRF`) và **Dung lượng mục tiêu 2-Pass (`MB`/`MiB`)**; bảo toàn khung hình dọc/ngang và thời lượng; từ chối rõ nguồn HDR/10-bit để tránh làm sai màu.
  - **Tài liệu PDF (`QPDF 12.4.2`)**: Tối ưu cấu trúc bảng tham chiếu, tạo Object Streams, nén lại luồng Flate mức 9 và tùy chọn Linearize không làm giảm chất lượng văn bản/hình ảnh; tự động phát hiện và từ chối PDF có mật khẩu hoặc chữ ký số.
  - **Archive (`7-Zip 7za 21.07`)**: Đóng gói nhiều file và thư mục bất kỳ (hỗ trợ tên tiếng Việt Unicode, thư mục rỗng, tự động xử lý trùng tên thư mục gốc) thành `.zip` hoặc `.7z` và kiểm tra toàn vẹn `7za t` sau khi tạo.
- **An toàn dữ liệu & Hàng đợi xử lý**:
  - Giữ nguyên vẹn file gốc (chỉ đọc); mọi đầu ra được xử lý qua thư mục tạm cô lập, kiểm tra hợp lệ trước khi xuất sang đường dẫn mới.
  - Hàng đợi hỗ trợ giới hạn xử lý đồng thời theo từng loại tác vụ, tạm dừng/tiếp tục, hủy toàn bộ cây tiến trình con (`taskkill /T /F`), lưu lịch sử cục bộ và tự động phục hồi trạng thái `interrupted` nếu ứng dụng đóng đột ngột.
- **Nhận diện tác giả & Giao diện**:
  - Hỗ trợ giao diện Sáng / Tối / Theo hệ thống.
  - Tích hợp nhận diện tác giả **Ngọc Huy Dev · Ocean Labs** ở thanh bên và thẻ **Giới thiệu & Liên hệ** trong mục Cài đặt & Hỗ trợ (`https://oceanlabs.pro.vn/`, Zalo `0876557737`).
- **Đóng gói & Giấy phép**:
  - Phát hành bộ cài đặt Windows x64 NSIS (`File Compressor-Setup-1.0.0-x64.exe`) kèm file kiểm tra `.sha256`.
  - Chuẩn hóa giấy phép `GPL-3.0-or-later` (`LICENSE`), manifest mã băm SHA-256 (`BINARY_MANIFEST.json`) và thông báo phần mềm bên thứ ba (`THIRD_PARTY_NOTICES.txt`).


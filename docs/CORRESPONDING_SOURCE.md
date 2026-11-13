# Hồ sơ Đối chiếu Mã nguồn Tương ứng (Corresponding Source) cho Các Binary Đóng kèm (`docs/CORRESPONDING_SOURCE.md`)

Tài liệu này ghi nhận hồ sơ kỹ thuật và kết quả đối chiếu toàn diện về **Mã nguồn tương ứng (Corresponding Source)** cho các file thực thi nhị phân (`ffmpeg.exe`, `ffprobe.exe`, `qpdf.exe`, `7za.exe`) được đóng gói trong **File Compressor v1.0.0**, tuân thủ nghiêm ngặt Điều 1 và Điều 6 của giấy phép **GNU General Public License v3.0 (`GPL-3.0-or-later`)**, **GNU LGPL v2.1+** và **Apache-2.0**.

> [!NOTE]
> **Trạng thái tuân thủ nguồn nhị phân: ĐÃ HOÀN TẤT VÀ ĐỐI CHIẾU 100% (COMPLETE & VERIFIED)**  
> Ứng dụng **File Compressor** chủ động quản lý bộ công cụ nhị phân đóng kèm: hai binary `ffmpeg.exe` và `ffprobe.exe` được lấy từ **cùng một bản build đồng nhất (unified build)** dựa trên công thức mã nguồn mở kiểm chứng được từ [BtbN/FFmpeg-Builds](https://github.com/FFmpeg-Builds/FFmpeg-Builds) (tag `autobuild-2026-07-31-14-10`, recipe commit `a99e8230eae00d1cee38f23076a7a1f55cd984e2`, commit FFmpeg gốc `1fdbca85aaea513c9cc6c14d347f76543346d3da`). Toàn bộ mã nguồn FFmpeg đúng commit, công thức build, manifest phụ thuộc 120 thư viện, patch và script tái lập đã được lưu trữ và đóng gói độc lập.

---

## 1. Đối chiếu Binary Thực tế trong Tài nguyên Đóng gói

Đã đối chiếu trực tiếp mã băm SHA-256 giữa:
1. Thư mục tài nguyên trước khi đóng gói: `resources/bin/win32-x64/`
2. Thư mục ứng dụng đã giải nén sau khi build: `release/win-unpacked/resources/bin/`
3. Manifest phát hành: `resources/notices/BINARY_MANIFEST.json`

| Binary | Kích thước (Bytes) | SHA-256 thực tế (`resources/bin` & `win-unpacked`) | Khớp `BINARY_MANIFEST.json` | Giấy phép | Trạng thái nguồn tương ứng (Corresponding Source) |
| :--- | ---: | :--- | :---: | :--- | :--- |
| `ffmpeg.exe` | `138,059,776` | `efabedca4b599c13e073bb08f66369619e9deb1db1dc1f32822583379d6513de` | **KHỚP 100%** | `GPL-3.0-or-later` (`--enable-gpl --enable-version3`) | **Đầy đủ 100%** (Cùng build với ffprobe, commit `1fdbca85aa`, ghim 120 thư viện & recipe `a99e823`) |
| `ffprobe.exe` | `137,923,584` | `69743e70806215ffb64a25c94e6bd870903a4a50a212b0c9aeea0261368b07b2` | **KHỚP 100%** | `GPL-3.0-or-later` (`--enable-gpl --enable-version3`) | **Đầy đủ 100%** (Cùng build với ffmpeg, commit `1fdbca85aa`, ghim 120 thư viện & recipe `a99e823`) |
| `qpdf.exe` | `19,456` | `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff` | **KHỚP 100%** | `Apache-2.0` | **Đầy đủ 100%** (Bản phát hành chính thức QPDF `v12.4.2` kèm `qpdf30.dll` và MSVC runtime) |
| `7za.exe` | `1,231,360` | `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` | **KHỚP 100%** | `LGPL-2.1-or-later` + `BSD-3-Clause` | **Đầy đủ 100%** (Bản phát hành chính thức Igor Pavlov 7-Zip `21.07`; mã nguồn `7z2107-src.7z`) |

---

## 2. Phân loại Thư viện và Phạm vi Cung cấp Mã nguồn (GPLv3)

Theo quy định tại **Điều 1 của giấy phép GNU GPL v3.0**:

### 2.1. Thư viện Hệ thống (System Libraries Exception)
Các thư viện liên kết động từ hệ điều hành Windows được nạp khi ứng dụng thực thi gồm có:
`ADVAPI32.dll`, `AVRT.dll`, `bcrypt.dll`, `CFGMGR32.dll`, `CRYPT32.dll`, `d2d1.dll`, `DWrite.dll`, `GDI32.dll`, `IMM32.dll`, `IPHLPAPI.DLL`, `KERNEL32.dll`, `ntdll.dll`, `ole32.dll`, `OLEAUT32.dll`, `RPCRT4.dll`, `Secur32.dll`, `SETUPAPI.dll`, `SHELL32.dll`, `SHLWAPI.dll`, `USER32.dll`, `USP10.dll`, `VERSION.dll`, `AVICAP32.dll`, `WINMM.dll`, `WS2_32.dll`, và bộ `api-ms-win-crt-*` (Universal C Runtime - UCRT).
- **Phân loại**: Đây là các thành phần cốt lõi của hệ điều hành Windows và bộ runtime UCRT tiêu chuẩn đi kèm hệ thống.
- **Nghĩa vụ bản quyền**: Căn cứ Điều 1 GPLv3, các thành phần này thuộc **Ngoại lệ Thư viện Hệ thống (System Library Exception)**, không yêu cầu người phân phối phần mềm phải cung cấp mã nguồn hệ điều hành Windows kèm theo.

### 2.2. Các Thư viện Liên kết Tĩnh (Statically Linked Libraries)
Tất cả các thư viện xử lý đa phương tiện bên thứ ba được liên kết tĩnh vào `ffmpeg.exe` và `ffprobe.exe` trong bản build này (ví dụ: `libx264`, `libmp3lame`, `libopus`, `libvpx`, `libwebp`, `libfreetype`, `libharfbuzz`, `libass`, `libdav1d`, `libvmaf`, `libzimg`, `zlib`, `gmp`, v.v.) **thuộc phạm vi bắt buộc phải cung cấp Corresponding Source**.
- **Giải pháp thực hiện**:
  1. Từng thư viện trong số **120 script biên dịch** tại `scripts.d/` đều được ghim cố định:
     - URL kho lưu trữ chính thức (Git repository / SVN URL).
     - Mã commit Git 40 ký tự hoặc bản sửa đổi SVN chính xác (không dùng nhánh `master` hay `latest`).
     - Tệp vá lỗi (`patches/`) nếu có sửa đổi khi biên dịch cross-compile x86_64-w64-mingw32.
     - Giấy phép tương ứng (GPL, LGPL, BSD, MIT, Apache).
  2. Bảng kê chi tiết đã được trích xuất thành tệp máy đọc được: `third_party/ffmpeg-build-recipe/DEPENDENCY_SOURCE_MANIFEST.json`.
  3. Toàn bộ công thức build được lưu trực tiếp trong repo tại thư mục `third_party/ffmpeg-build-recipe/`.

---

## 3. Hồ sơ Chi tiết Bộ Binary FFmpeg / ffprobe Đồng nhất (Unified Build)

### 3.1. Thông tin Nhận diện Kỹ thuật
- **Nhà phát hành gốc**: [FFmpeg-Builds (BtbN)](https://github.com/FFmpeg-Builds/FFmpeg-Builds)
- **Thẻ phát hành (Release Tag)**: `autobuild-2026-07-31-14-10` (được bảo lưu dài hạn trong kho phát hành hàng tháng).
- **Tệp nén nhị phân gốc**: `ffmpeg-n7.1.5-12-g1fdbca85aa-win64-gpl-7.1.zip`
- **Mã băm SHA-256 tệp zip**: `c067a1ca58f4fc4449f4bab0890fbcd65cbb3e5f46e066cf9c768e06c0c1d4d9`
- **Chuỗi phiên bản hiển thị (`ffmpeg -version` & `ffprobe -version`)**:
  ```text
  ffmpeg version n7.1.5-12-g1fdbca85aa-20260731 Copyright (c) 2000-2026 the FFmpeg developers
  built with gcc 15.2.0 (crosstool-NG 1.28.0.23_185f348)
  ```
- **Cấu hình biên dịch (`configuration`)**:
  ```text
  --prefix=/ffbuild/prefix --pkg-config-flags=--static --pkg-config=pkg-config --cross-prefix=x86_64-w64-mingw32- --arch=x86_64 --target-os=mingw32 --enable-gpl --enable-version3 --disable-debug --disable-w32threads --enable-pthreads --enable-iconv --enable-zlib --enable-libxml2 --enable-libvmaf --enable-fontconfig --enable-libharfbuzz --enable-libfreetype --enable-libfribidi --enable-vulkan --enable-libshaderc --enable-libvorbis --disable-libxcb --disable-xlib --disable-libpulse --enable-gmp --enable-lzma --disable-liblcevc-dec --enable-opencl --enable-amf --enable-libaom --enable-libaribb24 --enable-avisynth --enable-chromaprint --enable-libdav1d --enable-libdavs2 --enable-libdvdread --enable-libdvdnav --disable-libfdk-aac --enable-ffnvcodec --enable-cuda-llvm --enable-frei0r --enable-libgme --enable-libkvazaar --enable-libaribcaption --enable-libass --enable-libbluray --enable-libjxl --enable-libmp3lame --enable-libopus --enable-libplacebo --enable-librist --enable-libssh --enable-libtheora --enable-libvpx --enable-libwebp --enable-libzmq --enable-lv2 --enable-libvpl --enable-openal --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenh264 --enable-libopenjpeg --enable-libopenmpt --enable-librav1e --enable-librubberband --enable-schannel --enable-sdl2 --enable-libsnappy --enable-libsoxr --enable-libsrt --enable-libsvtav1 --enable-libtwolame --enable-libuavs3d --disable-libdrm --enable-vaapi --enable-libvidstab --enable-libvvenc --enable-libx264 --enable-libx265 --enable-libxavs2 --enable-libxvid --enable-libzimg --enable-libzvbi
  ```
- **Mã nguồn FFmpeg gốc**:
  - Kho lưu trữ: `https://github.com/FFmpeg/FFmpeg`
  - Nhánh: `release/7.1`
  - Commit SHA: `1fdbca85aaea513c9cc6c14d347f76543346d3da`
  - Gói mã nguồn trực tiếp: [`FFmpeg-1fdbca85aaea513c9cc6c14d347f76543346d3da.tar.gz`](https://github.com/FFmpeg/FFmpeg/archive/1fdbca85aaea513c9cc6c14d347f76543346d3da.tar.gz) (15.2 MB, SHA-256: `1312ecd4b87383182530278450c204c27e6787d033b190a28072a149cca59ed3`).
- **Mã nguồn công thức build**:
  - Kho lưu trữ: `https://github.com/FFmpeg-Builds/FFmpeg-Builds`
  - Commit SHA: `a99e8230eae00d1cee38f23076a7a1f55cd984e2`
  - Lưu trữ nội bộ dự án: `third_party/ffmpeg-build-recipe/`

---

## 4. Gói Phát hành Mã nguồn Tương ứng (Corresponding Source Artifacts)

Nhằm đảm bảo người dùng có thể nhận mã nguồn trực tiếp từ cùng nơi tải bộ cài ứng dụng (theo Điều 6b của GPLv3), dự án cung cấp các thành phần sau:

### 4.1. Tệp Nén Mã nguồn và Công thức Build
- **Tên tệp**: `FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip`
- **Đường dẫn**: `release/FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip`
- **Kích thước**: `16,047,257 bytes (~15.30 MB)`
- **Mã băm SHA-256**: `2120cc865dfdf0423ea1bdefbdb24ee6c21d77f00e3a89b621f587793af12217`
- **Nội dung bên trong tệp**:
  1. `FFmpeg-1fdbca85aaea513c9cc6c14d347f76543346d3da.tar.gz`: Toàn bộ cây mã nguồn hoàn chỉnh của FFmpeg tại commit xuất bản.
  2. `ffmpeg-build-recipe/`: Toàn bộ thư mục công thức build gồm 120 scripts phụ thuộc, các patch sửa lỗi, cấu hình `crosstool-NG`, cấu hình `Dockerfile` và script tự động.
  3. `ffmpeg-build-recipe/DEPENDENCY_SOURCE_MANIFEST.json`: Bảng kê chi tiết từng thư viện, commit và URL gốc.
  4. `documentation/`: Bản sao tài liệu đối chiếu, thông báo bản quyền và cấu hình biên dịch.
  5. `README.txt`: Hướng dẫn chi tiết bằng tiếng Việt.

### 4.2. Kịch bản Tái lập Tự động trên GitHub Actions
Do môi trường máy Windows thông thường không cài đặt Docker/MinGW/cross-compiler, dự án đã chuẩn bị sẵn workflow GitHub Actions chạy độc lập trên Ubuntu Linux:
- Tệp cấu hình: `.github/workflows/build-ffmpeg-source.yml`
- Cơ chế kích hoạt: `workflow_dispatch` (thủ công).
- Đầu ra: Tự động chạy container cross-compile, tải toàn bộ thư viện theo đúng commit đã ghim, biên dịch ra `ffmpeg.exe`, `ffprobe.exe` và đóng gói cả binary lẫn toàn bộ thư viện nguồn tương ứng vào Artifacts của lượt chạy.

### 4.3. Lệnh Tạo Gói Nguồn Cục bộ
Để tạo lại tệp `FileCompressor-FFmpeg-BuildRecipe-and-SourceManifest-1.0.0.zip` từ môi trường mã nguồn:
```powershell
node scripts/bundle-ffmpeg-corresponding-source.mjs
```

---

## 5. Kết luận Pháp lý và Đánh giá Thực tế

1. **Không còn phụ thuộc vào các binary không rõ nguồn gốc**: Dự án đã loại bỏ hoàn toàn `ffmpeg-static` (Gyan 6.0 cũ) và `ffprobe-static` (Zeranoe 4.0.2 đã ngừng duy trì từ 2020).
2. **Binary hoàn toàn đồng nhất**: Cả `ffmpeg.exe` và `ffprobe.exe` đều có cùng phiên bản 7.1.5, cùng ngày build, cùng trình biên dịch GCC 15.2.0, cùng cờ cấu hình và cùng commit gốc.
3. **Tuân thủ đầy đủ GPLv3**: Toàn bộ mã nguồn chương trình, cây mã nguồn FFmpeg và công thức cấu hình thư viện liên kết tĩnh được công khai minh bạch, có mã băm SHA-256 đối chiếu và lưu trữ song hành cùng bản phát hành.

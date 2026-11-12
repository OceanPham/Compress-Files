# Hồ sơ Đối chiếu Mã nguồn Tương ứng (Corresponding Source) cho Các Binary Đóng kèm (`docs/CORRESPONDING_SOURCE.md`)

Tài liệu này ghi nhận kết quả kiểm tra thực tế các file thực thi nhị phân (`ffmpeg.exe`, `ffprobe.exe`, `qpdf.exe`, `7za.exe`) được đóng gói trong **File Compressor v1.0.0**, đối chiếu với yêu cầu về **Mã nguồn tương ứng (Corresponding Source)** theo Điều 1 và Điều 6 của giấy phép **GNU General Public License v3.0 (`GPL-3.0-or-later`)** và **GNU LGPL v2.1+**.

> [!WARNING]
> **Trạng thái tuân thủ nguồn nhị phân hiện tại: CHƯA HOÀN TẤT (INCOMPLETE)**  
> Mặc dù dự án đã cung cấp toàn văn `LICENSE` (GPLv3), công khai mã nguồn ứng dụng **File Compressor**, xác minh mã băm SHA-256 và xác định đúng commit/tag gốc của nhánh chính `FFmpeg`, hiện tại **chưa có đủ bộ mã nguồn tương ứng (Corresponding Source) và kịch bản biên dịch (build scripts) cho toàn bộ các thư viện liên kết tĩnh (statically linked libraries)** bên trong `ffmpeg.exe` (`6.0-essentials_build-www.gyan.dev`) và `ffprobe.exe` (`4.0.2` từ Zeranoe qua `ffprobe-static`). Không được coi việc chỉ dẫn link trang chủ, repo wrapper NPM hay mã nguồn FFmpeg thuần là đã hoàn tất nghĩa vụ Corresponding Source của GPLv3.

---

## 1. Đối chiếu Binary Thực tế trong Tài nguyên Đóng gói

Đã kiểm tra trực tiếp và đối chiếu byte-for-byte giữa:
1. Thư mục chuẩn bị nguồn đóng gói: `resources/bin/win32-x64/`
2. Thư mục ứng dụng đã đóng gói: `release/win-unpacked/resources/bin/`
3. Manifest đóng gói: `resources/notices/BINARY_MANIFEST.json` và `release/win-unpacked/resources/notices/BINARY_MANIFEST.json`

| Binary | Kích thước (Bytes) | SHA-256 thực tế (`resources/bin` & `win-unpacked`) | Khớp `BINARY_MANIFEST.json` | Giấy phép | Trạng thái xác minh nguồn (Corresponding Source) |
| :--- | ---: | :--- | :---: | :--- | :--- |
| `ffmpeg.exe` | `81,114,624` | `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1` | **KHỚP 100%** | `GPL-3.0-or-later` (`--enable-gpl --enable-version3`) | **Một phần** (Đã xác minh commit FFmpeg gốc; **thiếu** phiên bản/nguồn/script build của 39 thư viện liên kết tĩnh từ `gyan.dev`) |
| `ffprobe.exe` | `63,059,968` | `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5` | **KHỚP 100%** | `GPL-3.0-or-later` (`--enable-gpl --enable-version3`) | **Chưa đủ / Không thể khôi phục từ nhà cung cấp cũ** (Đã xác minh tag FFmpeg `n4.0.2`; **thiếu** nguồn & script build của 35 thư viện liên kết tĩnh do Zeranoe đã đóng cửa năm 2020) |
| `qpdf.exe` | `19,456` | `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff` | **KHỚP 100%** | `Apache-2.0` | **Đầy đủ** (Apache-2.0; bản phát hành chính thức `v12.4.2` của QPDF) |
| `qpdf30.dll` | `7,448,064` | `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041` | **KHỚP 100%** | `Apache-2.0` | **Đầy đủ** (Đi kèm gói `qpdf-12.4.2-msvc64.zip` chính thức) |
| `7za.exe` | `1,231,360` | `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95` | **KHỚP 100%** | `LGPL-2.1-or-later` + `BSD-3-Clause` | **Đầy đủ** (Bản 7-Zip `21.07` độc lập chính thức của Igor Pavlov; có gói mã nguồn `7z2107-src.7z`) |

---

## 2. Hồ sơ Chi tiết: `ffmpeg.exe` (`6.0-essentials_build-www.gyan.dev`)

### 2.1. Thông tin định danh Binary
- **Tên file**: `ffmpeg.exe`
- **Kích thước**: `81,114,624 bytes`
- **SHA-256**: `e9fd5e711debab9d680955fc1e38a2c1160fd280b144476cc3f62bc43ef49db1`
- **Chuỗi phiên bản (`ffmpeg.exe -version`)**:
  ```text
  ffmpeg version 6.0-essentials_build-www.gyan.dev Copyright (c) 2000-2023 the FFmpeg developers
  built with gcc 12.2.0 (Rev10, Built by MSYS2 project)
  ```
- **Chuỗi cấu hình biên dịch (`configuration`)**:
  ```text
  --enable-gpl --enable-version3 --enable-static --disable-w32threads --disable-autodetect --enable-fontconfig --enable-iconv --enable-gnutls --enable-libxml2 --enable-gmp --enable-bzlib --enable-lzma --enable-zlib --enable-libsrt --enable-libssh --enable-libzmq --enable-avisynth --enable-sdl2 --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxvid --enable-libaom --enable-libopenjpeg --enable-libvpx --enable-mediafoundation --enable-libass --enable-libfreetype --enable-libfribidi --enable-libvidstab --enable-libvmaf --enable-libzimg --enable-amf --enable-cuda-llvm --enable-cuvid --enable-ffnvcodec --enable-nvdec --enable-nvenc --enable-d3d11va --enable-dxva2 --enable-libvpl --enable-libgme --enable-libopenmpt --enable-libopencore-amrwb --enable-libmp3lame --enable-libtheora --enable-libvo-amrwbenc --enable-libgsm --enable-libopencore-amrnb --enable-libopus --enable-libspeex --enable-libvorbis --enable-librubberband
  ```

### 2.2. Nguồn tải Binary thực tế
- Được tải thông qua gói NPM `ffmpeg-static@5.2.0` (`https://registry.npmjs.org/ffmpeg-static/-/ffmpeg-static-5.2.0.tgz`).
- Script `node_modules/ffmpeg-static/install.js` tải trực tiếp file thực thi từ GitHub Release `b6.0` của `eugeneware/ffmpeg-static`:
  - Binary URL: `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-win32-x64`
  - README đi kèm: `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/win32-x64.README` (đã lưu tại [`resources/notices/FFMPEG_BUILD_INFO.txt`](../resources/notices/FFMPEG_BUILD_INFO.txt))
  - LICENSE đi kèm: `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/win32-x64.LICENSE` (đã lưu tại [`LICENSE`](../LICENSE) và [`resources/notices/LICENSE-GPLv3.txt`](../resources/notices/LICENSE-GPLv3.txt))
- Bản thân asset `ffmpeg-win32-x64` trong `eugeneware/ffmpeg-static` (`b6.0`) được trích xuất nguyên bản từ gói phát hành của **Gyan Doshi (`codexffmpeg`)**:
  - Trang phát hành gốc: `https://github.com/GyanD/codexffmpeg/releases/tag/6.0` (bản cập nhật ngày `2023-03-04` chuyển từ `libmfx` sang `libvpl`: `ffmpeg-6.0-essentials_build.7z` / `ffmpeg-6.0-essentials_build.zip`).

### 2.3. Các nguồn & vật liệu build ĐÃ XÁC MINH và cách tải
1. **Mã nguồn chương trình chính FFmpeg 6.0**:
   - **Commit SHA đầy đủ**: `ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2` (viết tắt `ea3d24bbe3`, tương ứng tag `n6.0`).
   - **URL xem commit**: `https://github.com/FFmpeg/FFmpeg/commit/ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2`
   - **Cách tải mã nguồn FFmpeg tại đúng commit này**:
     - Tải qua GitHub Archive: `https://github.com/FFmpeg/FFmpeg/archive/ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2.tar.gz`
     - Hoặc tải bản phát hành chính thức `6.0` từ FFmpeg.org: `https://ffmpeg.org/releases/ffmpeg-6.0.tar.xz`
     - Hoặc qua Git:
       ```powershell
       git clone https://github.com/FFmpeg/FFmpeg.git
       cd FFmpeg
       git checkout ea3d24bbe3c58b171e55fe2151fc7ffaca3ab3d2
       ```
2. **Thông tin trình biên dịch và cờ `./configure` của FFmpeg**:
   - Đã có đầy đủ trong [`resources/notices/FFMPEG_BUILD_INFO.txt`](../resources/notices/FFMPEG_BUILD_INFO.txt) (`gcc 12.2.0 (Rev10, Built by MSYS2 project)`).

### 2.4. Những phần CÒN THIẾU BẰNG CHỨNG cho `ffmpeg.exe`
Theo Điều 1 của GPLv3, *Corresponding Source* của một file thực thi liên kết tĩnh (`--enable-static`) bao gồm cả mã nguồn của các thư viện liên kết tĩnh và các script điều khiển quá trình biên dịch/liên kết. Hiện tại còn thiếu:
1. **Phiên bản/commit chính xác, gói mã nguồn gốc và các bản vá (patches) nếu có của 39 thư viện ngoài được liên kết tĩnh vào `ffmpeg.exe`**, bao gồm:
   `avisynth`, `bzlib`, `gmp`, `gnutls`, `iconv`, `libaom`, `libass`, `libfontconfig`, `libfreetype`, `libfribidi`, `libgme`, `libgsm`, `libmp3lame`, `libopencore_amrnb`, `libopencore_amrwb`, `libopenjpeg`, `libopenmpt`, `libopus`, `librubberband`, `libspeex`, `libsrt`, `libssh`, `libtheora`, `libvidstab`, `libvmaf`, `libvo_amrwbenc`, `libvorbis`, `libvpx`, `libwebp`, `libx264`, `libx265`, `libxml2`, `libxvid`, `libzimg`, `libzmq`, `lzma`, `mediafoundation`, `sdl2`, `zlib` (cùng các header tăng tốc phần cứng `amf`, `cuda`, `cuda_llvm`, `cuvid`, `d3d11va`, `dxva2`, `ffnvcodec`, `libmfx`, `libvpl`, `nvdec`, `nvenc`).
   *(Ghi chú: Theo changelog mục `040` ngày `2023-11-11` trên `https://www.gyan.dev/ffmpeg/builds/`, các bản build của Gyan trước ngày `2023-11-11` — bao gồm bản `6.0` ngày `2023-03-04` này — chưa liệt kê số phiên bản của từng thư viện ngoài trong `README.txt`).*
2. **Script biên dịch (build/configuration scripts)** được Gyan Doshi sử dụng để biên dịch các thư viện phụ thuộc và đóng gói `ffmpeg-6.0-essentials_build`.
3. **Hướng giải quyết theo hướng dẫn của tác giả bản build (`GyanD`)**:
   - Theo phản hồi chính thức của Gyan Doshi tại [`GyanD/codexffmpeg#249 (comment)`](https://github.com/GyanD/codexffmpeg/issues/249#issuecomment-6264377917) và mục `notes` trên [`https://www.gyan.dev/ffmpeg/builds/`](https://www.gyan.dev/ffmpeg/builds/), nhà phân phối cần gửi email từ địa chỉ email chính thức của tổ chức tới **`builds@gyan.dev`** kèm liên kết tới ứng dụng và tổ chức để yêu cầu cung cấp thông tin/gói Corresponding Source của bản build.

---

## 3. Hồ sơ Chi tiết: `ffprobe.exe` (`4.0.2` từ `ffprobe-static@3.1.0`)

### 3.1. Thông tin định danh Binary
- **Tên file**: `ffprobe.exe`
- **Kích thước**: `63,059,968 bytes`
- **SHA-256**: `4303ec85855340689b1f8aa5d9c1dc06ef3e3090682de3034edc3fca2b0798d5`
- **Chuỗi phiên bản (`ffprobe.exe -version`)**:
  ```text
  ffprobe version 4.0.2 Copyright (c) 2007-2018 the FFmpeg developers
  built with gcc 7.3.1 (GCC) 20180722
  ```
- **Chuỗi cấu hình biên dịch (`configuration`)**:
  ```text
  --enable-gpl --enable-version3 --enable-sdl2 --enable-bzlib --enable-fontconfig --enable-gnutls --enable-iconv --enable-libass --enable-libbluray --enable-libfreetype --enable-libmp3lame --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libopus --enable-libshine --enable-libsnappy --enable-libsoxr --enable-libtheora --enable-libtwolame --enable-libvpx --enable-libwavpack --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libzimg --enable-lzma --enable-zlib --enable-gmp --enable-libvidstab --enable-libvorbis --enable-libvo-amrwbenc --enable-libmysofa --enable-libspeex --enable-libxvid --enable-libaom --enable-libmfx --enable-amf --enable-ffnvcodec --enable-cuvid --enable-d3d11va --enable-nvenc --enable-nvdec --enable-dxva2 --enable-avisynth
  ```

### 3.2. Nguồn tải Binary thực tế
- Được lấy từ gói NPM `ffprobe-static@3.1.0` (`https://registry.npmjs.org/ffprobe-static/-/ffprobe-static-3.1.0.tgz`), đường dẫn nội bộ `node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe`.
- Trong kho lưu trữ `joshwnj/ffprobe-static`, file nhị phân này được đưa vào tại commit [`6655ee75ccb9c1e56b7fd438130d2ec9866b3618`](https://github.com/joshwnj/ffprobe-static/commit/6655ee75ccb9c1e56b7fd438130d2ec9866b3618) ngày `2018-09-11` (*"Update to 4.0.2"*).
- Theo `node_modules/ffprobe-static/README.md`, binary Windows x64 được tải từ trang **Zeranoe FFmpeg Builds** (`http://ffmpeg.zeranoe.com/builds/win64/static/`).

### 3.3. Các nguồn & vật liệu build ĐÃ XÁC MINH và cách tải
1. **Mã nguồn chương trình chính FFmpeg 4.0.2**:
   - **Git Tag**: `n4.0.2` (tag object `fb012fd6a887085be657782b5c000769eebb5c69` trỏ tới commit `0a155c57bd8eb92ccaf7f5857dc6ab276d235846`, ngày `2018-07-18`).
   - **Cách tải mã nguồn FFmpeg 4.0.2**:
     - Gói tarball chính thức từ FFmpeg.org: `https://ffmpeg.org/releases/ffmpeg-4.0.2.tar.xz`
     - Hoặc từ GitHub Archive: `https://github.com/FFmpeg/FFmpeg/archive/0a155c57bd8eb92ccaf7f5857dc6ab276d235846.tar.gz`
2. **Thông tin trình biên dịch và cờ `./configure` của FFmpeg 4.0.2**:
   - Trích xuất trực tiếp từ `ffprobe.exe -version` (`gcc 7.3.1 (GCC) 20180722` kèm chuỗi `configuration` nêu tại Mục 3.1).

### 3.4. Những phần CÒN THIẾU BẰNG CHỨNG và Không thể xác minh từ `ffprobe-static`
1. **Thiếu hoàn toàn hồ sơ phiên bản, mã nguồn và patch của 35 thư viện liên kết tĩnh** bên trong `ffprobe.exe` (`4.0.2`), bao gồm:
   `sdl2`, `bzlib`, `fontconfig`, `gnutls`, `iconv`, `libass`, `libbluray`, `libfreetype`, `libmp3lame`, `libopencore-amrnb`, `libopencore-amrwb`, `libopenjpeg`, `libopus`, `libshine`, `libsnappy`, `libsoxr`, `libtheora`, `libtwolame`, `libvpx`, `libwavpack`, `libwebp`, `libx264`, `libx265`, `libxml2`, `libzimg`, `lzma`, `zlib`, `gmp`, `libvidstab`, `libvorbis`, `libvo-amrwbenc`, `libmysofa`, `libspeex`, `libxvid`, `libaom` (cùng `libmfx`, `amf`, `ffnvcodec`, `avisynth`).
2. **Thiếu kịch bản build (build scripts) của Zeranoe**:
   - Repo `ffprobe-static` chỉ commit trực tiếp file thực thi `ffprobe.exe` mà không lưu kèm file `README.txt` hay gói source của Zeranoe.
   - Dịch vụ `ffmpeg.zeranoe.com` đã đóng cửa vĩnh viễn từ tháng 09/2020, nên hiện tại **không còn kênh liên hệ nhà cung cấp để lấy lại Corresponding Source của binary `ffprobe.exe` 4.0.2 này**.

### 3.5. Phương án Thay thế Cụ thể có Nguồn Kiểm chứng Được (Đề xuất cho bước tiếp theo)
Để giải quyết triệt để điểm nghẽn pháp lý của `ffprobe.exe` (`4.0.2`) từ `ffprobe-static`, có 2 phương án kỹ thuật cụ thể (chưa thay đổi engine trong lượt này theo đúng phạm vi yêu cầu):

- **Phương án 1 (Khuyến nghị cao nhất — Chuyển cả `ffmpeg.exe` và `ffprobe.exe` sang bản build từ `BtbN/FFmpeg-Builds`)**:
  - **Nguồn**: Kho lưu trữ [`https://github.com/BtbN/FFmpeg-Builds`](https://github.com/BtbN/FFmpeg-Builds).
  - **Lý do kiểm chứng được 100%**: Toàn bộ hệ thống build của `BtbN/FFmpeg-Builds` là mã nguồn mở công khai trên GitHub (`scripts.d/*.sh`, `images/base/Dockerfile`, `makeimage.sh`, `build.sh`). Mỗi thư viện liên kết tĩnh đều được ghim rõ URL tải tarball/repo, commit SHA chính xác, các bản vá (`.patch`) và cờ biên dịch ngay trong thư mục `scripts.d/` của repo tại đúng commit tạo ra bản Release. Ngoài ra, `BtbN/FFmpeg-Builds` còn cung cấp biến thể `win64-lgpl` (không chứa thành phần GPL như `x264`/`x265` nếu chỉ dùng cho `ffprobe`) hoặc `win64-gpl` có đầy đủ công thức tái tạo build.
- **Phương án 2 (Đồng bộ `ffprobe.exe` sang cùng gói `6.0-essentials_build` của Gyan Doshi)**:
  - Thay vì lấy `ffprobe.exe` 4.0.2 từ `ffprobe-static`, cập nhật `scripts/prepare-binaries.mjs` để lấy `ffprobe.exe` từ chính gói `ffmpeg-6.0-essentials_build.7z` tại `https://github.com/GyanD/codexffmpeg/releases/download/6.0/ffmpeg-6.0-essentials_build.7z` (hoặc `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffprobe-win32-x64`).
  - Khi đó, cả `ffmpeg.exe` và `ffprobe.exe` đều có chung commit `ea3d24bbe3` và được giải quyết đồng thời bằng một bộ Corresponding Source duy nhất nhận từ `builds@gyan.dev`.

---

## 4. Hồ sơ Các Thành phần Đóng kèm Khác (Đã Đầy đủ Nguồn)

### 4.1. QPDF (`qpdf.exe` & `qpdf30.dll`) — Giấy phép `Apache-2.0`
- **Phiên bản**: `12.4.2` (ghim cố định trong `scripts/prepare-binaries.mjs`).
- **SHA-256 (`qpdf.exe`)**: `1bdaf878f37eaffea1ea3c30591214c77636a0f2fc7432427516b6e22e36c0ff`
- **SHA-256 (`qpdf30.dll`)**: `8812952678de93e0750308a113aa650e9161af466f9770679ea9673adeb61041`
- **Gói Binary chính thức**: `https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2-msvc64.zip`
- **Mã nguồn tương ứng chính thức (`v12.4.2`)**: `https://github.com/qpdf/qpdf/releases/download/v12.4.2/qpdf-12.4.2.tar.gz` (Tag: `https://github.com/qpdf/qpdf/releases/tag/v12.4.2`).

### 4.2. 7-Zip Standalone Console (`7za.exe`) — Giấy phép `LGPL-2.1-or-later` + `BSD-3-Clause`
- **Phiên bản**: `21.07 (x64)` (`2021-12-26`).
- **SHA-256 (`7za.exe`)**: `b0cfdeaf429f5cc53f85123dd8f5a5feb92c19d31aa34df257edf9a26be05f95`
- **Nguồn tải Binary**: Từ gói `7zip-bin@5.2.0` (`node_modules/7zip-bin/win/x64/7za.exe`).
- **Mã nguồn tương ứng chính thức (`7-Zip 21.07`)**:
  - Tải từ 7-zip.org: `https://www.7-zip.org/a/7z2107-src.7z` hoặc `https://www.7-zip.org/a/7z2107-src.tar.xz`
  - Trang giấy phép: `https://www.7-zip.org/license.txt`

### 4.3. Sharp & libvips (`@img/sharp-win32-x64` / `@img/sharp-libvips-win32-x64`)
- **Phiên bản**: `sharp@0.33.5` (`libvips 8.15.3`).
- **Giấy phép**: `Apache-2.0` (Sharp) / `LGPL-2.1-or-later` (libvips).
- **Mã nguồn & kịch bản đóng gói prebuild**:
  - Mã nguồn Sharp `v0.33.5`: `https://github.com/lovell/sharp/releases/tag/v0.33.5`
  - Mã nguồn & công thức build libvips binaries (`sharp-libvips`): `https://github.com/lovell/sharp-libvips`
  - Mã nguồn gốc libvips `v8.15.3`: `https://github.com/libvips/libvips/releases/tag/v8.15.3`

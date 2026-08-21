# HƯỚNG DẪN ĐƯA V182 LÊN GITHUB PAGES

Repo:
https://github.com/tuanpat0902-sys/quan-ly-lat-yen-pwa

## Cách upload bằng giao diện GitHub

1. Mở repo trên GitHub.
2. Chọn **Add file** → **Upload files**.
3. Giải nén ZIP `quan-ly-lat-yen-pwa-upload-ready.zip`.
4. Kéo các file/thư mục sau vào trang Upload files:
   - index.html
   - manifest.webmanifest
   - sw.js
   - icon.svg
   - .nojekyll
   - README.md
   - thư mục .github
5. Ở cuối trang, nhập commit message:
   `Deploy V182 PWA`
6. Chọn **Commit directly to the main branch**.
7. Bấm **Commit changes**.

## Bật GitHub Pages

Sau khi upload:

1. Vào repo → **Settings**.
2. Chọn **Pages** ở menu bên trái.
3. Ở phần **Build and deployment**:
   - Source: chọn **GitHub Actions**.
4. Quay lại tab **Actions**.
5. Chờ workflow **Deploy GitHub Pages** chạy xong, trạng thái dấu tích xanh.

Đường dẫn dự kiến:

https://tuanpat0902-sys.github.io/quan-ly-lat-yen-pwa/

## Cài trên Android

1. Mở đường dẫn GitHub Pages bằng Chrome.
2. Menu ⋮ → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.
3. Sau khi cài, icon **Lát Yên** sẽ xuất hiện như app Android.

## Nếu GitHub không cho upload thư mục .github bằng kéo-thả

Có thể tạo workflow riêng:
1. Trong repo chọn **Add file** → **Create new file**.
2. Tên file:
   `.github/workflows/pages.yml`
3. Copy nội dung từ file cùng tên trong bộ này.
4. Commit vào main.

## Lưu ý dữ liệu
- Dữ liệu Supabase Cloud: dùng chung với Windows.
- Dữ liệu localStorage chỉ nằm trên từng thiết bị/trình duyệt.
- Dữ liệu Excel/local-only trên Windows không tự xuất hiện trên Android.

# Lịch sử phiên bản Quản lý Lát Yên

Số `Ver` hiển thị cạnh tên ứng dụng và trong phần Cài đặt là phiên bản đang chạy. Mỗi bản triển khai thay đổi chức năng cần tăng số này và ghi nội dung tại đây.

## Ver 3.0.45 — 20/09/2026

- Sửa lịch sử Thu/Chi trống trong khi báo cáo tài chính vẫn có giao dịch: hai màn hình dùng chung dữ liệu Cloud; phản hồi rỗng từ lượt đọc phụ không còn xóa các khoản đang hiển thị.
- Bổ sung kiểm thử hồi quy cho 2 khoản chi ngày 19/09/2026 tổng 300 đ và thông báo xác nhận lưu.

## Ver 3.0.44 — 20/09/2026

- Nén sẵn HTML bằng Brotli/gzip và nén các tệp giao diện theo yêu cầu của trình duyệt; giảm dung lượng truyền trang chính khoảng 80%.
- Tệp có mã phiên bản được lưu cache dài hạn, trong khi trang chính và service worker tiếp tục lấy bản mới nhất.
- Thêm kiểm tra hồi quy cho nội dung giải nén, lựa chọn kiểu nén và chính sách cache.

## Ver 3.0.43 — 19/09/2026

- Lịch sử Thu/Chi của kho đang chọn đọc trực tiếp từ Vibe Host khi mở màn hình và sau khi lưu, tránh danh sách trống do lớp dữ liệu cũ.
- Chỉ báo lưu và hiển thị thành công sau khi đọc lại được phiếu; giữ phiếu vừa lưu trên giao diện nếu việc đọc lịch sử tạm thời thất bại.
- Chuẩn hóa ngày Thu/Chi để bộ lọc theo ngày/tháng không loại nhầm phiếu.

## Ver 3.0.42 — 19/09/2026

- Sửa lưu phiếu kiểm kê trên Vibe Host: ghi giá trị thiếu/thừa bắt buộc ở đầu phiếu và tính lại từ từng dòng kiểm kê trước khi hoàn tất giao dịch.
- Bổ sung kiểm tra hồi quy cho luồng lưu phiếu kiểm kê và các trường giá trị bắt buộc.

## Ver 3.0.41 — 19/09/2026

- Tăng tốc xóa phiếu nhập/xuất: cập nhật tồn kho và giá vốn theo lô trong giao dịch Vibe.
- Cập nhật danh sách phiếu ngay từ kết quả máy chủ đã xác nhận; đối chiếu toàn bộ dữ liệu chạy nền, không giữ nút xóa chờ tải lại toàn bộ phần mềm.

## Ver 3.0.40 — 19/09/2026

- Sửa thao tác xóa phiếu nhập và phiếu xuất trên Vibe Host; tồn kho được hoàn tác cùng giao dịch xóa.
- Sửa cập nhật phiếu nhập/xuất: xác nhận phiếu gốc tồn tại, hoàn tác số lượng cũ đúng kho trước khi ghi số lượng mới, tính lại giá vốn các nguyên liệu liên quan.
- Thao tác xóa chỉ cập nhật giao diện sau khi máy chủ xác nhận; lỗi xóa không làm mất phiếu trên thiết bị.
- Bổ sung kiểm tra hồi quy cho xóa phiếu và đồng bộ nhãn phiên bản ứng dụng.

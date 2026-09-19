# Lịch sử phiên bản Quản lý Lát Yên

Số `Ver` hiển thị cạnh tên ứng dụng và trong phần Cài đặt là phiên bản đang chạy. Mỗi bản triển khai thay đổi chức năng cần tăng số này và ghi nội dung tại đây.

## Ver 3.0.40 — 19/09/2026

- Sửa thao tác xóa phiếu nhập và phiếu xuất trên Vibe Host; tồn kho được hoàn tác cùng giao dịch xóa.
- Sửa cập nhật phiếu nhập/xuất: xác nhận phiếu gốc tồn tại, hoàn tác số lượng cũ đúng kho trước khi ghi số lượng mới, tính lại giá vốn các nguyên liệu liên quan.
- Thao tác xóa chỉ cập nhật giao diện sau khi máy chủ xác nhận; lỗi xóa không làm mất phiếu trên thiết bị.
- Bổ sung kiểm tra hồi quy cho xóa phiếu và đồng bộ nhãn phiên bản ứng dụng.

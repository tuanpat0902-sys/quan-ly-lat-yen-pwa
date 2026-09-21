# Lịch sử phiên bản Quản lý Lát Yên

Số `Ver` hiển thị cạnh tên ứng dụng và trong phần Cài đặt là phiên bản đang chạy. Mỗi bản triển khai thay đổi chức năng cần tăng số này và ghi nội dung tại đây.

## Ver 3.3.2 — 22/09/2026

- Loại bỏ xung đột giả khi sửa phiếu và dữ liệu danh mục; mọi lần sửa vẫn được khóa và ghi nguyên khối trong PostgreSQL.
- Phiếu nhập lưu riêng số lượng nhập, đơn vị nhập, tỷ lệ quy đổi và số lượng tồn kho đã quy đổi.
- Biểu mẫu và lịch sử phiếu nhập hiển thị đồng thời “SL nhập” và “SL quy đổi”; phiếu cũ được suy ngược bằng công thức hiện có.
- Bổ sung migration và health gate bắt buộc cho dữ liệu quy đổi mới.

## Ver 3.3.1 — 22/09/2026

- Sửa cảnh báo xung đột giả khi sửa nguyên liệu và phiếu kho: phiên bản so sánh giờ lấy trực tiếp từ snapshot Vibe, không lấy từ dữ liệu giao diện có thể đã bị tính lại cục bộ.
- Bổ sung `updated_at` chuẩn cho các bảng nghiệp vụ cần chống ghi đè; vẫn giữ khóa dòng và trả xung đột thật khi một thiết bị khác đã lưu trước.
- Tự sửa các số tồn dương vô lý nếu mặt hàng không có nhập kho, không có kiểm kê tăng/tồn đầu và chỉ có phát sinh trừ từ bán hàng.
- Giá vốn trên form nguyên liệu được chuẩn hóa số hiển thị, không còn chuỗi thập phân kéo dài.

## Ver 3.3.0 — 21/09/2026

- Thay tải snapshot toàn bộ bằng năm miền dữ liệu độc lập; dữ liệu lịch sử bán hàng, thu/chi và kho có API phân trang ổn định, tối đa 50 dòng mỗi trang.
- Tối ưu iPOS bằng bulk upsert và chỉ dựng lại tồn kho của hóa đơn hoặc công thức thực sự thay đổi; hóa đơn bị xóa được hoàn tác tồn kho trước khi xóa.
- Kiểm tra trực tiếp `pg_indexes`, bổ sung người thực hiện vào nhật ký nghiệp vụ và đưa tình trạng index/migration vào health check.
- Bổ sung bảo vệ xung đột khi hai thiết bị cùng sửa phiếu, trả cảnh báo tải lại thay vì âm thầm ghi đè.
- Giảm thêm các bộ hẹn giờ nền của chatbot, báo cáo, khóa menu và cache; bổ sung kiểm thử tải lớn 10.000 đơn, 100.000 dòng bán và 500.000 biến động kho.

## Ver 3.2.0 — 21/09/2026

- Bổ sung migration PostgreSQL Vibe có phiên bản, khóa chống chạy đồng thời và bộ index cho kho, bán hàng, phiếu, thu/chi, hoạt động và iPOS.
- Ghi ledger biến động kho chuẩn cho nhập, xuất, kiểm kê và bán hàng; liên kết theo phiếu nguồn và ghi nhật ký trong cùng transaction.
- Hoàn tất đọc iPOS trước khi mở transaction ghi PostgreSQL, tránh giữ kết nối và khóa cơ sở dữ liệu trong lúc chờ mạng ngoài.
- Bổ sung `/healthz` kiểm tra cơ sở dữ liệu, schema và trạng thái iPOS trong tối đa 3 giây.
- Tăng thời gian tái sử dụng snapshot không đổi lên 60 giây, vẫn vô hiệu ngay sau thay đổi; loại khóa Supabase cũ khỏi mã trình duyệt.
- Thay các vòng lặp nền vô hạn của đơn vị, nguyên liệu, nhân viên và lương bằng cập nhật theo sự kiện.

## Ver 3.1.4 — 21/09/2026

- Hợp nhất toàn bộ biến động kho của kho đang chọn vào một bảng duy nhất, bỏ giới hạn cứng 300 dòng và bỏ nhãn “trước đây”.
- Giới hạn mỗi trang của Nhật ký thay đổi và Toàn bộ biến động kho ở mức 50 dòng, có nút chuyển trang mới hơn/cũ hơn.
- Sắp xếp biến động kho theo thời gian mới nhất trước và hiển thị tổng số bản ghi đầy đủ.

## Ver 3.1.3 — 21/09/2026

- Chuyển Lịch sử hoạt động từ trình đọc Supabase cũ sang API Vibe có xác thực, giới hạn thời gian tải và nút thử lại khi máy chủ chậm.
- Bổ sung phân trang các hoạt động cũ trên Vibe, không còn dừng ở trang dữ liệu đầu tiên.
- Mở sẵn bảng Biến động kho trước đây để lịch sử kho hiện trực tiếp thay vì bị ẩn trong mục thu gọn.

## Ver 3.1.2 — 21/09/2026

- Đơn giản hóa Cài đặt: chỉ hiển thị Đồng bộ dữ liệu và Nhận diện phần mềm; thông báo, sao lưu, bảo trì và phiên bản được thu gọn theo nhu cầu.
- Loại bỏ bảng migration/production gate V3 khỏi giao diện người dùng và giữ các cổng kỹ thuật trong bộ kiểm thử phát hành.
- Loại bỏ hoàn toàn đường gọi API/Edge Function khỏi chatbot; hội thoại và xử lý chỉ diễn ra trên thiết bị, lịch sử lưu trong IndexedDB của thiết bị.
- Bổ sung nhận diện một số lỗi gõ phổ biến cho lệnh nhập, xuất, kiểm kê, công thức, doanh thu, tồn kho và thu chi.

## Ver 3.1.1 — 21/09/2026

- Sửa chatbot hiểu trọn cụm “hạt cà phê”, không còn rút xuống từ “cà” và gợi ý nhầm dụng cụ ca đánh sữa.
- Giữ đúng quy đổi đơn vị đóng gói khi chọn mặt hàng từ gợi ý, ví dụ 10 gói × 500 g được ghi nhận thành 5.000 g tồn kho.
- Gắn Vibe client vào cầu nối toàn cục mà Fresh Core V3 cần, giúp V3 runtime/router hoàn tất khởi động thay vì đứng ở `waiting`.

## Ver 3.1.0 — 21/09/2026

- Chuyển đường chạy trình duyệt và máy chủ sang Vibe PostgreSQL hoàn toàn: bỏ thư viện Supabase CDN và không khởi động mirror Supabase.
- Chuyển xóa phiếu nhập, xuất, kiểm kê, bán hàng, nguyên liệu, món và kho sang API Vibe có giao dịch, xác nhận máy chủ và hoàn tác tồn kho.
- Chuyển mật khẩu bảo vệ menu/kho sang vùng riêng trên Vibe với mã băm bcrypt; không trả mã băm về trình duyệt.
- Chatbot dùng chung quy tắc quy đổi đơn vị của nguyên liệu, hỗ trợ thêm đơn vị khối lượng, thể tích và đóng gói.
- Chỉ tải mô-đun nghiệp vụ sau đăng nhập; đồng bộ iPOS chỉ tải chi tiết đơn mới/thay đổi và giãn chu kỳ đồng bộ danh mục.
- Bổ sung CSP, HSTS, chống nhúng trang, chính sách referrer/quyền trình duyệt và nâng service worker lên Core-275.
- Đồng bộ lại các kiểm thử đã cũ với kiến trúc Vibe/V3 và giữ cổng kiểm tra hồi quy đầy đủ trước triển khai.
- Dừng lịch GitHub Keepalive Supabase cũ; runtime sản xuất và lịch nền nay chỉ dùng Vibe/iPOS.

## Ver 3.0.50 — 20/09/2026

- Thêm nút Chi tiết trong lịch sử phiếu bán hàng để xem món, topping iPOS, số lượng, đơn giá, giảm giá, tổng thanh toán và ghi chú mà không mở chế độ sửa.

## Ver 3.0.49 — 20/09/2026

- Sửa bảng chi tiết Nhập/Xuất: cột Loại và Số phiếu có độ rộng rõ ràng, màn hình hẹp cuộn ngang thay vì cắt chữ.
- Ngày nhập kho trong báo cáo và lịch sử lấy theo ngày đã chọn trên phiếu, kể cả khi máy chủ trả về ngày kèm giờ; không còn tự rơi về ngày tạo bản ghi.
- Bắt buộc ngày phiếu hợp lệ khi lưu trên Vibe Host và cảnh báo nếu ngày máy chủ xác nhận khác ngày người dùng chọn.

## Ver 3.0.48 — 20/09/2026

- Hoãn dựng lại các màn hình nguyên liệu, Nhập/Xuất, kiểm kê, công thức, bán hàng và Thu/Chi khi biểu mẫu đang mở; dữ liệu mới được hiển thị sau khi hoàn tất thao tác.
- Bản cập nhật không tự điều hướng tab Vibe đang mở; chỉ báo có phiên bản mới để người dùng hoàn tất phiếu rồi tự tải lại.
- Sau khi máy chủ xác nhận lưu phiếu, nếu danh sách tạm thời chưa tải lại, thông báo đúng trạng thái và giữ mã phiếu để lần lưu tiếp theo cập nhật, không tạo trùng.
- Nhân viên chỉ được đưa vào danh sách sau khi Vibe Host xác nhận lưu; xóa trên máy chủ trước khi xóa trên thiết bị, tránh mất hoặc tái xuất hiện dữ liệu khi lỗi kết nối.

## Ver 3.0.47 — 20/09/2026

- Chuyển thao tác Xóa phiếu Thu/Chi khỏi Supabase sang Vibe Host, xác thực theo tổ chức và kho đang chọn; chỉ cập nhật giao diện sau khi máy chủ xác nhận xóa.
- Bổ sung kiểm thử xóa thành công, lỗi và hủy; không xóa dữ liệu thật khi kiểm thử.

## Ver 3.0.46 — 20/09/2026

- Sửa triệt để trang Thu/Chi trống dù báo cáo tài chính có 2 khoản chi: lớp tương thích cũ ghi đè hàm lọc Thu/Chi; chuyển báo cáo sang hàm lọc riêng không bị ghi đè.
- Kiểm thử tái hiện lỗi trên đúng trạng thái hai giao dịch ngày 19/09/2026 và lớp tương thích đang hoạt động.

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

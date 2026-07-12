# MoneyFlow

MoneyFlow là ứng dụng quản lý tài chính cá nhân được xây dựng bằng React, Vite và Supabase. Ứng dụng hỗ trợ đăng nhập, quản lý giao dịch, theo dõi ngân sách và trực quan hóa thu chi.

## Tính năng

- Thêm, sửa và xóa khoản thu hoặc chi.
- Tổng hợp thu nhập, chi tiêu, số dư và ngân sách theo tháng.
- Cảnh báo khi sử dụng 50%, 80% hoặc vượt 100% ngân sách.
- Tìm kiếm và lọc theo loại, danh mục hoặc khoảng ngày tùy chỉnh.
- Xuất các giao dịch đang hiển thị thành bảng Excel `.xlsx` có AutoFilter,
  cố định hàng tiêu đề và định dạng tiền VND.
- Đính kèm ảnh hóa đơn trong Supabase Storage riêng tư; liên kết xem chỉ có
  hiệu lực tạm thời và dữ liệu được cô lập theo tài khoản.
- Dùng Supabase Edge Function và Azure AI Document Intelligence để đọc cửa hàng, ngày, tổng tiền,
  loại và danh mục từ ảnh; người dùng xác nhận trước khi lưu.
- Hóa đơn nhiều món vẫn được lưu thành một giao dịch theo tổng thanh toán; tên,
  số lượng và giá từng món được đưa vào ghi chú để tránh làm sai số dư.
- Biểu đồ cơ cấu chi tiêu và so sánh dòng tiền sáu tháng gần nhất.

## Kiến trúc cloud

- React + Vite: giao diện web.
- Supabase Auth: đăng ký, đăng nhập và quản lý phiên.
- Supabase PostgreSQL: lưu giao dịch và ngân sách.
- Row Level Security: cô lập dữ liệu theo từng tài khoản.
- GitHub Actions: tự động chạy ESLint và production build.
- Vercel: tự động triển khai sau khi thay đổi được nhập vào nhánh `main`.

## Chạy dự án

Yêu cầu Node.js 22 trở lên.

```bash
npm install
```

Tạo file `.env.local` tại thư mục gốc:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Khởi động môi trường phát triển:

```bash
npm run dev
```

Kiểm tra chất lượng và production build:

```bash
npm run lint
npm run build
```

## Thiết lập bảo mật Supabase

Chạy file sau trong Supabase SQL Editor trước khi demo:

```text
supabase/migrations/202607110001_security_baseline.sql
```

Sau migration bảo mật cơ bản, chạy thêm migration Storage:

```text
supabase/migrations/202607120001_receipt_storage.sql
```

Migration Storage tạo bucket riêng tư `receipts`, thêm cột `receipt_path` và
chính sách chỉ cho phép người dùng truy cập thư mục mang UID của chính mình.
Ảnh được giới hạn ở JPG, PNG hoặc WebP và dung lượng tối đa 5 MB.
Riêng thao tác OCR giới hạn ảnh ở 4 MB để phù hợp giới hạn tài liệu của tầng Azure F0.

Chạy tiếp migration metadata OCR:

```text
supabase/migrations/202607120002_receipt_ocr.sql
```

## Triển khai Edge Function OCR

Azure Document Intelligence API key phải được lưu dưới dạng Supabase Secret. Không đặt API key trong
`.env.local`, React hoặc bất kỳ biến nào có tiền tố `VITE_`.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR_RESOURCE.cognitiveservices.azure.com AZURE_DOCUMENT_INTELLIGENCE_KEY=YOUR_AZURE_KEY
npx supabase functions deploy ocr-receipt --no-verify-jwt
```

Function tắt bước kiểm JWT cũ ở gateway nhưng tự xác thực access token bằng
`supabase.auth.getUser()` trước khi xử lý ảnh. Người dùng chưa đăng nhập sẽ nhận
HTTP 401. Ảnh được gửi đến model `prebuilt-receipt` của Azure chỉ khi người dùng
chủ động bấm nút OCR. Với tầng Free F0, khi hết hạn mức tháng, function trả thông
báo để người dùng nhập thủ công và không tự nâng cấp sang tầng trả phí.

Tài liệu tham khảo:

- https://learn.microsoft.com/azure/ai-services/document-intelligence/prebuilt/receipt
- https://learn.microsoft.com/azure/ai-services/document-intelligence/service-limits

Migration này:

- Bật RLS cho `transactions` và `monthly_budgets`.
- Chỉ cho phép người dùng thao tác trên hàng có `user_id = auth.uid()`.
- Từ chối số tiền không dương, tiêu đề rỗng và loại giao dịch không hợp lệ.
- Giới hạn tiêu đề 100 ký tự và ghi chú 500 ký tự.
- Bảo đảm mỗi người dùng chỉ có một ngân sách trong một tháng.

Trước khi chạy migration trên dữ liệu đang sử dụng, hãy sao lưu database và kiểm tra các hàng cũ có giá trị rỗng hoặc không hợp lệ.

## Kiểm thử RLS

1. Tạo hai tài khoản A và B.
2. Đăng nhập A và tạo một giao dịch.
3. Đăng nhập B và xác nhận không nhìn thấy giao dịch của A.
4. Thử gửi request với `user_id` của A khi đang dùng phiên B.
5. Supabase phải từ chối thao tác đó.

Không đưa `service_role` key vào React hoặc bất kỳ biến môi trường bắt đầu bằng `VITE_`. Frontend chỉ sử dụng publishable key.

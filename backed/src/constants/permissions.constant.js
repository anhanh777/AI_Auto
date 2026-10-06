/**
 * Danh mục toàn bộ các mã quyền trong hệ thống
 * Phân chia theo từng nhóm chức năng (module) để Frontend hiển thị bảng Checkbox
 */
export const SYSTEM_PERMISSIONS = [
  // 1. Nhóm Quản trị Sản phẩm & Tồn kho
  {
    code: 'PRODUCT_VIEW',
    name: 'Xem danh sách & chi tiết sản phẩm',
    module: 'Sản phẩm & Kho',
    description: 'Cho phép xem danh mục, danh sách sản phẩm và thông tin tồn kho'
  },
  {
    code: 'PRODUCT_CREATE',
    name: 'Thêm mới sản phẩm',
    module: 'Sản phẩm & Kho',
    description: 'Cho phép tạo sản phẩm mới và thiết lập các biến thể size/màu'
  },
  {
    code: 'PRODUCT_UPDATE',
    name: 'Chỉnh sửa thông tin sản phẩm',
    module: 'Sản phẩm & Kho',
    description: 'Cho phép cập nhật giá bán, hình ảnh, mô tả sản phẩm'
  },
  {
    code: 'PRODUCT_DELETE',
    name: 'Xóa sản phẩm',
    module: 'Sản phẩm & Kho',
    description: 'Cho phép xóa hoặc ngừng kinh doanh sản phẩm'
  },
  {
    code: 'INVENTORY_MANAGE',
    name: 'Quản lý nhập kho & tồn kho',
    module: 'Sản phẩm & Kho',
    description: 'Cho phép tạo phiếu nhập kho và điều chỉnh số lượng tồn kho'
  },

  // 2. Nhóm Quản trị Đơn hàng
  {
    code: 'ORDER_VIEW',
    name: 'Xem danh sách đơn hàng',
    module: 'Đơn hàng',
    description: 'Cho phép tra cứu, xem chi tiết và lọc trạng thái đơn hàng'
  },
  {
    code: 'ORDER_CREATE',
    name: 'Tạo đơn hàng thủ công',
    module: 'Đơn hàng',
    description: 'Cho phép nhân viên tự tạo đơn hàng trực tiếp cho khách'
  },
  {
    code: 'ORDER_UPDATE',
    name: 'Duyệt & cập nhật trạng thái đơn hàng',
    module: 'Đơn hàng',
    description: 'Cho phép duyệt đơn (tự động trừ kho), chuyển sang giao hàng hoặc hoàn thành'
  },
  {
    code: 'ORDER_CANCEL',
    name: 'Hủy đơn hàng',
    module: 'Đơn hàng',
    description: 'Cho phép hủy đơn hàng và hoàn lại số lượng tồn kho'
  },

  // 3. Nhóm Hộp thư Live Chat & Tư vấn
  {
    code: 'CHAT_VIEW',
    name: 'Xem hội thoại & tin nhắn',
    module: 'Hộp thư & Tư vấn',
    description: 'Cho phép xem danh sách khách hàng đang chat từ Facebook và Web'
  },
  {
    code: 'CHAT_REPLY',
    name: 'Gửi tin nhắn tư vấn khách hàng',
    module: 'Hộp thư & Tư vấn',
    description: 'Cho phép nhân viên trực tiếp chat phản hồi khách'
  },
  {
    code: 'CHAT_TAKEOVER',
    name: 'Tiếp quản hội thoại (Bật/Tắt Bot AI)',
    module: 'Hộp thư & Tư vấn',
    description: 'Cho phép can thiệp tắt AI tự động để nhân viên xử lý ca khó'
  },

  // 4. Nhóm Khách hàng CRM
  {
    code: 'CUSTOMER_VIEW',
    name: 'Xem hồ sơ khách hàng',
    module: 'Khách hàng',
    description: 'Cho phép xem lịch sử mua hàng, địa chỉ và thông tin liên hệ của khách'
  },
  {
    code: 'CUSTOMER_UPDATE',
    name: 'Cập nhật thông tin khách hàng',
    module: 'Khách hàng',
    description: 'Cho phép chỉnh sửa thông tin liên hệ, địa chỉ và ghi chú khách hàng'
  },

  // 5. Nhóm Kho tri thức & Cấu hình AI
  {
    code: 'KNOWLEDGE_MANAGE',
    name: 'Quản lý kho tri thức RAG',
    module: 'Trí tuệ nhân tạo (AI)',
    description: 'Cho phép thêm/sửa/xóa chính sách đổi trả, bảng size, cước phí ship để nạp cho AI'
  },
  {
    code: 'AI_CONFIG_MANAGE',
    name: 'Cấu hình Prompt & Kịch bản AI',
    module: 'Trí tuệ nhân tạo (AI)',
    description: 'Cho phép chỉnh sửa System Prompt, nhiệt độ và tham số mô hình Gemini'
  },

  // 6. Nhóm Quản trị Hệ thống
  {
    code: 'USER_MANAGE',
    name: 'Quản lý tài khoản nhân viên',
    module: 'Quản trị hệ thống',
    description: 'Cho phép thêm mới, sửa thông tin, khóa tài khoản và reset mật khẩu nhân viên'
  },
  {
    code: 'ROLE_MANAGE',
    name: 'Quản lý vai trò & phân quyền',
    module: 'Quản trị hệ thống',
    description: 'Cho phép chỉnh sửa danh sách quyền hạn cho từng vai trò'
  },
  {
    code: 'DASHBOARD_VIEW',
    name: 'Xem báo cáo thống kê & Dashboard',
    module: 'Quản trị hệ thống',
    description: 'Cho phép xem doanh thu, tỷ lệ AI xử lý thành công và biểu đồ tăng trưởng'
  }
];

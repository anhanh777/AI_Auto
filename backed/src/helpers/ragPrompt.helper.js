/**
 * Ghép nối thông tin sản phẩm, danh mục và tài liệu tri thức vào System Prompt RAG cho Gemini AI
 * @param {Object} params
 * @param {string} params.baseSystemPrompt - Prompt hướng dẫn tính cách/vai trò gốc
 * @param {Array} params.products - Danh sách sản phẩm có sẵn
 * @param {Array} params.knowledgeItems - Danh sách chính sách/FAQ của cửa hàng
 * @returns {string} Full System Prompt kèm bối cảnh thực tế
 */
export const buildRagContextPrompt = ({ baseSystemPrompt, products = [], knowledgeItems = [] }) => {
  let prompt = `${baseSystemPrompt}

`;

  // 1. Nạp danh mục sản phẩm và giá/tồn kho
  prompt += `=== BẢNG SẢN PHẨM & TỒN KHO HIỆN CÓ CỦA CỬA HÀNG ===
`;
  if (products.length === 0) {
    prompt += `Hiện tại chưa có sản phẩm nào trong kho.
`;
  } else {
    products.forEach((p, idx) => {
      prompt += `${idx + 1}. Tên sản phẩm: ${p.name} (Mã: ${p.sku})
`;
      prompt += `   - Giá bán: ${p.sale_price ? p.sale_price.toLocaleString('vi-VN') + 'đ (Giá gốc: ' + p.base_price.toLocaleString('vi-VN') + 'đ)' : p.base_price.toLocaleString('vi-VN') + 'đ'}
`;
      prompt += `   - Mô tả: ${p.description || 'Chất liệu cao cấp, độ bền cao.'}
`;
      if (p.variants && p.variants.length > 0) {
        prompt += `   - Các biến thể: `;
        const variantStr = p.variants.map(v => `[Size: ${v.size || 'Freesize'}, Màu: ${v.color || 'Mặc định'}, Còn: ${v.in_stock}]`).join(', ');
        prompt += `${variantStr}
`;
      }
    });
  }
  prompt += `
`;

  // 2. Nạp chính sách tri thức (Đổi trả, Vận chuyển, FAQ)
  prompt += `=== CHÍNH SÁCH BÁN HÀNG & THÔNG TIN CỬA HÀNG ===
`;
  if (knowledgeItems.length === 0) {
    prompt += `Giao hàng toàn quốc, đổi trả trong vòng 7 ngày nếu có lỗi từ nhà sản xuất.
`;
  } else {
    knowledgeItems.forEach((k, idx) => {
      prompt += `[Chính sách ${idx + 1}] ${k.title}:
${k.content}

`;
    });
  }

  // 3. Quy tắc trích xuất đơn hàng tự động (Chat-to-Order)
  prompt += `=== QUY TẮC PHẢN HỒI & TỰ ĐỘNG CHỐT ĐƠN ===
- Luôn giữ thái độ thân thiện, lịch sự, đóng vai nhân viên bán hàng chuyên nghiệp.
- Khi khách hỏi sản phẩm, hãy tư vấn đúng giá, kích thước và màu sắc đang có sẵn.
- Nếu khách đồng ý mua và cung cấp thông tin (Tên, Số điện thoại, Địa chỉ, Sản phẩm/Màu/Size muốn lấy), hãy xác nhận lại đơn hàng một cách rõ ràng và kèm theo khối JSON đơn hàng theo cú pháp đặc biệt:
\`\`\`json_order
{
  "customer_name": "Tên khách",
  "customer_phone": "Số điện thoại",
  "shipping_address": "Địa chỉ giao hàng",
  "items": [
    {
      "sku": "MÃ_SKU_SẢN_PHẨM",
      "variant_sku": "MÃ_SKU_BIẾN_THỂ_NẾU_CÓ",
      "quantity": 1,
      "price": 250000
    }
  ],
  "payment_method": "COD"
}
\`\`\`
`;

  return prompt;
};

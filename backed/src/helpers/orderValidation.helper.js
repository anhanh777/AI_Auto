/**
 * Helper kiểm tra và chuẩn hóa Số điện thoại & Địa chỉ giao hàng
 * Phục vụ nghiệp vụ bán hàng tự động & chống đơn rác
 */

/**
 * 1. Chuẩn hóa & Thẩm định Số điện thoại di động Việt Nam
 */
export const validateAndSanitizePhone = (rawText = '') => {
  if (!rawText || typeof rawText !== 'string') {
    return { isValid: false, phone: '', errorReason: 'EMPTY' };
  }

  // Tìm các chuỗi có định dạng giống số điện thoại
  // Hỗ trợ: 0988.776.655, 0988 776 655, +84988776655, 84988776655, o988...
  const phonePattern = /(?:(?:\+84|84|0|o|O)[.\s-]*)((?:3|5|7|8|9)[0-9.\s-]{8,12})\b/;
  const match = rawText.match(phonePattern);

  if (!match) {
    // Thử tìm bất kỳ chuỗi số nào dài 8-12 ký tự để bắt lỗi thừa/thiếu
    const fallbackMatch = rawText.match(/\b\d{8,13}\b/);
    if (fallbackMatch) {
      const num = fallbackMatch[0];
      if (num.length < 10) return { isValid: false, phone: num, errorReason: 'TOO_SHORT' };
      if (num.length > 11) return { isValid: false, phone: num, errorReason: 'TOO_LONG' };
      return { isValid: false, phone: num, errorReason: 'INVALID_TELCO_PREFIX' };
    }
    return { isValid: false, phone: '', errorReason: 'NOT_FOUND' };
  }

  // Làm sạch các ký tự đặc biệt
  let cleaned = (match[0] || '').replace(/[.\s-]/g, '').replace(/^[oO]/, '0');

  // Đổi +84 hoặc 84 thành 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Kiểm tra độ dài chuẩn (10 chữ số)
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      phone: cleaned,
      errorReason: cleaned.length < 10 ? 'TOO_SHORT' : 'TOO_LONG'
    };
  }

  // Kiểm tra đầu số di động hợp lệ tại Việt Nam (03, 05, 07, 08, 09)
  const isVnMobile = /^(0[3|5|7|8|9])[0-9]{8}$/.test(cleaned);
  if (!isVnMobile) {
    return { isValid: false, phone: cleaned, errorReason: 'INVALID_TELCO_PREFIX' };
  }

  // Lọc số ảo / số rác
  // 1. Số liên tiếp tăng/giảm dần
  if (cleaned === '0123456789' || cleaned === '0987654321') {
    return { isValid: false, phone: cleaned, errorReason: 'DUMMY_SEQUENTIAL' };
  }

  // 2. Toàn bộ chữ số sau số 0 giống hệt nhau (vd: 0999999999, 0888888888, 0000000000)
  const suffix = cleaned.slice(1);
  if (/^(\d)\1+$/.test(suffix)) {
    return { isValid: false, phone: cleaned, errorReason: 'DUMMY_REPEATED' };
  }

  return {
    isValid: true,
    phone: cleaned,
    errorReason: 'NONE'
  };
};

/**
 * 2. Đánh giá chất lượng và làm sạch Địa chỉ giao hàng
 */
export const evaluateAddressQuality = (rawAddress = '') => {
  if (!rawAddress || typeof rawAddress !== 'string') {
    return {
      quality: 'INCOMPLETE',
      cleanAddress: '',
      customerNote: '',
      feedbackMessage: 'Dạ bạn cho shop xin địa chỉ nhận hàng cụ thể (Số nhà, đường, phường/xã, quận/huyện) nhé!'
    };
  }

  let text = rawAddress.trim();

  // Guard: Nếu chuỗi là câu hỏi tra cứu đơn hàng, thắc mắc thông tin đơn hoặc chào hỏi, TUYỆT ĐỐI không phải địa chỉ
  const isQuestionOrInquiry = /(?:thông\s*tin\s*đơn|kiểm\s*tra\s*đơn|tra\s*cứu\s*đơn|đơn\s*(?:hàng\s*)?(?:vừa|đã)\s*đặt|đơn\s*của\s*(?:tôi|mình|em)|khi\s*nào\s*giao|bao\s*giờ\s*giao|hủy\s*đơn|đổi\s*địa\s*chỉ|tôi\s*cần\s*biết|cho\s*tôi\s*biết|tôi\s*muốn\s*hỏi)/i.test(text);
  if (isQuestionOrInquiry) {
    return {
      quality: 'NONE',
      cleanAddress: '',
      customerNote: '',
      feedbackMessage: ''
    };
  }

  // A. Tách ghi chú giao hàng nếu có (vd: "giao giờ hành chính", "gọi trước khi giao", "ship buổi chiều")
  let customerNote = '';
  const noteMatch = text.match(/(giao\s+(?:giờ|buổi|sáng|chiều|tối|ngày|hành chính)[^,.]*|gọi\s+trước\s+khi\s+giao|để\s+ở\s+cửa|để\s+bảo\s+vệ)/i);
  if (noteMatch) {
    customerNote = noteMatch[0].trim();
    text = text.replace(noteMatch[0], '').trim();
  }

  // B. Cắt bỏ các tiền tố hành động đơn hoặc ghép (vd: "giao về", "ship đến", "gửi về", "địa chỉ là:")
  text = text
    .replace(/^(?:cho\s+(?:mình|em|anh)\s+lấy\s+[^,]+?(?:về|đến|ở|tại)\s+)/i, '')
    .replace(/^(?:giao|ship|gửi)?\s*(?:về|đến|ở|tại)\s+/i, '')
    .replace(/^(?:địa chỉ(?:\s*là)?:?|đ\/c:?)\s+/i, '')
    .replace(/^(?:cho mình lấy|cho em lấy|cho anh lấy|mình muốn mua|đặt hàng|mua|ship|giao|gửi)\s+/i, '')
    .replace(/^(?:về|đến|ở|tại)\s+/i, '')
    .trim();

  // C. Cắt bỏ các từ phụ đệm cuối câu
  text = text
    .replace(/[,.\s-]+(cho|mình|nhé|nha|ạ|sđt|sdt|số đt|đt|alo|liên hệ|call|nhé shop|nha shop)[:\s]*$/i, '')
    .replace(/[,.\s-]+(nhé|nha|ạ|sđt|sdt|số đt|đt)[:\s]*$/i, '')
    .replace(/^[,.\s-]+/, '')
    .replace(/[,.\s-]+$/, '')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  const lower = text.toLowerCase();

  // Kiểm tra yếu tố chi tiết (Số nhà, ngõ, đường, thôn, xóm...) có biên từ ngữ chuẩn xác
  const hasMicro = /(?:số\s*\d+|\d+\s*[\/-]\s*\d+|\bngõ\b|\bngách\b|\bhẻm\b|\bđường\b|\bphố\b|(?:\b|\s)(?:thôn|xóm|ấp|bản|tổ|khu)(?:\b|\s|[,\./\-])|\bchung\s*cư\b|\btòa\b|\btoà\b|\bct\d\b|\bkđt\b|\bphòng\b)/i.test(lower) ||
    /^\d+[a-zA-Z]?\s+/.test(lower); // Bắt đầu bằng số nhà (vd: "25 Cầu Giấy")

  // Kiểm tra yếu tố hành chính (Phường, xã, quận, huyện, tỉnh/thành phố)
  const hasMacro = /(?:\bphường\b|\bxã\b|\bthị\s*trấn\b|\bquận\b|\bhuyện\b|\bthị\s*xã\b|\btp\b|\bthành\s*phố\b|\btỉnh\b|\bhà\s*nội\b|\bhcm\b|\bhồ\s*chí\s*minh\b|\bđà\s*nẵng\b|\bhải\s*phòng\b|\bcần\s*thơ\b|\bbình\s*dương\b|\bđồng\s*nai\b|\bquảng\s*ninh\b|\bthái\s*bình\b|\bnam\s*định\b|\bhải\s*dương\b|\bbắc\s*ninh\b)/i.test(lower);

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Đánh giá chất lượng địa chỉ
  if ((hasMicro && (hasMacro || wordCount >= 3)) || (wordCount >= 4 && hasMicro)) {
    return {
      quality: 'VALID',
      cleanAddress: text,
      customerNote,
      feedbackMessage: ''
    };
  }

  // Trường hợp chỉ có vùng/quận/tỉnh chung chung mà không có số nhà/ngõ
  if (hasMacro && !hasMicro) {
    return {
      quality: 'VAGUE_AREA',
      cleanAddress: text,
      customerNote,
      feedbackMessage: `Dạ shop đã ghi nhận bạn ở khu vực "${text}". Tuy nhiên để shipper giao tận nơi, bạn cho shop xin thêm Số nhà, tên Đường (hoặc Thôn/Xóm/Ngõ) cụ thể nữa nhé ạ!`
    };
  }

  // Trường hợp có từ khóa gợi ý địa chỉ (vd: "địa chỉ là...", "ship về...", "giao đến...")
  const hasAddressLead = /(?:địa chỉ|giao về|ship về|gửi về|đến địa chỉ|ở tại|ở số|nhà ở|chỗ ở)/i.test(rawAddress);
  if (hasAddressLead) {
    return {
      quality: 'INCOMPLETE',
      cleanAddress: text,
      customerNote,
      feedbackMessage: 'Dạ bạn cho shop xin địa chỉ nhận hàng cụ thể (gồm Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP) để bên em gửi hàng cho mình nha!'
    };
  }

  // Nếu câu nói thông thường hoàn toàn KHÔNG có dấu hiệu địa chỉ nào -> cleanAddress phải là rỗng ''
  return {
    quality: 'NONE',
    cleanAddress: '',
    customerNote: '',
    feedbackMessage: ''
  };
};

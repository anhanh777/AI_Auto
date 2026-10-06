/**
 * Tự động sinh mã đơn hàng độc nhất theo định dạng: ORD-YYYYMMDD-XXXX
 * @returns {string} Mã đơn hàng (VD: "ORD-20261006-8F2B")
 */
export const generateOrderCode = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${randomHex}`;
};

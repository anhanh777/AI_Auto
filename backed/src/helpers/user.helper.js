/**
 * Lọc bỏ các trường nhạy cảm như password trước khi trả về cho Client
 * @param {Object} user - Đối tượng User từ Mongoose
 * @returns {Object} Đối tượng User an toàn
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  return userObj;
};

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'ai_sales_default_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Tạo Access Token JWT cho người dùng
 * @param {Object} payload - Dữ liệu nhúng trong token (id, username, role)
 * @returns {string} Token JWT
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Xác thực và giải mã Token JWT
 * @param {string} token - Chuỗi token gửi lên
 * @returns {Object} Payload giải mã
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

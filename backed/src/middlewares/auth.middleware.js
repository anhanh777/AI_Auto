import { verifyToken } from '../helpers/jwt.helper.js';
import { User } from '../models/User.model.js';
import { sendError } from '../utils/response.util.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Vui lòng đăng nhập để truy cập tài nguyên này', null, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).populate('role_id');
    if (!user) {
      return sendError(res, 'Tài khoản không tồn tại trên hệ thống', null, 401);
    }

    if (!user.is_active) {
      return sendError(res, 'Tài khoản của bạn đã bị vô hiệu hóa', null, 403);
    }

    // Gán thông tin user vào Request
    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn', error.message, 401);
  }
};

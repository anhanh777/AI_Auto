import { Notification } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50);
    return sendSuccess(res, 'Lấy danh sách thông báo thành công', notifications);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true },
      { new: true }
    );
    return sendSuccess(res, 'Đánh dấu đã đọc thành công', notification);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true }
    );
    return sendSuccess(res, 'Đã đánh dấu tất cả thông báo là đã đọc');
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
    return sendSuccess(res, 'Đã xóa thông báo thành công');
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

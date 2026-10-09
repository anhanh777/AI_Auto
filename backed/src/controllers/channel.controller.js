import {
  getChannelsService,
  createChannelService,
  updateChannelService,
  deleteChannelService
} from '../services/channel.service.js';

export const getChannels = async (req, res, next) => {
  try {
    const businessId = req.query.business_id || req.headers['x-business-id'];
    const channels = await getChannelsService(businessId);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách kênh thành công',
      data: channels
    });
  } catch (error) {
    next(error);
  }
};

export const createChannel = async (req, res, next) => {
  try {
    const channel = await createChannelService(req.body, req.user?._id);
    return res.status(201).json({
      success: true,
      message: 'Kết nối kênh mới thành công',
      data: channel
    });
  } catch (error) {
    next(error);
  }
};

export const updateChannel = async (req, res, next) => {
  try {
    const channel = await updateChannelService(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật kênh thành công',
      data: channel
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChannel = async (req, res, next) => {
  try {
    await deleteChannelService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Xóa kênh thành công'
    });
  } catch (error) {
    next(error);
  }
};

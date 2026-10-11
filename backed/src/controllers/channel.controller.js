import {
  getChannelsService,
  createChannelService,
  updateChannelService,
  deleteChannelService,
  getFacebookPagesFromTokenService,
  connectFacebookPageService
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

export const getFacebookPages = async (req, res, next) => {
  try {
    const userAccessToken = req.body.user_access_token || req.query.user_access_token;
    const pages = await getFacebookPagesFromTokenService(userAccessToken);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách Fanpage từ Meta thành công',
      data: pages
    });
  } catch (error) {
    next(error);
  }
};

export const connectFacebookPage = async (req, res, next) => {
  try {
    const businessId = req.headers['x-business-id'] || req.body.business_id;
    const channel = await connectFacebookPageService({ ...req.body, business_id: businessId }, req.user?._id);
    return res.status(201).json({
      success: true,
      message: 'Kết nối Fanpage vào hệ thống thành công',
      data: channel
    });
  } catch (error) {
    next(error);
  }
};

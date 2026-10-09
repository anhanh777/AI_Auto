import { Channel } from '../models/Channel.model.js';
import { Business } from '../models/Business.model.js';

export const getChannelsService = async (businessId) => {
  const filter = {};
  if (businessId) {
    filter.business_id = businessId;
  }
  const channels = await Channel.find(filter)
    .populate('business_id', 'business_name code logo_url')
    .sort({ created_at: -1 });
  return channels;
};

export const createChannelService = async (data, userId) => {
  const newChannel = new Channel({
    ...data,
    created_by: userId
  });
  await newChannel.save();
  return newChannel;
};

export const updateChannelService = async (channelId, data) => {
  const updated = await Channel.findByIdAndUpdate(channelId, data, { new: true });
  if (!updated) {
    throw new Error('Không tìm thấy kênh cần cập nhật');
  }
  return updated;
};

export const deleteChannelService = async (channelId) => {
  const deleted = await Channel.findByIdAndDelete(channelId);
  if (!deleted) {
    throw new Error('Không tìm thấy kênh cần xóa');
  }
  return deleted;
};

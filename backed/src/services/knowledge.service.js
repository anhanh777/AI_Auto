import { KnowledgeBase } from '../models/index.js';

export const getKnowledgeService = async ({ business_id, search = '', category = '' }) => {
  if (!business_id) throw new Error('business_id là bắt buộc');

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { content: searchRegex },
      { keywords: searchRegex }
    ];
  }

  if (category && category.trim() !== '') {
    filter.category = category;
  }

  const items = await KnowledgeBase.find(filter).sort({ updated_at: -1 });
  return items;
};

export const getKnowledgeByIdService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const item = await KnowledgeBase.findOne(filter);
  if (!item) throw new Error('Không tìm thấy tài liệu tri thức');
  return item;
};

export const createKnowledgeService = async (data, userId) => {
  if (!data.business_id) throw new Error('business_id là bắt buộc');
  const item = await KnowledgeBase.create({
    ...data,
    created_by: userId
  });
  return item;
};

export const updateKnowledgeService = async (id, data, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const item = await KnowledgeBase.findOneAndUpdate(filter, data, { new: true });
  if (!item) throw new Error('Không tìm thấy tài liệu tri thức để cập nhật');
  return item;
};

export const deleteKnowledgeService = async (id, business_id) => {
  const filter = { _id: id };
  if (business_id) filter.business_id = business_id;
  const result = await KnowledgeBase.findOneAndDelete(filter);
  if (!result) throw new Error('Không tìm thấy tài liệu tri thức để xóa');
  return { message: 'Đã xóa tài liệu tri thức thành công' };
};

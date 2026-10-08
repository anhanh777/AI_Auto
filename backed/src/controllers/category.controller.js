import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService
} from '../services/category.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getCategories = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const { search, is_active } = req.query;

    const categories = await getCategoriesService({
      business_id,
      search,
      is_active
    });
    return sendSuccess(res, 'Lấy danh sách danh mục thành công', categories);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const category = await getCategoryByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy thông tin danh mục thành công', category);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createCategory = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const categoryData = { ...req.body, business_id };

    const newCategory = await createCategoryService(categoryData, req.user?._id);
    return sendSuccess(res, 'Tạo danh mục sản phẩm thành công', newCategory, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updated = await updateCategoryService(req.params.id, req.body, req.user?._id);
    return sendSuccess(res, 'Cập nhật danh mục thành công', updated);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const result = await deleteCategoryService(req.params.id, business_id);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

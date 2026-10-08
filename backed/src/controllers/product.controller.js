import {
  getProductsService,
  getProductByIdService,
  createProductService,
  updateProductService,
  deleteProductService,
  importStockService
} from '../services/product.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export const getProducts = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const { page, limit, search, category_id, status, stock_status } = req.query;

    const result = await getProductsService({
      business_id,
      page,
      limit,
      search,
      category_id,
      status,
      stock_status
    });

    return sendSuccess(res, 'Lấy danh sách sản phẩm thành công', result.products, 200, {
      pagination: result.pagination,
      metrics: result.metrics
    });
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const getProductById = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const product = await getProductByIdService(req.params.id, business_id);
    return sendSuccess(res, 'Lấy thông tin sản phẩm thành công', product);
  } catch (error) {
    return sendError(res, error.message, null, 404);
  }
};

export const createProduct = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.body.business_id;
    const productData = { ...req.body, business_id };

    const newProduct = await createProductService(productData, req.user?._id);
    return sendSuccess(res, 'Tạo sản phẩm mới thành công', newProduct, 201);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updated = await updateProductService(req.params.id, req.body, req.user?._id);
    return sendSuccess(res, 'Cập nhật sản phẩm thành công', updated);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const business_id = req.headers['x-business-id'] || req.query.business_id;
    const result = await deleteProductService(req.params.id, business_id);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

export const importStock = async (req, res) => {
  try {
    const result = await importStockService(req.params.id, req.body, req.user?._id);
    return sendSuccess(res, result.message, result.product);
  } catch (error) {
    return sendError(res, error.message, null, 400);
  }
};

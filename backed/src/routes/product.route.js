import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importStock
} from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { validateProductInput } from '../validations/product.validation.js';

const productRouter = Router();

// Yêu cầu xác thực tài khoản
productRouter.use(authenticate);

productRouter.get('/', getProducts);
productRouter.get('/:id', getProductById);
productRouter.post('/', validateBody(validateProductInput), createProduct);
productRouter.put('/:id', updateProduct);
productRouter.delete('/:id', deleteProduct);
productRouter.post('/:id/import-stock', importStock);

export default productRouter;

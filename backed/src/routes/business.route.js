import { Router } from 'express';
import {
  getBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness
} from '../controllers/business.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { validateBusinessInput } from '../validations/business.validation.js';

const businessRouter = Router();

// Yêu cầu xác thực tài khoản
businessRouter.use(authenticate);

businessRouter.get('/', getBusinesses);
businessRouter.get('/:id', getBusinessById);
businessRouter.post('/', validateBody(validateBusinessInput), createBusiness);
businessRouter.put('/:id', updateBusiness);
businessRouter.delete('/:id', deleteBusiness);

export default businessRouter;

import { Router } from 'express';
import {
  getBusinesses,
  getBusinessById,
  createBusiness,
  joinBusiness,
  getBusinessJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateBusiness,
  deleteBusiness,
  toggleArchiveBusiness,
  getBusinessTags,
  createBusinessTag
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
businessRouter.post('/join', joinBusiness);
businessRouter.get('/:id/join-requests', getBusinessJoinRequests);
businessRouter.post('/join-requests/:requestId/approve', approveJoinRequest);
businessRouter.post('/join-requests/:requestId/reject', rejectJoinRequest);
businessRouter.put('/:id', updateBusiness);
businessRouter.put('/:id/archive', toggleArchiveBusiness);
businessRouter.delete('/:id', deleteBusiness);

// Quản lý Thẻ nhãn Pancake Style của Cửa hàng
businessRouter.get('/:id/tags', getBusinessTags);
businessRouter.post('/:id/tags', createBusinessTag);

export default businessRouter;

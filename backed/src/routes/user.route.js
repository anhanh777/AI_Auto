import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  deleteUser
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasPermission } from '../middlewares/role.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { validateCreateUserInput, validateUpdateUserInput } from '../validations/user.validation.js';

const userRouter = Router();

// Tất cả các API quản lý nhân sự đều yêu cầu đăng nhập & quyền USER_MANAGE
userRouter.use(authenticate, hasPermission('USER_MANAGE'));

userRouter.get('/', getUsers);
userRouter.get('/:id', getUserById);
userRouter.post('/', validateBody(validateCreateUserInput), createUser);
userRouter.put('/:id', validateBody(validateUpdateUserInput), updateUser);
userRouter.patch('/:id/reset-password', resetPassword);
userRouter.delete('/:id', deleteUser);

export default userRouter;

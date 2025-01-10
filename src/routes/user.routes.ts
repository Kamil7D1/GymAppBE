import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCurrentUser, updateUser, updatePassword } from '../controllers/userController';

const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get('/me', getCurrentUser);
userRouter.put('/me', updateUser);
userRouter.put('/me/password', updatePassword);

export { userRouter };
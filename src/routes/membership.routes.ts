import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { purchaseMembership, getCurrentMembership } from '../controllers/membershipController';

export const membershipRouter = Router();

membershipRouter.post('/purchase', requireAuth, purchaseMembership);
membershipRouter.get('/current', requireAuth, getCurrentMembership);
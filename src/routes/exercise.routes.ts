import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    getAllExercises,
    getExerciseById,
    createExercise
} from '../controllers/exerciseController';

export const exerciseRouter = Router();

exerciseRouter.get('/', requireAuth, getAllExercises);
exerciseRouter.get('/:id', requireAuth, getExerciseById);
exerciseRouter.post('/', requireAuth, createExercise);
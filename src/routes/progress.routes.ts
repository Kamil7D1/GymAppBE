import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    addMeasurement,
    getMeasurements,
    getMeasurementStats,
    addExerciseProgress,
    getExerciseProgress,
    getExerciseStats
} from '../controllers/progressController';

export const progressRouter = Router();

// Pomiary
progressRouter.post('/measurements', requireAuth, addMeasurement);
progressRouter.get('/measurements', requireAuth, getMeasurements);
progressRouter.get('/measurements/stats', requireAuth, getMeasurementStats);

// Ćwiczenia
progressRouter.post('/exercise', requireAuth, addExerciseProgress);
progressRouter.get('/exercise', requireAuth, getExerciseProgress);
progressRouter.get('/exercise/stats', requireAuth, getExerciseStats);
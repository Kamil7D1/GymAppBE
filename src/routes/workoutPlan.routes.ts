import { Router } from 'express';
import { requireAuth, requireTrainerRole } from '../middleware/auth';
import {
    createWorkoutPlan,
    createClientWorkoutPlan,
    getUserWorkoutPlans,
    updateWorkoutPlan,
    deleteWorkoutPlan
} from '../controllers/workoutPlanController';

const workoutPlanRouter = Router();
workoutPlanRouter.use(requireAuth);

// User workout plans
workoutPlanRouter.post('/', createWorkoutPlan);
workoutPlanRouter.get('/', getUserWorkoutPlans);
workoutPlanRouter.put('/:id', updateWorkoutPlan);
workoutPlanRouter.delete('/:id', deleteWorkoutPlan);

// Trainer routes - protected by trainer role
workoutPlanRouter.post('/client', requireTrainerRole, createClientWorkoutPlan);

export { workoutPlanRouter };
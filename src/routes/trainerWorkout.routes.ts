import { Router } from 'express';
import { requireAuth, requireTrainerRole } from '../middleware/auth';
import {
    getTrainerClients,
    getClientWorkoutPlans,
    updateClientWorkoutPlan,
    deleteWorkoutPlan,
    createClientWorkoutPlan
} from '../controllers/trainerWorkoutController';

const trainerWorkoutRouter = Router();
trainerWorkoutRouter.use(requireAuth);
trainerWorkoutRouter.use(requireTrainerRole);

trainerWorkoutRouter.get('/clients', getTrainerClients);
trainerWorkoutRouter.get('/clients/:clientId/plans', getClientWorkoutPlans);
trainerWorkoutRouter.put('/plans/:planId', updateClientWorkoutPlan);
trainerWorkoutRouter.post('/clients/:clientId/plans', createClientWorkoutPlan);
trainerWorkoutRouter.delete('/plans/:planId', deleteWorkoutPlan);

export { trainerWorkoutRouter };
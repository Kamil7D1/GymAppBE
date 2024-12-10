import { Router } from "express";
import { requireAuth, requireTrainerRole } from "../middleware/auth";
import {
    addSession,
    getTrainerSessions,
    getTrainingSessions,
    getTrainers,
    getTrainerAvailability
} from "../controllers/trainerController";
import { validateSessionDate } from "../middleware/validateSession";
import {
    getClientWorkoutPlans,
    getTrainerClients,
    updateClientWorkoutPlan
} from "../controllers/trainerWorkoutController";

export const trainerRouter = Router();

// Zarządzanie sesjami grupowymi
trainerRouter.post('/sessions', requireAuth, requireTrainerRole, validateSessionDate, addSession);
trainerRouter.get('/sessions', requireAuth, requireTrainerRole, getTrainerSessions);
trainerRouter.get('/training-sessions', requireAuth, requireTrainerRole, getTrainingSessions);

// Endpoints dla treningów personalnych
trainerRouter.get('/list', requireAuth, getTrainers); // Lista wszystkich trenerów
trainerRouter.get('/:trainerId/availability/:date', requireAuth, getTrainerAvailability);

trainerRouter.get('/clients', requireAuth, requireTrainerRole, getTrainerClients);
trainerRouter.get('/clients/:clientId/workout-plans', requireAuth, requireTrainerRole, getClientWorkoutPlans);
trainerRouter.put('/workout-plans/:planId', requireAuth, requireTrainerRole, updateClientWorkoutPlan);
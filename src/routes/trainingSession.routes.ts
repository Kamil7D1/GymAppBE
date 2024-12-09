import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    checkRegistrationStatus, getSessionParticipants,
    getTrainingSessions,
    registerForSession, removeParticipantFromSession,
    unregisterFromSession
} from '../controllers/trainingSessionController';

export const trainingSessionRouter = Router();

trainingSessionRouter.get('/', requireAuth, getTrainingSessions);
trainingSessionRouter.post('/:sessionId/register', requireAuth, registerForSession);
trainingSessionRouter.post('/:sessionId/unregister', requireAuth, unregisterFromSession);
trainingSessionRouter.get('/:sessionId/registration-status', requireAuth, checkRegistrationStatus);
trainingSessionRouter.get('/:sessionId/participants', requireAuth, getSessionParticipants);
trainingSessionRouter.delete('/:sessionId/participants/:participantId', requireAuth, removeParticipantFromSession);
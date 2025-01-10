import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
    bookPersonalTraining,
    getClientBookings,
    getTrainerBookings,
    updateBookingStatus
} from '../controllers/personalTrainingController';

export const personalTrainingRouter = Router();

personalTrainingRouter.post('/book', requireAuth, bookPersonalTraining);
personalTrainingRouter.get('/my-bookings', requireAuth, getClientBookings);
personalTrainingRouter.get('/trainer-bookings', requireAuth, getTrainerBookings);
personalTrainingRouter.patch('/bookings/:bookingId/status', requireAuth, updateBookingStatus);
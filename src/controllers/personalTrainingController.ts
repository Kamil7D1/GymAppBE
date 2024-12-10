// controllers/personalTrainingController.ts
import { RequestHandler } from 'express';
import {PrismaClient, Role, TrainingStatus} from '@prisma/client';

const prisma = new PrismaClient();

interface JwtUser {
    id: number;
    email: string;
    role: string;
}

export const bookPersonalTraining: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;
        const { trainerId, date, time, message } = req.body;

        const trainer = await prisma.user.findUnique({
            where: {
                id: Number(trainerId),
                role: Role.TRAINER
            }
        });

        if (!trainer) {
            res.status(404).json({ error: "Trainer not found" });
            return;
        }

        const bookingDate = new Date(date);
        const [bookingHour, bookingMinute] = time.split(':').map(Number);

        // Konwertuj wybrany czas na minuty dla łatwiejszego porównania
        const selectedTimeInMinutes = bookingHour * 60 + bookingMinute;

        if (selectedTimeInMinutes + 60 > 22 * 60) {
            res.status(400).json({
                error: "Training session cannot end after 22:00"
            });
            return;
        }

        // Sprawdź zajęcia grupowe trenera z uwzględnieniem 30-minutowego buforu
        const groupSessions = await prisma.trainingSession.findMany({
            where: {
                trainerId: Number(trainerId),
                date: bookingDate,
            },
            select: {
                startTime: true,
                endTime: true
            }
        });

        // Sprawdź czy wybrany czas nie koliduje z zajęciami grupowymi (uwzględniając bufor)
        for (const session of groupSessions) {
            const [startHour, startMinute] = session.startTime.split(':').map(Number);
            const [endHour, endMinute] = session.endTime.split(':').map(Number);

            const sessionStartInMinutes = startHour * 60 + startMinute;
            const sessionEndInMinutes = endHour * 60 + endMinute;

            // Sprawdź czy wybrany czas jest w zakresie 30 minut przed rozpoczęciem lub po zakończeniu zajęć
            if (
                (selectedTimeInMinutes >= sessionStartInMinutes - 30 && selectedTimeInMinutes <= sessionEndInMinutes) ||
                (selectedTimeInMinutes >= sessionStartInMinutes && selectedTimeInMinutes <= sessionEndInMinutes + 30)
            ) {
                res.status(400).json({
                    error: "Selected time is too close to trainer's group session. Please allow at least 30 minutes between sessions."
                });
                return;
            }
        }

        // Sprawdź treningi personalne z uwzględnieniem 30-minutowego buforu
        const personalTrainings = await prisma.personalTraining.findMany({
            where: {
                trainerId: Number(trainerId),
                date: bookingDate,
                status: {
                    in: [TrainingStatus.PENDING, TrainingStatus.CONFIRMED]
                }
            },
            select: {
                time: true
            }
        });

        // Sprawdź kolizje z innymi treningami personalnymi
        for (const training of personalTrainings) {
            const [trainingHour, trainingMinute] = training.time.split(':').map(Number);
            const trainingTimeInMinutes = trainingHour * 60 + trainingMinute;

            // Zakładamy, że trening personalny trwa godzinę
            if (
                Math.abs(selectedTimeInMinutes - trainingTimeInMinutes) < 30 ||
                Math.abs(selectedTimeInMinutes - (trainingTimeInMinutes + 60)) < 30
            ) {
                res.status(400).json({
                    error: "Selected time is too close to another personal training. Please allow at least 30 minutes between sessions."
                });
                return;
            }
        }

        // Jeśli wszystkie walidacje przeszły, utwórz rezerwację
        const booking = await prisma.personalTraining.create({
            data: {
                trainerId: Number(trainerId),
                clientId: user.id,
                date: bookingDate,
                time: time,
                message: message,
                status: TrainingStatus.PENDING
            }
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error booking personal training:', error);
        res.status(500).json({ error: "Failed to book personal training" });
    }
};

export const getClientBookings: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;

        const bookings = await prisma.personalTraining.findMany({
            where: {
                clientId: user.id
            },
            include: {
                trainer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        pricePerSession: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching client bookings:', error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
};

export const getTrainerBookings: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;

        if (user.role !== 'TRAINER') {
            res.status(403).json({ error: "Unauthorized" });
            return;
        }

        const bookings = await prisma.personalTraining.findMany({
            where: {
                trainerId: user.id
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching trainer bookings:', error);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
};

export const updateBookingStatus: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;
        const user = req.user as JwtUser;

        const booking = await prisma.personalTraining.findUnique({
            where: { id: Number(bookingId) },
            include: { trainer: true }
        });

        if (!booking) {
            res.status(404).json({ error: "Booking not found" });
            return;
        }

        if (booking.trainer.id !== user.id) {
            res.status(403).json({ error: "Unauthorized" });
            return;
        }

        const updatedBooking = await prisma.personalTraining.update({
            where: { id: Number(bookingId) },
            data: { status }
        });

        res.json(updatedBooking);
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: "Failed to update booking status" });
    }
};
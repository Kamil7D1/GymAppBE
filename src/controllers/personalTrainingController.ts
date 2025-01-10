import { Request, RequestHandler } from 'express';
import { PrismaClient, Role, TrainingStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestWithUser extends Request {
    user?: {
        id: string;
        email?: string;
        role?: string;
        firstName?: string;
        lastName?: string;
    };
}

export const bookPersonalTraining: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

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

        const selectedTimeInMinutes = bookingHour * 60 + bookingMinute;

        if (selectedTimeInMinutes + 60 > 22 * 60) {
            res.status(400).json({
                error: "Training session cannot end after 22:00"
            });
            return;
        }

        const booking = await prisma.personalTraining.create({
            data: {
                trainerId: Number(trainerId),
                clientId: userId,
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

export const getClientBookings: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        const bookings = await prisma.personalTraining.findMany({
            where: {
                clientId: userId
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

export const getTrainerBookings: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        if (req.user.role !== 'TRAINER') {
            res.status(403).json({ error: "Unauthorized" });
            return;
        }

        const bookings = await prisma.personalTraining.findMany({
            where: {
                trainerId: userId
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

export const updateBookingStatus: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        const { bookingId } = req.params;
        const { status } = req.body;

        const booking = await prisma.personalTraining.findUnique({
            where: { id: Number(bookingId) },
            include: { trainer: true }
        });

        if (!booking) {
            res.status(404).json({ error: "Booking not found" });
            return;
        }

        if (booking.trainer.id !== userId) {
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
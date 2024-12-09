// controllers/personalTrainingController.ts
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

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

        // Sprawdź czy trener istnieje
        const trainer = await prisma.user.findUnique({
            where: {
                id: Number(trainerId),
                role: 'TRAINER'
            }
        });

        if (!trainer) {
            res.status(404).json({ error: "Trainer not found" });
            return;
        }

        // Sprawdź czy termin jest dostępny
        const existingBooking = await prisma.personalTraining.findFirst({
            where: {
                trainerId: Number(trainerId),
                date: new Date(date),
                time: time,
                status: {
                    in: ['PENDING', 'CONFIRMED']
                }
            }
        });

        if (existingBooking) {
            res.status(400).json({ error: "This time slot is already booked" });
            return;
        }

        // Utwórz rezerwację
        const booking = await prisma.personalTraining.create({
            data: {
                trainerId: Number(trainerId),
                clientId: user.id,
                date: new Date(date),
                time: time,
                message: message,
                status: 'PENDING'
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
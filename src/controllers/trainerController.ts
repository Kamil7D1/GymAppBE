import {RequestHandler} from "express";
import {Prisma, PrismaClient, Role, TrainingStatus} from "@prisma/client";

const prisma = new PrismaClient();

interface JwtUser {
    id: number;
    email: string;
}

interface SessionData {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    maxParticipants: number;
    isRecurring: boolean;
}

interface Booking {
    time: string;
}

export const addSession: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;
        const { title, date, startTime, endTime, maxParticipants, isRecurring } = req.body;

        const sessionDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sessionDate <= today) {
            res.status(400).json({ error: "Cannot create sessions for today or past dates" });
            return;
        }

        const existingSession = await prisma.trainingSession.findFirst({
            where: {
                trainerId: trainer.id,
                date: new Date(date),
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } }
                        ]
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } }
                        ]
                    }
                ]
            }
        });

        if (existingSession) {
            res.status(400).json({ error: "You already have a session scheduled at this time" });
            return;
        }

        if (isRecurring) {
            const sessions = [];
            for (let i = 0; i < 8; i++) {
                const sessionDate = new Date(date);
                sessionDate.setDate(sessionDate.getDate() + (i * 7));

                sessions.push({
                    title,
                    date: sessionDate,
                    startTime,
                    endTime,
                    maxParticipants,
                    trainerId: trainer.id,
                    isRecurring: true
                });
            }

            await prisma.trainingSession.createMany({
                data: sessions
            });
        } else {
            // Pojedyncza sesja
            await prisma.trainingSession.create({
                data: {
                    title,
                    date: new Date(date),
                    startTime,
                    endTime,
                    maxParticipants,
                    trainerId: trainer.id,
                    isRecurring: false
                }
            });
        }

        res.status(201).json({ message: "Session(s) created successfully" });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: "Failed to create session" });
    }
};

export const getTrainerSessions: RequestHandler = async (req, res): Promise<void> => {
    const trainer = req.user as JwtUser;

    const sessions = await prisma.recurringSession.findMany({
        where: {
            trainerId: trainer.id,
            active: true
        }
    });

    res.json(sessions);
};

export const getTrainingSessions: RequestHandler = async (_req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessions = await prisma.trainingSession.findMany({
            include: {
                trainer: true,
                participants: true,
            },
            where: {
                date: {
                    gte: today,
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        const formattedSessions = sessions.map((session) => ({
            id: session.id.toString(),
            title: `${session.title} with ${session.trainer.firstName}`,
            start: `${session.date.toISOString().split("T")[0]}T${session.startTime}`,
            end: `${session.date.toISOString().split("T")[0]}T${session.endTime}`,
            trainerId: session.trainerId,
            maxParticipants: session.maxParticipants,
            currentParticipants: session.participants.length,
            isRecurring: session.isRecurring,
        }));

        res.json(formattedSessions);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};

export const getTrainers: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainers = await prisma.user.findMany({
            where: {
                role: Role.TRAINER
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                description: true,
                pricePerSession: true,
            }
        });

        res.json(trainers);
    } catch (error) {
        console.error('Error fetching trainers:', error);
        res.status(500).json({ error: "Failed to fetch trainers" });
    }
};

export const getTrainerAvailability: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { trainerId, date } = req.params;

        const bookings = await prisma.personalTraining.findMany({
            where: {
                trainerId: Number(trainerId),
                date: new Date(date),
                status: {
                    in: [TrainingStatus.PENDING, TrainingStatus.CONFIRMED]
                }
            },
            select: {
                time: true
            }
        });

        const availableHours = Array.from({ length: 17 }, (_, i) =>
            `${String(i + 6).padStart(2, '0')}:00`
        ).filter(time => !bookings.some((booking: Booking) => booking.time === time));

        res.json(availableHours);
    } catch (error) {
        console.error('Error fetching trainer availability:', error);
        res.status(500).json({ error: "Failed to fetch trainer availability" });
    }
};
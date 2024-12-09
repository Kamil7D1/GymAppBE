import { RequestHandler } from 'express';
import {PrismaClient, Role} from '@prisma/client';

const prisma = new PrismaClient();

interface JwtUser {
    id: number;
    email: string;
    role: Role;
}
export const getTrainingSessions: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessions = await prisma.trainingSession.findMany({
            include: {
                trainer: true,
                participants: true
            },
            where: {
                date: {
                    gte: today
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            title: `${session.title} with ${session.trainer.firstName}`,
            date: session.date.toISOString().split('T')[0],
            start: `${session.date.toISOString().split('T')[0]}T${session.startTime}`,
            end: `${session.date.toISOString().split('T')[0]}T${session.endTime}`,
            trainerId: session.trainerId,
            maxParticipants: session.maxParticipants,
            currentParticipants: session.participants.length,
            isUserRegistered: session.participants.some(p => p.id === user?.id),
            isRecurring: session.isRecurring
        }));

        res.json(formattedSessions);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};

export const registerForSession: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const user = req.user as JwtUser;

        const session = await prisma.trainingSession.findUnique({
            where: { id: Number(sessionId) },
            include: {
                participants: true
            }
        });

        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }

        if (session.participants.length >= session.maxParticipants) {
            res.status(400).json({ error: "Session is full" });
            return;
        }

        if (session.participants.some(p => p.id === user.id)) {
            res.status(400).json({ error: "Already registered" });
            return;
        }

        await prisma.trainingSession.update({
            where: { id: Number(sessionId) },
            data: {
                participants: {
                    connect: { id: user.id }
                }
            }
        });

        res.json({ message: "Successfully registered for session" });
    } catch (error) {
        res.status(500).json({ error: "Failed to register for session" });
    }
};

export const unregisterFromSession: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const user = req.user as JwtUser;

        const session = await prisma.trainingSession.findUnique({
            where: { id: Number(sessionId) },
            include: {
                participants: true
            }
        });

        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }

        if (!session.participants.some(p => p.id === user.id)) {
            res.status(400).json({ error: "Not registered for this session" });
            return;
        }

        await prisma.trainingSession.update({
            where: { id: Number(sessionId) },
            data: {
                participants: {
                    disconnect: { id: user.id }
                }
            }
        });

        res.json({ message: "Successfully unregistered from session" });
    } catch (error) {
        res.status(500).json({ error: "Failed to unregister from session" });
    }
};

export const checkRegistrationStatus: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const user = req.user as JwtUser;

        const session = await prisma.trainingSession.findUnique({
            where: { id: Number(sessionId) },
            include: {
                participants: {
                    where: {
                        id: user.id
                    }
                }
            }
        });

        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }

        const isRegistered = session.participants.length > 0;
        res.json({ isRegistered });
    } catch (error) {
        res.status(500).json({ error: "Failed to check registration status" });
    }
};

export const getSessionParticipants: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const trainer = req.user as JwtUser;

        const session = await prisma.trainingSession.findUnique({
            where: {
                id: Number(sessionId),
                trainerId: trainer.id // Upewniamy się, że trener ma dostęp tylko do swoich sesji
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        if (!session) {
            res.status(404).json({ error: "Session not found or unauthorized" });
            return;
        }

        res.json({
            sessionDetails: {
                title: session.title,
                date: session.date,
                startTime: session.startTime,
                endTime: session.endTime,
                maxParticipants: session.maxParticipants,
            },
            participants: session.participants
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch participants" });
    }
};

// trainerController.ts

export const removeParticipantFromSession: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { sessionId, participantId } = req.params;
        const user = req.user as JwtUser;

        console.log('removeParticipantFromSession called with:', {
            sessionId,
            participantId,
            userId: user.id
        });

        const session = await prisma.trainingSession.findUnique({
            where: {
                id: Number(sessionId)
            },
            include: {
                participants: true
            }
        });

        if (!session) {
            console.log('Session not found');
            res.status(404).json({ error: "Session not found" });
            return;
        }

        if (session.trainerId !== user.id) {
            console.log('Unauthorized - trainer mismatch');
            res.status(403).json({ error: "Unauthorized" });
            return;
        }

        const isParticipantRegistered = session.participants.some(p => p.id === Number(participantId));
        if (!isParticipantRegistered) {
            console.log('Participant not found in session');
            res.status(404).json({ error: "Participant not found in this session" });
            return;
        }

        await prisma.trainingSession.update({
            where: { id: Number(sessionId) },
            data: {
                participants: {
                    disconnect: { id: Number(participantId) }
                }
            }
        });

        console.log('Participant removed successfully');
        res.json({ message: "Participant removed successfully" });
    } catch (error) {
        console.error('Error in removeParticipantFromSession:', error);
        res.status(500).json({ error: "Failed to remove participant from session" });
    }
};
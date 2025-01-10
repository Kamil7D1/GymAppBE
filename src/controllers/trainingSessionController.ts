import { Request, RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestWithUser extends Request {
    user?: {
        id: string;
        email?: string;
        role?: Role;
    };
}

interface PersonalTrainingSession {
    id: number;
    trainerId: number;
    clientId: number;
    date: Date;
    startTime: string;
    endTime: string;
    trainer: {
        firstName: string;
        lastName: string;
    };
}

export const getTrainingSessions: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Pobierz zwykłe sesje treningowe
        const groupSessions = await prisma.trainingSession.findMany({
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

        // Pobierz sesje personalne
        const personalSessions = await prisma.personalTraining.findMany({
            include: {
                trainer: true,
                client: true
            },
            where: {
                date: {
                    gte: today
                },
                status: 'CONFIRMED',
                OR: [
                    { clientId: userId },
                    { trainerId: userId }
                ]
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Formatuj zwykłe sesje
        const formattedGroupSessions = groupSessions.map(session => ({
            id: session.id,
            title: `${session.title} with ${session.trainer.firstName}`,
            date: session.date.toISOString().split('T')[0],
            start: `${session.date.toISOString().split('T')[0]}T${session.startTime}`,
            end: `${session.date.toISOString().split('T')[0]}T${session.endTime}`,
            trainerId: session.trainerId,
            maxParticipants: session.maxParticipants,
            currentParticipants: session.participants.length,
            isUserRegistered: session.participants.some(p => p.id === userId),
            isRecurring: session.isRecurring,
            type: 'GROUP'
        }));

        // Formatuj sesje personalne
        const formattedPersonalSessions = personalSessions.map(session => {
            const [hours, minutes] = session.time.split(':');
            const endTime = new Date(session.date);
            endTime.setHours(parseInt(hours), parseInt(minutes) + 60); // Dodaj 1 godzinę

            return {
                id: `p${session.id}`, // Prefiks 'p' dla rozróżnienia od zwykłych sesji
                title: `Personal Training with ${session.trainer.firstName}`,
                date: session.date.toISOString().split('T')[0],
                start: `${session.date.toISOString().split('T')[0]}T${session.time}:00`,
                end: `${session.date.toISOString().split('T')[0]}T${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}:00`,
                trainerId: session.trainerId,
                maxParticipants: 1,
                currentParticipants: 1,
                isUserRegistered: true,
                isRecurring: false,
                type: 'PERSONAL',
                clientId: session.clientId,
                status: session.status
            };
        });

        // Połącz wszystkie sesje
        const allSessions = [...formattedGroupSessions, ...formattedPersonalSessions];
        res.json(allSessions);

    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};

export const registerForSession: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { sessionId } = req.params;

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

        if (session.participants.some(p => p.id === userId)) {
            res.status(400).json({ error: "Already registered" });
            return;
        }

        await prisma.trainingSession.update({
            where: { id: Number(sessionId) },
            data: {
                participants: {
                    connect: { id: userId }
                }
            }
        });

        res.status(200).json({ message: "Zarejestrowano na sesję" });
    } catch (error) {
        console.error('Error registering for session:', error);
        res.status(500).json({ error: "Failed to register for session" });
    }
};

export const unregisterFromSession: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { sessionId } = req.params;

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

        if (!session.participants.some(p => p.id === userId)) {
            res.status(400).json({ error: "Not registered for this session" });
            return;
        }

        await prisma.trainingSession.update({
            where: { id: Number(sessionId) },
            data: {
                participants: {
                    disconnect: { id: userId }
                }
            }
        });

        res.status(200).json({ message: "Wyrejestrowano z sesji" });
    } catch (error) {
        console.error('Error unregistering from session:', error);
        res.status(500).json({ error: "Failed to unregister from session" });
    }
};

export const checkRegistrationStatus: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { sessionId } = req.params;

        const session = await prisma.trainingSession.findUnique({
            where: { id: Number(sessionId) },
            include: {
                participants: {
                    where: {
                        id: userId
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
        console.error('Error checking registration status:', error);
        res.status(500).json({ error: "Failed to check registration status" });
    }
};

export const getSessionParticipants: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const trainerId = parseInt(req.user.id, 10);
        if (isNaN(trainerId)) {
            res.status(400).json({ error: "Invalid trainer ID" });
            return;
        }

        const { sessionId } = req.params;

        const session = await prisma.trainingSession.findUnique({
            where: {
                id: Number(sessionId),
                trainerId: trainerId
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
        console.error('Error fetching session participants:', error);
        res.status(500).json({ error: "Failed to fetch participants" });
    }
};

export const removeParticipantFromSession: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const trainerId = parseInt(req.user.id, 10);
        if (isNaN(trainerId)) {
            res.status(400).json({ error: "Invalid trainer ID" });
            return;
        }

        const { sessionId, participantId } = req.params;

        console.log('removeParticipantFromSession called with:', {
            sessionId,
            participantId,
            trainerId
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

        if (session.trainerId !== trainerId) {
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
        console.error('Error removing participant from session:', error);
        res.status(500).json({ error: "Failed to remove participant from session" });
    }
};
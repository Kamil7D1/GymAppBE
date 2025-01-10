import { Request, RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestWithUser extends Request {
    user?: {
        id: string;
        email?: string;
        role?: string;
    };
}

interface Exercise {
    name: string;
    sets: number;
    reps: number;
    notes?: string;
}

export const getTrainerClients: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const clients = await prisma.user.findMany({
            where: {
                bookedPersonalTrainings: {
                    some: {
                        trainerId: trainerId,
                        status: {
                            in: ['PENDING', 'CONFIRMED']
                        }
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
            }
        });

        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
};

export const getClientWorkoutPlans: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { clientId } = req.params;

        const hasTrainings = await prisma.personalTraining.findFirst({
            where: {
                trainerId: trainerId,
                clientId: Number(clientId),
                status: {
                    in: ['CONFIRMED', 'PENDING']
                }
            }
        });

        if (!hasTrainings) {
            res.status(403).json({ error: 'Unauthorized - not a client' });
            return;
        }

        const workoutPlans = await prisma.workoutPlan.findMany({
            where: {
                userId: Number(clientId),
                trainerId: trainerId
            },
            include: {
                exercises: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                }
            }
        });

        res.json(workoutPlans);
    } catch (error) {
        console.error('Error fetching workout plans:', error);
        res.status(500).json({ error: 'Failed to fetch workout plans' });
    }
};

export const updateClientWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { planId } = req.params;
        const { name, description, exercises } = req.body;

        const existingPlan = await prisma.workoutPlan.findFirst({
            where: {
                id: Number(planId),
                trainerId: trainerId
            },
            select: {
                userId: true
            }
        });

        if (!existingPlan) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        await prisma.$transaction([
            prisma.exercise.deleteMany({
                where: { workoutPlanId: Number(planId) }
            }),
            prisma.workoutPlan.update({
                where: { id: Number(planId) },
                data: {
                    name,
                    description,
                    exercises: {
                        create: exercises.map((exercise: Exercise, index: number) => ({
                            ...exercise,
                            orderIndex: index
                        }))
                    }
                }
            })
        ]);

        const updatedPlan = await prisma.workoutPlan.findUnique({
            where: { id: Number(planId) },
            include: { exercises: true }
        });

        if (!updatedPlan) {
            res.status(404).json({ error: 'Plan not found after update' });
            return;
        }

        res.status(200).json(updatedPlan);
    } catch (error) {
        console.error('Error updating workout plan:', error);
        res.status(500).json({ error: 'Failed to update workout plan' });
    }
};

export const createClientWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const trainerId = parseInt(req.user.id, 10);
        const { clientId, name, description, exercises } = req.body;

        const hasTrainings = await prisma.personalTraining.findFirst({
            where: {
                trainerId: trainerId,
                clientId: Number(clientId),
                status: {
                    in: ['CONFIRMED', 'PENDING']
                }
            }
        });

        if (!hasTrainings) {
            res.status(403).json({ error: 'Unauthorized - not a client' });
            return;
        }

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name,
                description,
                userId: Number(clientId),
                trainerId,
                exercises: {
                    create: exercises.map((exercise: Exercise, index: number) => ({
                        ...exercise,
                        orderIndex: index
                    }))
                }
            },
            include: {
                exercises: true
            }
        });

        res.status(201).json(workoutPlan);
    } catch (error) {
        console.error('Error creating workout plan:', error);
        res.status(500).json({ error: 'Failed to create workout plan' });
    }
};

export const deleteWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const trainerId = parseInt(req.user.id, 10);
        const { planId } = req.params;

        const plan = await prisma.workoutPlan.findFirst({
            where: {
                id: Number(planId),
                trainerId
            }
        });

        if (!plan) {
            res.status(404).json({ error: 'Plan not found or unauthorized' });
            return;
        }

        await prisma.$transaction([
            prisma.exercise.deleteMany({
                where: { workoutPlanId: Number(planId) }
            }),
            prisma.workoutPlan.delete({
                where: { id: Number(planId) }
            })
        ]);

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting workout plan:', error);
        res.status(500).json({ error: 'Failed to delete workout plan' });
    }
};
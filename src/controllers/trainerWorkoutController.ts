import { RequestHandler } from 'express';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

interface JwtUser {
    id: number;
    email: string;
    role: string;
}

interface Exercise {
    name: string;
    sets: number;
    reps: number;
    notes?: string;
}

export const getTrainerClients: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;

        const clients = await prisma.user.findMany({
            where: {
                bookedPersonalTrainings: {
                    some: {
                        trainerId: trainer.id,
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
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
};

export const getClientWorkoutPlans: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { clientId } = req.params;
        const trainer = req.user as JwtUser;

        // Sprawdź czy klient ma treningi u tego trenera
        const hasTrainings = await prisma.personalTraining.findFirst({
            where: {
                trainerId: trainer.id,
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
                trainerId: trainer.id
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
        res.status(500).json({ error: 'Failed to fetch workout plans' });
    }
};

export const updateClientWorkoutPlan: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { planId } = req.params;
        const trainer = req.user as JwtUser;
        const { name, description, exercises } = req.body;

        // Sprawdź czy plan należy do trenera
        const existingPlan = await prisma.workoutPlan.findFirst({
            where: {
                id: Number(planId),
                trainerId: trainer.id
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

        res.json(updatedPlan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update workout plan' });
    }
};
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

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

export const createWorkoutPlan: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;
        const { name, description, exercises } = req.body;

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name,
                description,
                userId: user.id,
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
        res.status(500).json({ error: 'Failed to create workout plan' });
    }
};

export const createClientWorkoutPlan: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;
        const { clientId, name, description, exercises } = req.body;

        if (trainer.role !== 'TRAINER') {
            res.status(403).json({ error: 'Only trainers can create client workout plans' });
            return;
        }

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name,
                description,
                userId: clientId,
                trainerId: trainer.id,
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
        res.status(500).json({ error: 'Failed to create client workout plan' });
    }
};

export const getUserWorkoutPlans: RequestHandler = async (req, res): Promise<void> => {
    try {
        const user = req.user as JwtUser;

        const workoutPlans = await prisma.workoutPlan.findMany({
            where: {
                userId: user.id
            },
            include: {
                exercises: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                trainer: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        res.json(workoutPlans);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workout plans' });
    }
};

export const updateWorkoutPlan: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const user = req.user as JwtUser;
        const { name, description, exercises } = req.body;

        const workoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: Number(id) },
            include: { exercises: true }
        });

        if (!workoutPlan) {
            res.status(404).json({ error: 'Workout plan not found' });
            return;
        }

        if (workoutPlan.userId !== user.id && workoutPlan.trainerId !== user.id) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        await prisma.$transaction([
            prisma.exercise.deleteMany({
                where: { workoutPlanId: Number(id) }
            }),
            prisma.workoutPlan.update({
                where: { id: Number(id) },
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
            where: { id: Number(id) },
            include: { exercises: true }
        });

        res.json(updatedPlan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update workout plan' });
    }
};
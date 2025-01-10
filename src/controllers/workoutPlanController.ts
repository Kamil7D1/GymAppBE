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
    id: number;
    baseExerciseId: number;
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    notes?: string;
    baseExercise?: {
        id: number;
        name: string;
        category: string;
        description?: string;
    };
}

export const createWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { name, description, exercises } = req.body;

        if (!exercises?.every((ex: Exercise) => ex.baseExerciseId && ex.sets && ex.reps && typeof ex.baseExerciseId === 'number')) {
            res.status(400).json({ error: "Każde ćwiczenie musi mieć baseExerciseId, sets i reps" });
            return;
        }

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name,
                description: description || "",
                userId,
                exercises: {
                    create: exercises.map((exercise: Exercise, index: number) => ({
                        baseExerciseId: exercise.baseExerciseId,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        weight: exercise.weight,
                        notes: exercise.notes || "",
                        orderIndex: index
                    }))
                }
            },
            include: {
                exercises: {
                    include: {
                        baseExercise: true // Dołącz informacje o ćwiczeniu bazowym
                    }
                }
            }
        });

        res.status(201).json(workoutPlan);
    } catch (error) {
        console.error('Error creating workout plan:', error);
        res.status(500).json({ error: 'Failed to create workout plan' });
    }
};

export const createClientWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        if (req.user.role !== 'TRAINER') {
            res.status(403).json({ error: 'Only trainers can create client workout plans' });
            return;
        }

        const { clientId, name, description, exercises } = req.body;

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name,
                description,
                userId: clientId,
                trainerId: trainerId,
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
        console.error('Error creating client workout plan:', error);
        res.status(500).json({ error: 'Failed to create client workout plan' });
    }
};

export const getUserWorkoutPlans: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const workoutPlans = await prisma.workoutPlan.findMany({
            where: {
                userId: userId
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
        console.error('Error fetching workout plans:', error);
        res.status(500).json({ error: 'Failed to fetch workout plans' });
    }
};

export const updateWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { id } = req.params;
        const { name, description, exercises } = req.body;

        const workoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: Number(id) },
            include: { exercises: true }
        });

        if (!workoutPlan) {
            res.status(404).json({ error: 'Workout plan not found' });
            return;
        }

        if (workoutPlan.userId !== userId && workoutPlan.trainerId !== userId) {
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
        console.error('Error updating workout plan:', error);
        res.status(500).json({ error: 'Failed to update workout plan' });
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

        if (req.user.role !== 'TRAINER') {
            res.status(403).json({ error: 'Only trainers can access client workout plans' });
            return;
        }

        const clientId = parseInt(req.params.clientId);
        if (isNaN(clientId)) {
            res.status(400).json({ error: "Invalid client ID" });
            return;
        }

        const clientExists = await prisma.personalTraining.findFirst({
            where: {
                trainerId: trainerId,
                clientId: clientId
            }
        });

        if (!clientExists) {
            res.status(404).json({ error: 'Client not found or not assigned to this trainer' });
            return;
        }

        const workoutPlans = await prisma.workoutPlan.findMany({
            where: {
                userId: clientId,
                trainerId: trainerId
            },
            include: {
                exercises: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(workoutPlans);
    } catch (error) {
        console.error('Error fetching client workout plans:', error);
        res.status(500).json({ error: 'Failed to fetch client workout plans' });
    }
};

export const deleteWorkoutPlan: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const planId = parseInt(req.params.id, 10);
        if (isNaN(planId)) {
            res.status(400).json({ error: "Invalid plan ID" });
            return;
        }

        // Sprawdź, czy plan istnieje i czy użytkownik ma prawo go usunąć
        const workoutPlan = await prisma.workoutPlan.findUnique({
            where: { id: planId }
        });

        if (!workoutPlan) {
            res.status(404).json({ error: 'Workout plan not found' });
            return;
        }

        // Sprawdź, czy użytkownik jest właścicielem planu lub jego trenerem
        if (workoutPlan.userId !== userId && workoutPlan.trainerId !== userId) {
            res.status(403).json({ error: 'Unauthorized to delete this workout plan' });
            return;
        }

        // Użyj transakcji do usunięcia ćwiczeń i planu
        await prisma.$transaction([
            // Najpierw usuń wszystkie ćwiczenia powiązane z planem
            prisma.exercise.deleteMany({
                where: {
                    workoutPlanId: planId
                }
            }),
            // Następnie usuń sam plan
            prisma.workoutPlan.delete({
                where: {
                    id: planId
                }
            })
        ]);

        res.status(200).json({ message: 'Workout plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting workout plan:', error);
        res.status(500).json({ error: 'Failed to delete workout plan' });
    }
}
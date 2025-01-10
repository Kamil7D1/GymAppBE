import { Request, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

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
    orderIndex: number;
}

interface CreateTemplateRequest {
    name: string;
    description?: string;
    exercises: Exercise[];
}

interface UseTemplateRequest {
    templateId: number;
    clientId: number;
}

export const createTemplate: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { name, description, exercises } = req.body as CreateTemplateRequest;

        const template = await prisma.workoutTemplate.create({
            data: {
                name,
                description,
                trainerId: trainerId,
                exercises: {
                    create: exercises.map((exercise: Exercise, index: number) => ({
                        name: exercise.name,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        notes: exercise.notes,
                        orderIndex: index
                    }))
                }
            },
            include: {
                exercises: true
            }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
};

export const getTrainerTemplates: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const templates = await prisma.workoutTemplate.findMany({
            where: {
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

        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

export const useTemplateForClient: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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
            res.status(403).json({ error: 'Only trainers can use templates' });
            return;
        }

        const { templateId, clientId } = req.body as UseTemplateRequest;

        const template = await prisma.workoutTemplate.findUnique({
            where: {
                id: Number(templateId),
                trainerId: trainerId
            },
            include: {
                exercises: true
            }
        });

        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }

        // Tworzymy plan treningowy z ćwiczeniami
        const workoutPlan = await prisma.$transaction(async (tx) => {
            // Najpierw tworzymy plan treningowy
            const plan = await tx.workoutPlan.create({
                data: {
                    name: template.name,
                    description: template.description,
                    userId: Number(clientId),
                    trainerId: trainerId,
                }
            });

            // Dla każdego ćwiczenia z szablonu
            for (const exercise of template.exercises) {
                // Znajdujemy lub tworzymy BaseExercise
                let baseExercise = await tx.baseExercise.findUnique({
                    where: { name: exercise.name }
                });

                if (!baseExercise) {
                    baseExercise = await tx.baseExercise.create({
                        data: {
                            name: exercise.name,
                            category: 'Other', // Domyślna kategoria
                            description: exercise.notes || ''
                        }
                    });
                }

                // Tworzymy ćwiczenie w planie
                await tx.exercise.create({
                    data: {
                        workoutPlanId: plan.id,
                        baseExerciseId: baseExercise.id,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        notes: exercise.notes,
                        orderIndex: exercise.orderIndex
                    }
                });
            }

            // Zwracamy kompletny plan z ćwiczeniami
            return tx.workoutPlan.findUnique({
                where: { id: plan.id },
                include: { exercises: true }
            });
        });

        res.status(201).json(workoutPlan);
    } catch (error) {
        console.error('Error creating plan from template:', error);
        res.status(500).json({ error: 'Failed to create plan from template' });
    }
};
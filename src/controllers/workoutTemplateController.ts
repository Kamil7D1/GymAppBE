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

export const createTemplate: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;
        const { name, description, exercises } = req.body as CreateTemplateRequest;

        const template = await prisma.workoutTemplate.create({
            data: {
                name,
                description,
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

        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create template' });
    }
};

export const getTrainerTemplates: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;

        const templates = await prisma.workoutTemplate.findMany({
            where: {
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

        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

export const useTemplateForClient: RequestHandler = async (req, res): Promise<void> => {
    try {
        const trainer = req.user as JwtUser;
        const { templateId, clientId } = req.body as UseTemplateRequest;

        const template = await prisma.workoutTemplate.findUnique({
            where: {
                id: Number(templateId),
                trainerId: trainer.id
            },
            include: {
                exercises: true
            }
        });

        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }

        const workoutPlan = await prisma.workoutPlan.create({
            data: {
                name: template.name,
                description: template.description,
                userId: Number(clientId),
                trainerId: trainer.id,
                exercises: {
                    create: template.exercises.map(exercise => ({
                        name: exercise.name,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        notes: exercise.notes,
                        orderIndex: exercise.orderIndex
                    }))
                }
            },
            include: {
                exercises: true
            }
        });

        res.json(workoutPlan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create plan from template' });
    }
};
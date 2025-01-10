import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllExercises = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const exercises = await prisma.baseExercise.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json(exercises);
    } catch (error) {
        next(error);
    }
};

export const getExerciseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const exercise = await prisma.baseExercise.findUnique({
            where: { id: parseInt(id) }
        });

        if (!exercise) {
            res.status(404).json({ message: 'Exercise not found' });
            return;
        }

        res.json(exercise);
    } catch (error) {
        next(error);
    }
};

export const createExercise = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, category, description } = req.body;

        const exercise = await prisma.baseExercise.create({
            data: {
                name,
                category,
                description
            }
        });

        res.status(201).json(exercise);
    } catch (error) {
        next(error);
    }
};
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
        };
    }
}

interface Measurement {
    date: Date;
    weight?: number;
    measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
        biceps?: number;
        thighs?: number;
    };
    photos?: string[];
}

interface ExerciseProgress {
    exerciseId: number;
    date: Date;
    weight: number;
    reps: number;
    sets: number;
}

export const addMeasurement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = parseInt(req.user.id);
        const { date, weight, measurements } = req.body;

        console.log('Otrzymane dane:', { userId, date, weight, measurements });

        const newMeasurement = await prisma.progress.create({
            data: {
                userId,
                date: new Date(date),
                weight: weight ? parseFloat(weight) : null,
                measurements: measurements || null,
                photos: []
            }
        });

        console.log('Zapisane dane:', newMeasurement);
        res.status(201).json(newMeasurement);
    } catch (error) {
        console.error('Błąd podczas zapisywania:', error);
        next(error);
    }
};

export const getMeasurements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        const measurements = await prisma.progress.findMany({
            where: {
                userId: parseInt(userId),
                date: {
                    gte: startDate ? new Date(startDate as string) : undefined,
                    lte: endDate ? new Date(endDate as string) : undefined
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(measurements);
    } catch (error) {
        next(error);
    }
};

export const addExerciseProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = req.user.id;
        const progress: ExerciseProgress = req.body;

        const newProgress = await prisma.exerciseProgress.create({
            data: {
                userId: parseInt(userId),
                baseExerciseId: progress.exerciseId, // zmienione z exerciseId na baseExerciseId
                date: new Date(progress.date),
                weight: progress.weight,
                reps: progress.reps,
                sets: progress.sets
            },
            include: {
                baseExercise: true // dołącz informacje o ćwiczeniu
            }
        });

        res.status(201).json(newProgress);
    } catch (error) {
        next(error);
    }
};

export const getExerciseProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = req.user.id;
        const { exerciseId, startDate, endDate } = req.query;

        const progress = await prisma.exerciseProgress.findMany({
            where: {
                userId: parseInt(userId),
                baseExerciseId: exerciseId ? parseInt(exerciseId as string) : undefined,
                date: {
                    gte: startDate ? new Date(startDate as string) : undefined,
                    lte: endDate ? new Date(endDate as string) : undefined
                }
            },
            include: {
                baseExercise: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(progress);
    } catch (error) {
        next(error);
    }
};

export const getMeasurementStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = parseInt(req.user.id);

        // Pobierz ostatnie pomiary
        const latestMeasurement = await prisma.progress.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        // Pobierz przedostatnie pomiary do porównania
        const previousMeasurement = await prisma.progress.findFirst({
            where: {
                userId,
                date: {
                    lt: latestMeasurement?.date || new Date()
                }
            },
            orderBy: { date: 'desc' }
        });

        const stats = {
            current: {
                weight: latestMeasurement?.weight,
                measurements: latestMeasurement?.measurements
            },
            changes: {
                weight: latestMeasurement && previousMeasurement
                    ? Number((latestMeasurement.weight || 0) - (previousMeasurement.weight || 0))
                    : 0,
                measurements: latestMeasurement && previousMeasurement &&
                latestMeasurement.measurements && previousMeasurement.measurements
                    ? {
                        chest: calculateChange(
                            (latestMeasurement.measurements as any)?.chest,
                            (previousMeasurement.measurements as any)?.chest
                        ),
                        waist: calculateChange(
                            (latestMeasurement.measurements as any)?.waist,
                            (previousMeasurement.measurements as any)?.waist
                        ),
                        hips: calculateChange(
                            (latestMeasurement.measurements as any)?.hips,
                            (previousMeasurement.measurements as any)?.hips
                        ),
                        biceps: calculateChange(
                            (latestMeasurement.measurements as any)?.biceps,
                            (previousMeasurement.measurements as any)?.biceps
                        ),
                        thighs: calculateChange(
                            (latestMeasurement.measurements as any)?.thighs,
                            (previousMeasurement.measurements as any)?.thighs
                        )
                    }
                    : {}
            }
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
};

export const getExerciseStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = parseInt(req.user.id);
        const { exerciseId } = req.query;

        // Jeśli nie ma wybranego ćwiczenia, zwróć puste statystyki
        if (!exerciseId) {
            res.json({
                maxWeight: 0,
                lastWeight: 0,
                bestSeries: null,
                progressLastMonth: 0,
                totalSessions: 0
            });
            return;
        }

        // Pobierz postępy dla konkretnego ćwiczenia
        const exerciseProgress = await prisma.exerciseProgress.findMany({
            where: {
                userId,
                baseExerciseId: parseInt(exerciseId as string)
            },
            orderBy: {
                date: 'desc'
            }
        });

        if (exerciseProgress.length === 0) {
            res.json({
                maxWeight: 0,
                lastWeight: 0,
                bestSeries: null,
                progressLastMonth: 0,
                totalSessions: 0
            });
            return;
        }

        // Znajdź maksymalny ciężar kiedykolwiek użyty w tym ćwiczeniu
        const maxWeight = Math.max(...exerciseProgress.map(p => p.weight));

        // Pobierz najlepszą serię (najwięcej powtórzeń z najwyższym ciężarem)
        const bestSeries = exerciseProgress.reduce((best, current) => {
            if (!best || (current.weight > best.weight) ||
                (current.weight === best.weight && current.reps > best.reps)) {
                return current;
            }
            return best;
        });

        // Oblicz postęp z ostatniego miesiąca
        const today = new Date();
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));

        const lastMonthProgress = exerciseProgress.filter(p =>
            new Date(p.date) >= monthAgo
        );

        let progressLastMonth = 0;
        if (lastMonthProgress.length >= 2) {
            const oldestWeight = lastMonthProgress[lastMonthProgress.length - 1].weight;
            const newestWeight = lastMonthProgress[0].weight;
            progressLastMonth = calculatePercentageChange(oldestWeight, newestWeight);
        }

        // Oblicz liczbę unikalnych dni treningowych
        const uniqueSessions = new Set(
            exerciseProgress.map(p => p.date.toISOString().split('T')[0])
        ).size;

        // Ostatni użyty ciężar
        const lastWeight = exerciseProgress[0].weight;

        const stats = {
            maxWeight,
            lastWeight,
            bestSeries: {
                weight: bestSeries.weight,
                reps: bestSeries.reps,
                date: bestSeries.date
            },
            progressLastMonth,
            totalSessions: uniqueSessions
        };

        res.json(stats);
    } catch (error) {
        next(error);
    }
};

// Funkcje pomocnicze
function calculateChange(current: number | undefined, previous: number | undefined): number | undefined {
    if (current === undefined || previous === undefined) return undefined;
    return Number((current - previous).toFixed(1));
}

function calculatePercentageChange(start: number, end: number): number {
    if (start === 0) return 0;
    return Number(((end - start) / start * 100).toFixed(1));
}
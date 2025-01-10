import { Request, RequestHandler } from 'express';
import { PrismaClient, MembershipType } from '@prisma/client';

const prisma = new PrismaClient();

// Rozszerzamy interfejs Request z Express
interface RequestWithUser extends Request {
    user?: {
        id: string;
        email?: string;
        role?: string;
    };
}

const MEMBERSHIP_PRICES = {
    MONTHLY: 50,
    SEMI_ANNUAL: 45,
    ANNUAL: 40
};

const calculateEndDate = (type: MembershipType, startDate: Date): Date => {
    const endDate = new Date(startDate);
    switch (type) {
        case MembershipType.MONTHLY:
            endDate.setMonth(endDate.getMonth() + 1);
            break;
        case MembershipType.SEMI_ANNUAL:
            endDate.setMonth(endDate.getMonth() + 6);
            break;
        case MembershipType.ANNUAL:
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
    }
    return endDate;
};

export const purchaseMembership: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const { type } = req.body as { type: MembershipType };

        // Sprawdź czy użytkownik nie ma już aktywnego karnetu
        const existingMembership = await prisma.membership.findFirst({
            where: {
                userId: userId,
                status: 'ACTIVE',
                endDate: {
                    gt: new Date()
                }
            }
        });

        if (existingMembership) {
            res.status(400).json({ error: "You already have an active membership" });
            return;
        }

        const startDate = new Date();
        const endDate = calculateEndDate(type, startDate);
        const price = MEMBERSHIP_PRICES[type];

        const membership = await prisma.membership.create({
            data: {
                userId: userId,
                type,
                startDate,
                endDate,
                price,
                status: 'ACTIVE'
            }
        });

        res.status(201).json(membership);
    } catch (error) {
        console.error('Error purchasing membership:', error);
        res.status(500).json({ error: "Failed to purchase membership" });
    }
};

export const getCurrentMembership: RequestHandler = async (req: RequestWithUser, res): Promise<void> => {
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

        const membership = await prisma.membership.findFirst({
            where: {
                userId: userId,
                status: 'ACTIVE',
                endDate: {
                    gt: new Date()
                }
            }
        });

        res.json(membership);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch membership" });
    }
};
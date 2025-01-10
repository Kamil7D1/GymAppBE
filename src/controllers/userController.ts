import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface RequestWithUser extends Request {
    user?: {
        id: string;
        email?: string;
        role?: Role;
    };
}

interface UserResponse {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    memberSince: string;
    age: number | null;
    weight: number | null;
    height: number | null;
}

interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    age?: number | null;
    weight?: number | null;
    height?: number | null;
}

interface UpdatePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export const getCurrentUser = async (
    req: RequestWithUser,
    res: Response<UserResponse | { error: string }>,
    _next: NextFunction
): Promise<void> => {
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

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
                age: true,
                weight: true,
                height: true
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userResponse: UserResponse = {
            ...user,
            memberSince: user.createdAt.toISOString().split('T')[0],
            age: user.age,
            weight: user.weight,
            height: user.height
        };

        res.json(userResponse);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
};

export const updateUser = async (
    req: RequestWithUser,
    res: Response,
    _next: NextFunction
): Promise<void> => {
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

        const {
            firstName,
            lastName,
            email,
            age,
            weight,
            height
        }: UpdateUserRequest = req.body;

        // Find current user
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!currentUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== currentUser.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                res.status(400).json({ error: 'Email already taken' });
                return;
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email }),
                ...(age !== undefined && { age }),
                ...(weight !== undefined && { weight }),
                ...(height !== undefined && { height })
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
                age: true,
                weight: true,
                height: true
            }
        });

        // If email was changed, generate new token
        if (email && email !== currentUser.email) {
            const token = jwt.sign(
                {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            res.json({
                user: {
                    ...updatedUser,
                    memberSince: updatedUser.createdAt.toISOString().split('T')[0]
                },
                token
            });
            return;
        }

        res.json({
            ...updatedUser,
            memberSince: updatedUser.createdAt.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const updatePassword = async (
    req: RequestWithUser,
    res: Response,
    _next: NextFunction
): Promise<void> => {
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

        const { currentPassword, newPassword }: UpdatePasswordRequest = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: "Both current and new password are required" });
            return;
        }

        // Find current user
        const currentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!currentUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
};
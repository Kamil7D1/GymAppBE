import { RequestHandler  } from 'express';
import jwt from 'jsonwebtoken';

interface JwtUser {
    id: number;
    email: string;
    role: 'USER' | 'TRAINER' | 'ADMIN';
}

export const requireAuth: RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: "Access denied" });
        return;
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET!);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid token" });
    }
};

export const requireTrainerRole: RequestHandler = (req, res, next) => {
    const user = req.user as JwtUser;

    if (user.role !== 'TRAINER') {
        res.status(403).json({ error: "Trainer role required" });
        return;
    }

    next();
};
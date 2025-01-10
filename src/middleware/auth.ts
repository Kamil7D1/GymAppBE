import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface CustomJwtPayload extends JwtPayload {
    id: string;
    email: string;
    role: 'USER' | 'TRAINER' | 'ADMIN';
}

interface CustomRequest extends Request {
    user?: CustomJwtPayload;
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: "Access denied" });
        return;
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET!) as CustomJwtPayload;
        (req as CustomRequest).user = verified;
        next();
    } catch (error) {
        res.status(403).json({ error: "Invalid token" });
        return;
    }
};

export const requireTrainerRole: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as CustomRequest).user;

    if (!user || user.role !== 'TRAINER') {
        res.status(403).json({ error: "Trainer role required" });
        return;
    }

    next();
};
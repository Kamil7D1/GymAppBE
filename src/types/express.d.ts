import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload | string;
        }
        interface JwtUser {
            id: number;
            email: string;
            role: 'USER' | 'TRAINER' | 'ADMIN';
        }
    }
}
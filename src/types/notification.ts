import { NotificationType as PrismaNotificationType } from '@prisma/client';

export { PrismaNotificationType as NotificationType };

export interface INotification {
    id: number;
    userId: number;
    type: PrismaNotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    data?: Record<string, any>;
}

export interface NotificationContent {
    title: string;
    message: string;
}
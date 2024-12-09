import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('trainerPassword123', 10);

    const trainers = [
        {
            email: 'adam.kowalski@gym.com',
            password: hashedPassword,
            firstName: 'Adam',
            lastName: 'Kowalski',
            role: Role.TRAINER
        },
        {
            email: 'marek.nowak@gym.com',
            password: hashedPassword,
            firstName: 'Marek',
            lastName: 'Nowak',
            role: Role.TRAINER
        },
        {
            email: 'piotr.wisniewski@gym.com',
            password: hashedPassword,
            firstName: 'Piotr',
            lastName: 'Wiśniewski',
            role: Role.TRAINER
        }
    ];

    for (const trainer of trainers) {
        await prisma.user.create({
            data: trainer
        });
    }

    const recurringClasses = [
        {
            title: "Strength Training",
            dayOfWeek: 1, // Poniedziałek
            startTime: "07:00",
            endTime: "08:30",
            maxParticipants: 15,
            trainerId: 1 // Adam
        },
        {
            title: "CrossFit",
            dayOfWeek: 3, // Środa
            startTime: "12:00",
            endTime: "13:30",
            maxParticipants: 12,
            trainerId: 2 // Marek
        },
        {
            title: "HIIT",
            dayOfWeek: 5, // Piątek
            startTime: "20:00",
            endTime: "21:30",
            maxParticipants: 20,
            trainerId: 3 // Piotr
        }
    ];

    for (const session of recurringClasses) {
        await prisma.recurringSession.create({
            data: session
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
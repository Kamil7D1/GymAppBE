import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('trainerPassword123', 10);
    const userHashedPassword = await bcrypt.hash('userPassword123', 10);

    const exercises = [
        // Klatka piersiowa
        {
            name: 'Wyciskanie sztangi na ławce płaskiej',
            category: 'Klatka piersiowa',
            description: 'Klasyczne ćwiczenie na klatkę piersiową ze sztangą'
        },
        {
            name: 'Rozpiętki ze sztangielkami',
            category: 'Klatka piersiowa',
            description: 'Ćwiczenie izolowane na mięśnie klatki piersiowej'
        },
        {
            name: 'Wyciskanie sztangielek na ławce skośnej',
            category: 'Klatka piersiowa',
            description: 'Ćwiczenie angażujące górną część klatki piersiowej'
        },

        // Plecy
        {
            name: 'Martwy ciąg',
            category: 'Plecy',
            description: 'Złożone ćwiczenie angażujące całe plecy i nogi'
        },
        {
            name: 'Podciąganie na drążku',
            category: 'Plecy',
            description: 'Ćwiczenie z masą własnego ciała na plecy i biceps'
        },
        {
            name: 'Wiosłowanie sztangą',
            category: 'Plecy',
            description: 'Ćwiczenie na rozwój mięśni pleców'
        },

        // Nogi
        {
            name: 'Przysiad ze sztangą',
            category: 'Nogi',
            description: 'Podstawowe ćwiczenie na nogi'
        },
        {
            name: 'Wykroki',
            category: 'Nogi',
            description: 'Ćwiczenie na nogi i pośladki'
        },
        {
            name: 'Prostowanie nóg w siadzie',
            category: 'Nogi',
            description: 'Ćwiczenie izolowane na mięsień czworogłowy uda'
        },

        // Barki
        {
            name: 'Wyciskanie sztangi nad głowę',
            category: 'Barki',
            description: 'Podstawowe ćwiczenie na rozwój mięśni naramiennych'
        },
        {
            name: 'Unoszenie sztangielek bokiem',
            category: 'Barki',
            description: 'Ćwiczenie izolowane na środkową część mięśnia naramiennego'
        },

        // Biceps
        {
            name: 'Uginanie ramion ze sztangą',
            category: 'Biceps',
            description: 'Klasyczne ćwiczenie na biceps'
        },
        {
            name: 'Uginanie ramion ze sztangielkami naprzemiennie',
            category: 'Biceps',
            description: 'Ćwiczenie na biceps wykonywane naprzemiennie'
        },

        // Triceps
        {
            name: 'Wyciskanie francuskie',
            category: 'Triceps',
            description: 'Ćwiczenie izolowane na triceps'
        },
        {
            name: 'Prostowanie ramion na wyciągu',
            category: 'Triceps',
            description: 'Ćwiczenie na triceps z użyciem wyciągu'
        },

        // Brzuch
        {
            name: 'Spięcia brzucha',
            category: 'Brzuch',
            description: 'Podstawowe ćwiczenie na mięśnie brzucha'
        },
        {
            name: 'Plank',
            category: 'Brzuch',
            description: 'Ćwiczenie izometryczne na core'
        },
        {
            name: 'Unoszenie nóg w zwisie',
            category: 'Brzuch',
            description: 'Zaawansowane ćwiczenie na dolne partie brzucha'
        }
    ];

    console.log('Dodawanie ćwiczeń...');
    for (const exercise of exercises) {
        await prisma.baseExercise.create({
            data: exercise
        });
    }

    const users = [
        {
            email: 'jan.kowalski@example.com',
            password: userHashedPassword,
            firstName: 'Jan',
            lastName: 'Kowalski',
            role: Role.USER
        },
        {
            email: 'anna.nowak@example.com',
            password: userHashedPassword,
            firstName: 'Anna',
            lastName: 'Nowak',
            role: Role.USER
        },
        {
            email: 'tomasz.wozniak@example.com',
            password: userHashedPassword,
            firstName: 'Tomasz',
            lastName: 'Woźniak',
            role: Role.USER
        }
    ];

    // Dodajemy użytkowników
    for (const user of users) {
        await prisma.user.create({
            data: user
        });
    }

    // Istniejący kod dla trenerów
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
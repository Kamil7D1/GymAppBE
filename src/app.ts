import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Route imports
import { authRouter } from './routes/auth.routes';
import { trainingSessionRouter } from "./routes/trainingSession.routes";
import { trainerRouter } from "./routes/trainer.routes";
import { personalTrainingRouter } from "./routes/personalTraining.routes";
import { membershipRouter } from "./routes/membership.routes";
import { workoutPlanRouter } from "./routes/workoutPlan.routes";
import { templateRouter } from "./routes/workoutTemplate.routes";
import { trainerWorkoutRouter } from "./routes/trainerWorkout.routes";
import { userRouter } from "./routes/user.routes";
import {progressRouter} from "./routes/progress.routes";
import {exerciseRouter} from "./routes/exercise.routes";

async function initializeApp() {
    const app: Application = express();
    const httpServer = createServer(app);

    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
    });

    io.use(async (socket, next) => {
        try {
            console.log('Socket authentication attempt with data:', socket.handshake.auth);

            const token = socket.handshake.auth.token;
            const userId = socket.handshake.auth.userId;

            if (!token || !userId) {
                console.log('Socket authentication failed - missing credentials:', {
                    hasToken: !!token,
                    userId: userId
                });
                return next(new Error('Authentication error - missing credentials'));
            }

            // Zapisz userId w danych socketu
            socket.data.userId = userId;
            console.log('Socket authenticated successfully:', {
                socketId: socket.id,
                userId: userId
            });

            // Automatycznie dołącz do pokoju przy autoryzacji
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined room user_${userId}`);

            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });

    // W handlerze connection
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        console.log('Socket connected:', {
            socketId: socket.id,
            userId: userId,
            rooms: Array.from(socket.rooms)
        });

        socket.on('join', (joinUserId: string) => {
            const roomName = `user_${joinUserId}`;
            console.log('Join room request:', {
                socketId: socket.id,
                requestedRoom: roomName,
                currentRooms: Array.from(socket.rooms)
            });

            socket.join(roomName);
            console.log('After join:', {
                socketId: socket.id,
                currentRooms: Array.from(socket.rooms)
            });

            socket.emit('roomJoined', roomName);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', {
                socketId: socket.id,
                userId: userId,
                reason: reason
            });
        });
    });

    // Socket.IO connection handler
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        console.log('New socket connection:', {
            socketId: socket.id,
            userId: userId,
            rooms: Array.from(socket.rooms)
        });

        // When user joins a room
        socket.on('join', (joinUserId: string) => {
            const roomName = `user_${joinUserId}`;
            socket.join(roomName);
            console.log('User joined room:', {
                socketId: socket.id,
                userId: joinUserId,
                room: roomName,
                allRooms: Array.from(socket.rooms)
            });
            socket.emit('roomJoined', roomName);
        });
    });

    app.use(cors());
    app.use(express.json());

    // Routes
    app.use('/api/auth', authRouter);
    app.use('/api/users', userRouter);
    app.use('/api/training-sessions', trainingSessionRouter);
    app.use('/api/trainer', trainerRouter);
    app.use('/api/personal-training', personalTrainingRouter);
    app.use('/api/workout-plans', workoutPlanRouter);
    app.use('/api/workout-templates', templateRouter);
    app.use('/api/trainer-workouts', trainerWorkoutRouter);
    app.use('/api/memberships', membershipRouter);
    app.use('/api/progress', progressRouter);
    app.use('/api/exercises', exerciseRouter);

    // Debug logging for socket rooms
    io.of('/').adapter.on('join-room', (room, id) => {
        console.log(`Socket ${id} joined room ${room}`);
    });

    io.of('/').adapter.on('leave-room', (room, id) => {
        console.log(`Socket ${id} left room ${room}`);
    });

    return { app, httpServer, io };
}

// Start the server
if (require.main === module) {
    initializeApp()
        .then(({ httpServer }) => {
            const PORT = process.env.PORT || 3000;
            httpServer.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch(error => {
            console.error('Failed to initialize app:', error);
            process.exit(1);
        });
}

export { initializeApp };
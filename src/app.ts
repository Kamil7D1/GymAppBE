import express, { Application } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { trainingSessionRouter } from "./routes/trainingSession.routes";
import { trainerRouter } from "./routes/trainer.routes";
import { personalTrainingRouter } from "./routes/personalTraining.routes";
import {membershipRouter} from "./routes/membership.routes";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/training-sessions', trainingSessionRouter);
app.use('/api/trainer', trainerRouter);
app.use('/api/personal-training', personalTrainingRouter);
app.use('/api/memberships', membershipRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
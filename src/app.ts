import express, { Application } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { app };
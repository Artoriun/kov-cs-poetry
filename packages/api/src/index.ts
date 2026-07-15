import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { poemsRouter } from './routes/poems';

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

app.use(cors({ origin: allowedOrigins, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/poems', poemsRouter);

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

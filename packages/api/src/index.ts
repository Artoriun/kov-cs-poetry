import './loadEnv';
import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth';
import { contactRouter } from './routes/contact';
import { poemsRouter } from './routes/poems';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Render terminates TLS at its proxy, so without this req.ip is the proxy's address and
// the contact form's per-IP rate limit would apply to every visitor collectively. One hop
// only — trusting the whole chain would let a client spoof X-Forwarded-For.
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

app.use(cors({ origin: allowedOrigins, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// Liveness probe for Render's health check and for uptime monitoring. Deliberately does
// not touch Firebase or Cloudinary: a health check that depends on downstream services
// turns a blip in one of them into a restart loop.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);
app.use('/api/poems', poemsRouter);

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

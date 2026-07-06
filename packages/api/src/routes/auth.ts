import { Router } from 'express';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token });
});

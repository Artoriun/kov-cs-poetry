import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'no-auth-header' });
    return;
  }
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'bad-auth-format' });
    return;
  }
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'server-misconfigured' });
    return;
  }
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    res.status(401).json({ error: 'jwt-invalid', reason });
  }
}

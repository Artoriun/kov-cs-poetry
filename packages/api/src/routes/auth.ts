import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createRateLimiter } from '../rateLimit';

export const authRouter = Router();

// The whole portal is behind one password, and a successful guess yields a token good for
// a week — so unlimited guessing at full speed was the weakest point in the API. Ten
// attempts per quarter hour leaves room for genuine mistyping while making a dictionary
// run impractical. /api/contact has been limited since it was written; this was not.
const loginLimited = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

/**
 * Compares in constant time. `a !== b` returns as soon as two bytes differ, which leaks
 * how much of a guess was correct; hashing first keeps both operands a fixed 32 bytes so
 * the comparison cannot leak the password's length either.
 */
function secretsMatch(candidate: string, expected: string): boolean {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

authRouter.post('/login', (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.JWT_SECRET;
  if (!expected || !secret) {
    // Better than signing with `undefined`, which throws a stack trace at the caller and
    // reads like a bug in the request rather than missing configuration.
    console.error('[auth] ADMIN_PASSWORD or JWT_SECRET is not set; refusing to log in');
    res.status(503).json({ error: 'Authentication is not configured' });
    return;
  }

  const ip = req.ip ?? 'unknown';
  if (loginLimited(ip)) {
    res.status(429).json({ error: 'Too many attempts. Try again later.' });
    return;
  }

  const { password } = req.body as { password?: string };
  if (!password || !secretsMatch(password, expected)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ admin: true }, secret, { expiresIn: '7d' });
  res.json({ token });
});

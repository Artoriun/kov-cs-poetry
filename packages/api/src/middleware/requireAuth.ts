import type { NextFunction, Request, Response } from 'express';
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
    // Pinning the algorithm closes off algorithm-confusion attacks. jsonwebtoken 9 already
    // rejects `alg: none`, so this is defence in depth rather than a live hole — but it
    // costs nothing and does not rely on the library keeping that default.
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    // A valid signature only proves the token was minted with this secret, not that it was
    // minted for the admin portal. Checking the claim means a token issued for anything
    // else with the same secret cannot be replayed here.
    if (typeof payload !== 'object' || payload === null || payload.admin !== true) {
      res.status(401).json({ error: 'jwt-invalid' });
      return;
    }
    next();
  } catch (err) {
    // The reason stays in the server log rather than the response. Returning it told the
    // caller whether a token was expired, malformed or signed with the wrong key — a free
    // hint to anyone probing, and the log is where it is actually useful.
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[auth] token rejected: ${reason}`);
    res.status(401).json({ error: 'jwt-invalid' });
  }
}

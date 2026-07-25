import { Router } from 'express';
import nodemailer from 'nodemailer';

export const contactRouter = Router();

const TO = process.env.CONTACT_TO ?? 'pjcr.dekeijzer@gmail.com';

const LIMITS = { name: 100, email: 200, subject: 150, message: 5000 };
// Anything with a newline in it can inject extra mail headers, so these two fields — the
// only ones that reach a header — must be single-line.
const HEADER_SAFE = /^[^\r\n]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ponytail: in-memory, so the window resets on restart and is per-instance. Fine while
// the API is a single Render container; move to Redis or a provider-side limit if it ever
// scales out. It exists to blunt a script, not to be airtight.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude guard against unbounded growth
  return false;
}

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 is implicit TLS; 587 upgrades via STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

contactRouter.post('/', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  // Hidden field: a real person never fills it, most naive bots fill everything. Answer
  // 200 so the bot cannot tell it was rejected.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    res.json({ ok: true });
    return;
  }

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    res.status(400).json({ error: 'One or more fields are too long' });
    return;
  }
  if (!EMAIL.test(email) || !HEADER_SAFE.test(email) || !HEADER_SAFE.test(subject)) {
    res.status(400).json({ error: 'Invalid email address or subject' });
    return;
  }

  const ip = req.ip ?? 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many messages, please try again later' });
    return;
  }

  const mailer = transport();
  if (!mailer) {
    // Better a clear failure than pretending to send into a void.
    console.error('[contact] SMTP is not configured; message not sent');
    res.status(503).json({ error: 'Mail is not configured' });
    return;
  }

  try {
    await mailer.sendMail({
      to: TO,
      // From must be the authenticated mailbox or the provider will reject it; the
      // sender's address goes in replyTo so a reply reaches them directly.
      from: `"Kovács — kapcsolat" <${process.env.SMTP_USER}>`,
      replyTo: `"${name.replace(/"/g, "'")}" <${email}>`,
      subject: `[kovacs] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] send failed:', err);
    res.status(502).json({ error: 'Could not send the message' });
  }
});

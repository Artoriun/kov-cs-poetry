import { Router } from 'express';
import multer from 'multer';
import { db, storage } from '../firebaseAdmin';
import { POEMS } from '@gedichtenv2/shared';
import { requireAuth } from '../middleware/requireAuth';

export const poemsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

poemsRouter.get('/', async (_req, res) => {
  try {
    const snap = await db.collection('poems').get();
    const overrides: Record<string, { image?: string; overlay?: string }> = {};
    snap.forEach(doc => { overrides[doc.id] = doc.data() as { image?: string; overlay?: string }; });
    const merged = POEMS.map(p => overrides[p.id] ? { ...p, ...overrides[p.id] } : p);
    res.json(merged);
  } catch {
    res.json(POEMS);
  }
});

poemsRouter.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { overlay, image } = req.body as { overlay?: string; image?: string };
  const data: Record<string, string> = {};
  if (overlay !== undefined) data.overlay = overlay;
  if (image !== undefined) data.image = image;
  await db.collection('poems').doc(id).set(data, { merge: true });
  res.json({ ok: true });
});

poemsRouter.delete('/:id', requireAuth, async (req, res) => {
  await db.collection('poems').doc(req.params.id).delete();
  res.json({ ok: true });
});

poemsRouter.post('/:id/image', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }
  const { id } = req.params;
  const ext = req.file.originalname.split('.').pop() ?? 'jpg';
  const filePath = `poems/${id}/${Date.now()}.${ext}`;
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
  await file.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  res.json({ url });
});

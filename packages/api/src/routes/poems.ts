import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../firebaseAdmin';

import { POEMS } from '@gedichtenv2/shared';
import { requireAuth } from '../middleware/requireAuth';

export const poemsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

poemsRouter.get('/', async (_req, res) => {
  try {
    const [poemsSnap, orderDoc] = await Promise.all([
      db.collection('poems').get(),
      db.collection('config').doc('poemOrder').get(),
    ]);
    const overrides: Record<string, { title?: string; image?: string; overlay?: string }> = {};
    poemsSnap.forEach(doc => { overrides[doc.id] = doc.data() as typeof overrides[string]; });
    const merged = POEMS.map(p => overrides[p.id] ? { ...p, ...overrides[p.id] } : p);

    if (orderDoc.exists) {
      const ids = orderDoc.data()?.ids as string[];
      const map = new Map(merged.map(p => [p.id, p]));
      const sorted = ids.map(id => map.get(id)).filter(Boolean) as typeof merged;
      const inOrder = new Set(ids);
      res.json([...sorted, ...merged.filter(p => !inOrder.has(p.id))]);
    } else {
      res.json(merged);
    }
  } catch {
    res.json(POEMS);
  }
});

poemsRouter.put('/order', requireAuth, async (req, res) => {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids)) { res.status(400).json({ error: 'ids must be an array' }); return; }
  await db.collection('config').doc('poemOrder').set({ ids });
  res.json({ ok: true });
});

poemsRouter.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, overlay, image } = req.body as { title?: string; overlay?: string; image?: string };
  const data: Record<string, string> = {};
  if (title !== undefined) data.title = title;
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
  if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }
  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'poems', public_id: `${req.params.id}-${Date.now()}` },
        (error, result) => error ? reject(error) : resolve(result as { secure_url: string })
      ).end(req.file!.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Image upload failed:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

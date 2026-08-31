import { POEMS } from '@gedichtenv2/shared';
import { v2 as cloudinary } from 'cloudinary';
import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../asyncHandler';
import { db } from '../firebaseAdmin';
import { requireAuth } from '../middleware/requireAuth';

export const poemsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * The merged poem list: the bundled poems with their Firestore overrides applied, plus any
 * poem written in the portal, in the saved order.
 *
 * `includeHidden` is what separates the two callers. A hidden poem must not reach a visitor,
 * but it has to reach the admin — otherwise hiding one removes it from the portal as well and
 * there is nothing left that could put it back. Hidden poems keep their place in the order
 * rather than being pulled out of it, so restoring one returns it to where it was.
 */
async function loadPoems(includeHidden: boolean) {
  const [poemsSnap, orderDoc] = await Promise.all([
    db().collection('poems').get(),
    db().collection('config').doc('poemOrder').get(),
  ]);
  const overrides: Record<
    string,
    {
      title?: string;
      image?: string;
      overlay?: string;
      featured?: boolean;
      deleted?: boolean;
      customSlides?: string[];
      customSlidesEnabled?: boolean;
    }
  > = {};
  poemsSnap.forEach((doc) => {
    overrides[doc.id] = doc.data() as (typeof overrides)[string];
  });

  const hardcodedIds = new Set(POEMS.map((p) => p.id));
  const merged = POEMS.map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p)).filter(
    (p) => includeHidden || !p.deleted,
  );
  const custom = Object.entries(overrides)
    .filter(([id, d]) => !hardcodedIds.has(id) && (includeHidden || !d.deleted))
    .map(([id, d]) => ({
      id,
      title: d.title ?? 'New Poem',
      image:
        d.image ||
        'https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png',
      overlay: d.overlay,
      featured: d.featured,
      // Carried so the portal can mark the card. A bundled poem gets this from the spread
      // above; without it here, a poem written in the portal would come back looking visible
      // and its only copy would stay unreachable.
      deleted: d.deleted,
      customSlides: d.customSlides,
      customSlidesEnabled: d.customSlidesEnabled,
    }));
  const all = [...merged, ...custom];

  if (!orderDoc.exists) return all;
  const ids = orderDoc.data()?.ids as string[];
  const map = new Map(all.map((p) => [p.id, p]));
  const sorted = ids.map((id) => map.get(id)).filter(Boolean) as typeof all;
  const inOrder = new Set(ids);
  return [...sorted, ...all.filter((p) => !inOrder.has(p.id))];
}

poemsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      res.json(await loadPoems(false));
    } catch {
      res.json(POEMS);
    }
  }),
);

// Above the /:id routes. Nothing shadows it today because no GET /:id exists, but a literal
// path registered after a parameter sibling is a trap that has already cost time elsewhere.
poemsRouter.get(
  '/all',
  requireAuth,
  asyncHandler(async (_req, res) => {
    try {
      res.json(await loadPoems(true));
    } catch {
      res.json(POEMS);
    }
  }),
);

poemsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const id = `poem-custom-${Date.now()}`;
    const data = {
      title: 'New Poem',
      overlay:
        'Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit,\nsed do eiusmod tempor incididunt,\nut labore et dolore magna aliqua.',
      image:
        'https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png',
    };
    try {
      await db().collection('poems').doc(id).set(data);
    } catch (err) {
      console.error('[poems] could not create a poem:', err);
      res.status(500).json({ error: 'Could not create the poem' });
      return;
    }
    res.json({ id, ...data });
  }),
);

poemsRouter.put(
  '/order',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'ids must be an array' });
      return;
    }
    try {
      await db().collection('config').doc('poemOrder').set({ ids });
    } catch (err) {
      // Express 4 does not catch a rejected async handler, and Node ends the process on an
      // unhandled rejection — so without this a Firestore blip during a reorder answered
      // nothing at all and took the API with it, rather than failing the one request.
      console.error('[poems] could not save the order:', err);
      res.status(500).json({ error: 'Could not save the order' });
      return;
    }
    res.json({ ok: true });
  }),
);

poemsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, overlay, image, featured, deleted, customSlides, customSlidesEnabled } =
      req.body as {
        title?: string;
        overlay?: string;
        image?: string;
        featured?: boolean;
        deleted?: boolean;
        customSlides?: string[];
        customSlidesEnabled?: boolean;
      };
    const data: Record<string, string | boolean | string[]> = {};
    if (title !== undefined) data.title = title;
    if (overlay !== undefined) data.overlay = overlay;
    if (image !== undefined) data.image = image;
    if (featured !== undefined) data.featured = featured;
    if (deleted !== undefined) data.deleted = deleted;
    if (customSlides !== undefined) data.customSlides = customSlides;
    if (customSlidesEnabled !== undefined) data.customSlidesEnabled = customSlidesEnabled;
    try {
      await db().collection('poems').doc(id).set(data, { merge: true });
    } catch (err) {
      // Express 4 does not catch a rejected async handler, so without this the request is never
      // answered at all — the portal hangs on every save while Firestore is unwell, rather than
      // being told the save failed. This route runs on every save there is.
      console.error('[poems] could not save the poem:', err);
      res.status(500).json({ error: 'Could not save the poem' });
      return;
    }
    res.json({ ok: true });
  }),
);

/**
 * Removes the override document outright, which for a bundled poem means reverting it to the
 * text in packages/shared and for a poem written in the portal means losing it. The portal
 * deliberately does not call this — it hides poems instead, which is undoable. Kept as the
 * manual escape hatch.
 */
poemsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      await db().collection('poems').doc(req.params.id).delete();
    } catch (err) {
      console.error('[poems] could not delete the poem:', err);
      res.status(500).json({ error: 'Could not delete the poem' });
      return;
    }
    res.json({ ok: true });
  }),
);

poemsRouter.post(
  '/:id/image',
  requireAuth,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }
    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: 'poems', public_id: `${req.params.id}-${Date.now()}` },
            (error, result) => (error ? reject(error) : resolve(result as { secure_url: string })),
          )
          .end(req.file!.buffer);
      });
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Image upload failed' });
    }
  }),
);

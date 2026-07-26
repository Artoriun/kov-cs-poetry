/**
 * Inject Cloudinary format/quality/resize transforms into a poem image URL.
 *
 * `f_auto` picks WebP/AVIF per browser and `q_auto` picks a quality level from the image
 * content, which together do most of the work: the untransformed originals are 0.5-1.2MB
 * PNGs. Non-Cloudinary URLs (blob: previews from the admin file picker, the placeholder)
 * are returned untouched.
 *
 * Lives here rather than beside one caller because it was previously module-local to
 * Poems.tsx, so PoemCarousel silently served the full-size originals on the home page.
 */
export function optimizeUrl(url: string, w = 400): string {
  if (!url.includes('/image/upload/')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${w}/`);
}

/** Width for full-bleed images (home carousel, poem detail) as opposed to grid cards. */
export const FULL_BLEED_W = 1600;

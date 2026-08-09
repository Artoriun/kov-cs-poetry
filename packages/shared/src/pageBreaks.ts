/**
 * Author-placed page breaks inside a poem's overlay text.
 *
 * The reader already knew how to honour breaks the author intended — see `sourceSlides` in
 * PoemReader, which walks each section and subdivides only the ones too tall for the current
 * viewport. Until now the only way to author them was the Custom Slides editor, a stack of
 * numbered textareas kept in sync by hand. This lets the same thing be typed inline.
 *
 * The marker is the two literal characters `\` and `n`, chosen because that is what the site
 * owner asked to type. No poem in the collection contains that sequence, so nothing splits
 * retroactively.
 *
 * Lives in shared rather than the web package because the prerenderer and describePoem both
 * need to strip it, and neither can import from packages/web/src.
 */

export const PAGE_BREAK = '\\n';

/**
 * The overlay split into the pages the author asked for; a poem without markers yields a
 * single page, exactly as before.
 *
 * Blank lines at a seam are dropped, so the marker works both on a line of its own and tacked
 * onto the end of a line — the difference between the two is invisible to whoever is typing,
 * and it should stay that way. Empty sections (a leading, trailing or doubled marker) are
 * discarded rather than becoming blank pages.
 */
export function splitPages(overlay: string): string[] {
  const parts = overlay
    .split(PAGE_BREAK)
    .map((part) =>
      part
        .replace(/^[ \t]*\n+/, '')
        .replace(/\n+[ \t]*$/, '')
        .trim(),
    )
    .filter((part) => part !== '');
  // An overlay of nothing but markers still has to render as something.
  return parts.length > 0 ? parts : [''];
}

/**
 * The overlay as a reader should see it, with the markers removed.
 *
 * Needed everywhere the full text is shown without paging it — the grid cards, the carousel,
 * the meta description, the JSON-LD. Missing one of those is how the marker leaks out as
 * literal text on the live site.
 */
export function stripPageBreaks(overlay: string): string {
  return splitPages(overlay).join('\n');
}

/** Whether the author has placed any break at all. */
export function hasPageBreak(overlay: string): boolean {
  return overlay.includes(PAGE_BREAK);
}

import { hasPageBreak, hasPageBreakFragment, splitPages } from './pageBreaks';

/** Just the parts of the admin's edit state this decision depends on. */
export interface OverlayEditState {
  overlay: string;
  customSlidesOpen: boolean;
}

export interface OverlayEditPatch {
  overlay: string;
  customSlides?: string[] | null;
  customSlidesOpen?: boolean;
  customSlidesEnabled?: boolean;
}

/**
 * The edit to apply when the poem text changes.
 *
 * Custom Slides and the page-break marks are two views of one thing, so this keeps them in
 * step:
 *
 * - typing the first mark into a poem that has none opens the slides on it, so the split
 *   shows up the moment it is asked for;
 * - once open, the slides mirror every later edit;
 * - deleting the last mark closes them again, since there is nothing left for them to show;
 * - a poem that has never carried a mark is left alone entirely, because splitPages would
 *   return it as a single page and collapse slides that were authored by hand.
 *
 * Opening and closing both key off a *transition*, never off the current text alone. Opening
 * whenever a mark is merely present would make Custom Slides impossible to close — the next
 * keystroke would reopen it for as long as one mark remained. Closing whenever no mark is
 * present would tear down the slides of every poem that never had one.
 *
 * The two transitions use different tests on purpose. Opening waits for a whole `\n`, since
 * half a mark breaks nothing. Closing waits for the fragment to go too: deleting `\n` takes
 * two keystrokes, and closing on the first would pull the editor out from under an author who
 * is still mid-deletion.
 *
 * Lives beside the mark parser rather than in Admin.tsx: it is the rule connecting marks
 * to slides, and keeping it out of the component is what makes it testable without React.
 */
export function overlayEdit(edit: OverlayEditState, overlay: string): OverlayEditPatch {
  if (edit.customSlidesOpen) {
    if (hasPageBreak(overlay)) return { overlay, customSlides: splitPages(overlay) };
    // Nothing of the mark is left — not even the backslash — and the slides were only ever a
    // view of it. Cleared as well as closed, so a stale split cannot be saved back.
    if (hasPageBreakFragment(edit.overlay) && !hasPageBreakFragment(overlay)) {
      return { overlay, customSlidesOpen: false, customSlidesEnabled: false, customSlides: null };
    }
    return { overlay };
  }
  if (hasPageBreak(overlay) && !hasPageBreak(edit.overlay)) {
    return {
      overlay,
      customSlidesOpen: true,
      customSlidesEnabled: true,
      customSlides: splitPages(overlay),
    };
  }
  return { overlay };
}

import { hasPageBreak, splitPages } from './pageBreaks';

/** Just the parts of the admin's edit state this decision depends on. */
export interface OverlayEditState {
  overlay: string;
  customSlidesOpen: boolean;
}

export interface OverlayEditPatch {
  overlay: string;
  customSlides?: string[];
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
 * - a poem with no marks is left alone entirely, because splitPages would return it as a
 *   single page and collapse slides that were authored by hand.
 *
 * The first rule deliberately fires only on the transition from unmarked to marked. Opening
 * whenever a mark is merely *present* would make Custom Slides impossible to close — the next
 * keystroke would reopen it for as long as one mark remained anywhere in the poem.
 *
 * Lives beside the mark parser rather than in Admin.tsx: it is the rule connecting marks
 * to slides, and keeping it out of the component is what makes it testable without React.
 */
export function overlayEdit(edit: OverlayEditState, overlay: string): OverlayEditPatch {
  const marked = hasPageBreak(overlay);
  if (edit.customSlidesOpen) {
    return marked ? { overlay, customSlides: splitPages(overlay) } : { overlay };
  }
  if (marked && !hasPageBreak(edit.overlay)) {
    return {
      overlay,
      customSlidesOpen: true,
      customSlidesEnabled: true,
      customSlides: splitPages(overlay),
    };
  }
  return { overlay };
}

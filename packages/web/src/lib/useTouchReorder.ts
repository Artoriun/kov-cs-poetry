import { useCallback, useEffect, useRef } from 'react';

/**
 * Long-press drag-to-reorder for touch.
 *
 * HTML5 `draggable` does not fire on touch at all, so every drag surface in the admin portal
 * needs its own implementation or it simply does not work on a tablet. This was written inline
 * for the Order grid and then wanted twice more — by the List cards, which had no touch path,
 * and by the contents sidebar. The grid's own comment warned that its copy had to be "kept in
 * step" with the mouse handler; three copies is a promise nobody keeps, so it lives here once.
 *
 * The gesture: hold for `holdMs` without moving more than `MOVE_CANCELS_PX`, and the item lifts.
 * A press that moves before then is a scroll and is released back to the browser untouched —
 * without that, a list of draggable rows cannot be scrolled with a finger.
 */

/** Movement during the hold that means "this is a scroll, not a drag". */
const MOVE_CANCELS_PX = 10;

export interface TouchReorderOptions {
  /**
   * Data attribute carrying each item's index, e.g. `'data-ti'`. Hit-testing reads this from
   * whatever is under the finger, so the value must be the index within the same array the
   * `onReorder` indices refer to.
   */
  indexAttr: string;
  /** Fires once the drag settles on a different index. */
  onReorder: (from: number, to: number) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  /** How long the finger must rest before the item lifts. */
  holdMs?: number;
  /** Extra CSS for the floating clone, appended after the positioning rules. */
  ghostStyle?: string;
}

export function useTouchReorder({
  indexAttr,
  onReorder,
  onDragStart,
  onDragOver,
  onDragEnd,
  holdMs = 300,
  ghostStyle = 'opacity:0.9;transform:scale(1.05);border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,0.35);',
}: TouchReorderOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghost = useRef<HTMLElement | null>(null);
  const active = useRef(false);
  /** True from lift until the next touchstart, so the click that follows a drag is ignorable. */
  const didDrag = useRef(false);

  // The ghost lives in document.body, so an unmount mid-drag would strand it on the page.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      ghost.current?.remove();
      timer.current = null;
      ghost.current = null;
      active.current = false;
    },
    [],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      // A previous gesture that ended somewhere unusual — a cancelled touch, a re-render
      // mid-drag — can leave these set. Clearing here rather than trusting the last handler
      // means one stuck drag cannot poison every gesture after it.
      didDrag.current = false;
      if (ghost.current) {
        ghost.current.remove();
        ghost.current = null;
      }
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      active.current = false;

      const el = e.currentTarget as HTMLElement;
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const rect = el.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      let target = index;

      const handleMove = (me: TouchEvent) => {
        const mt = me.touches[0];
        if (!active.current) {
          if (
            Math.abs(mt.clientX - startX) > MOVE_CANCELS_PX ||
            Math.abs(mt.clientY - startY) > MOVE_CANCELS_PX
          ) {
            // Scrolling. Stand down and leave the gesture to the browser.
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
            detach();
          }
          return;
        }
        // Only once the item has lifted: before that, preventing default would kill scrolling.
        me.preventDefault();
        const g = ghost.current;
        if (!g) return;
        // The clone sits under the finger, so it would hit-test as itself. Hide it for the
        // one call rather than tracking positions by hand.
        g.style.visibility = 'hidden';
        const under = document
          .elementFromPoint(mt.clientX, mt.clientY)
          ?.closest<HTMLElement>(`[${indexAttr}]`);
        g.style.visibility = '';
        g.style.left = `${mt.clientX - offsetX}px`;
        g.style.top = `${mt.clientY - offsetY}px`;
        if (under) {
          const idx = Number.parseInt(under.getAttribute(indexAttr) ?? '', 10);
          if (!Number.isNaN(idx)) {
            target = idx;
            onDragOver?.(idx);
          }
        }
      };

      const handleEnd = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        ghost.current?.remove();
        ghost.current = null;
        detach();
        active.current = false;
        onDragEnd?.();
        if (index !== target) onReorder(index, target);
      };

      function detach() {
        el.removeEventListener('touchmove', handleMove);
        el.removeEventListener('touchend', handleEnd);
        el.removeEventListener('touchcancel', handleEnd);
      }

      // passive: false, or preventDefault above is ignored and the page scrolls under the drag.
      el.addEventListener('touchmove', handleMove, { passive: false });
      el.addEventListener('touchend', handleEnd);
      el.addEventListener('touchcancel', handleEnd);

      timer.current = setTimeout(() => {
        // A re-render between touchstart and the timer can detach this element; cloning a
        // node that is no longer in the document leaves a ghost nothing will ever remove.
        if (!el.isConnected) return;
        active.current = true;
        didDrag.current = true;
        onDragStart?.(index);
        const r = el.getBoundingClientRect();
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:${r.width}px;left:${r.left}px;top:${r.top}px;${ghostStyle}`;
        document.body.appendChild(clone);
        ghost.current = clone;
      }, holdMs);
    },
    [indexAttr, onReorder, onDragStart, onDragOver, onDragEnd, holdMs, ghostStyle],
  );

  return { onTouchStart, didDrag };
}

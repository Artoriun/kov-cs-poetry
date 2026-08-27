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

/**
 * How close to the top or bottom edge the finger has to get before the page scrolls under it.
 *
 * Without this a drag can only reach what is already on screen, which sounds academic and is
 * not: an admin card on a phone is 653px tall in a 915px viewport, so the next card begins
 * 19px from the bottom edge and everything past it is unreachable. Dragging simply did
 * nothing, which is exactly how it was reported.
 */
const EDGE_PX = 90;
/** Per frame. Fast enough to cross a tall card without feeling like it has run away. */
const SCROLL_STEP_PX = 12;

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
  const edgeFrame = useRef(0);
  /** True from lift until the next touchstart, so the click that follows a drag is ignorable. */
  const didDrag = useRef(false);

  // The ghost lives in document.body, so an unmount mid-drag would strand it on the page.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(edgeFrame.current);
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

      let lastX = startX;
      let lastY = startY;

      // Reads what is under the finger and records it as the drop target. Split out because
      // the edge scroller has to redo it every frame: the page moves under a stationary
      // finger, so the element beneath it changes without a touchmove ever firing.
      const hitTest = () => {
        const g = ghost.current;
        if (!g) return;
        // The clone sits under the finger, so it would hit-test as itself.
        g.style.visibility = 'hidden';
        const under = document
          .elementFromPoint(lastX, lastY)
          ?.closest<HTMLElement>(`[${indexAttr}]`);
        g.style.visibility = '';
        if (!under) return;
        const idx = Number.parseInt(under.getAttribute(indexAttr) ?? '', 10);
        if (!Number.isNaN(idx)) {
          target = idx;
          onDragOver?.(idx);
        }
      };

      // The page is not always the thing that has to move. In landscape the sidebar is a
      // 396px sticky column with its own overflow — five of thirty-four entries visible — so
      // scrolling the window leaves it exactly where it was and everything past the fifth
      // entry stays unreachable. Whatever is scrollable under the finger is what should move.
      const scrollableUnder = (x: number, y: number): HTMLElement | null => {
        const g = ghost.current;
        if (g) g.style.visibility = 'hidden';
        let el = document.elementFromPoint(x, y) as HTMLElement | null;
        if (g) g.style.visibility = '';
        while (el && el !== document.body && el !== document.documentElement) {
          // Skip form controls. A poem's textarea scrolls, sits directly under the finger for
          // most of a card, and scrolling its text while dragging the card is never what was
          // meant — the page should move instead.
          const tag = el.tagName;
          if (tag !== 'TEXTAREA' && tag !== 'INPUT' && tag !== 'SELECT') {
            const oy = getComputedStyle(el).overflowY;
            if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
          }
          el = el.parentElement;
        }
        return null; // nothing nested: the window scrolls
      };

      // Edges measured against whatever is scrolling, clamped to the part of it you can
      // actually see. A viewport-relative margin inside a 396px column would call almost all
      // of it an edge — and in landscape the sidebar's own rect runs from 195 to 591 in a
      // 412px viewport, so its bottom edge is 179px below the screen and no finger can ever
      // get near it. Measured against the visible band instead, the edge is where it looks.
      const edgeBand = (box: HTMLElement | null) => {
        const r = box?.getBoundingClientRect();
        const top = Math.max(r ? r.top : 0, 0);
        const bottom = Math.min(r ? r.bottom : window.innerHeight, window.innerHeight);
        return { top, bottom, edge: Math.min(EDGE_PX, Math.max(bottom - top, 0) / 4) };
      };

      const nearEdge = (x: number, y: number) => {
        const { top, bottom, edge } = edgeBand(scrollableUnder(x, y));
        return y - top < edge || bottom - y < edge;
      };

      const stopEdgeScroll = () => {
        cancelAnimationFrame(edgeFrame.current);
        edgeFrame.current = 0;
      };

      const edgeScroll = () => {
        if (!active.current) return stopEdgeScroll();
        const box = scrollableUnder(lastX, lastY);
        const { top, bottom, edge } = edgeBand(box);
        const dy =
          lastY - top < edge ? -SCROLL_STEP_PX : bottom - lastY < edge ? SCROLL_STEP_PX : 0;
        if (!dy) return stopEdgeScroll();

        const before = box ? box.scrollTop : window.scrollY;
        if (box) {
          box.scrollTop = before + dy;
        } else {
          // 'instant' matters: the page sets scroll-behavior: smooth, so an ordinary scrollBy
          // animates and leaves window.scrollY unchanged for this frame. The end check below
          // read that as "cannot scroll" and killed the loop after a single step.
          window.scrollTo({ top: before + dy, behavior: 'instant' });
        }
        // Both paths are synchronous, so an unchanged position really does mean the end.
        if ((box ? box.scrollTop : window.scrollY) === before) return stopEdgeScroll();
        const g = ghost.current;
        // The ghost is position:fixed, so it stays under the finger while the page moves.
        if (g) g.style.top = `${lastY - offsetY}px`;
        hitTest();
        edgeFrame.current = requestAnimationFrame(edgeScroll);
      };

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
        lastX = mt.clientX;
        lastY = mt.clientY;
        const g = ghost.current;
        if (!g) return;
        g.style.left = `${lastX - offsetX}px`;
        g.style.top = `${lastY - offsetY}px`;
        hitTest();
        // Near an edge the page has to come to the finger. A card is taller than the space
        // left below it on a phone, so without this the next one is not reachable at all.
        if (!edgeFrame.current && nearEdge(lastX, lastY)) {
          edgeFrame.current = requestAnimationFrame(edgeScroll);
        }
      };

      const handleEnd = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        stopEdgeScroll();
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

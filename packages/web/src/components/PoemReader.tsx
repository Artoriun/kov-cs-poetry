import type { Poem } from '@gedichtenv2/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { FULL_BLEED_W, fullBleedSrcSet, optimizeUrl } from '../lib/images';
import { IS_PRERENDERED, IS_PRERENDERING } from '../lib/prerendered';

const DETAIL_IMG_DURATION = 600; // ms — image + title fade-in
const DETAIL_LINE_STAGGER = 120; // ms between overlay lines
const DETAIL_BTN_OFFSET = 400; // ms after last line starts before bottom button appears
const SLIDE_RESIZE = 450; // ms — must match the height transition on .poem-detail.custom-slides
const DETAIL_MS_PER_LINE = 1500; // ms of reading time per line before auto-advancing

// Direction-aware variants for the poem detail carousel; dir 1=forward/down, -1=backward/up
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: number) => ({ opacity: 0, y: dir > 0 ? -30 : 30 }),
};

/**
 * Full-screen poem reader: a vertical carousel of pages, split to fit the viewport.
 *
 * Mounted with `key={poem.id}`, so moving between poems remounts it and every piece of
 * per-poem state starts fresh. That replaces an explicit reset effect that had to clear
 * eight state variables and be re-triggered whenever the poems finished loading.
 *
 * `onBack` belongs to the caller because returning to the grid means restoring the grid's
 * page, which is the grid's business — the reader has no idea how the collection paginates.
 */
export default function PoemReader({ poem, onBack }: { poem: Poem; onBack: () => void }) {
  const t = useT();
  const navigate = useNavigate();

  const detailLines = useMemo(() => (poem.overlay ? poem.overlay.split('\n') : []), [poem.overlay]);
  // The author's intended breaks: custom slides if the poem defines them, otherwise the
  // whole poem as one block. Each is a hard break that pagination never merges across —
  // it only subdivides one further when it doesn't fit the current viewport.
  // Flattened to a primitive so useMemo gets a stable key. A NUL separator is used
  // because slide text legitimately contains both spaces and newlines.
  const customSlidesKey =
    poem.customSlidesEnabled && poem.customSlides?.length ? poem.customSlides.join('\u0000') : '';
  const sourceSlides: string[][] = useMemo(() => {
    if (customSlidesKey) return customSlidesKey.split('\u0000').map((s) => s.split('\n'));
    return poem.overlay ? [poem.overlay.split('\n')] : [];
  }, [customSlidesKey, poem.overlay]);
  const measureLines = sourceSlides.flat();
  const usesCustomSlides = customSlidesKey !== '';

  const [detailPages, setDetailPages] = useState<string[][] | null>(null);
  // Height each custom slide needs, so switching slides animates the poem (and the footer
  // below it) instead of snapping. Null for measured poems, whose pages are equal by
  // construction and never change height.
  const [slideHeights, setSlideHeights] = useState<number[] | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  // Bumped on orientation change so the slide remounts and replays its reveal animations;
  // without it the key stays 0 and React reuses the nodes, leaving the CSS animations done.
  const [layoutGen, setLayoutGen] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1 = next/down, -1 = prev/up
  const [upBtnVisible, setUpBtnVisible] = useState(false);
  const [downBtnVisible, setDownBtnVisible] = useState(true);
  const [backBtnVisible, setBackBtnVisible] = useState(false);
  const [seenSlides, setSeenSlides] = useState<Set<number>>(new Set<number>());
  // Start settled on a prerendered page — the image is already painted in the markup, so
  // beginning un-ready would render a different tree than the HTML holds and cost us
  // hydration. See lib/prerendered.ts.
  const [detailImgReady, setDetailImgReady] = useState(IS_PRERENDERED);
  const poemDetailRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    lastY: number;
    atTop: boolean;
    atBottom: boolean;
  } | null>(null);

  // Preload the background; the "Loading…" prompt stays until it's cached, then the image +
  // text reveal together. Driven by a dedicated Image() (not the rendered <img>'s ref) so
  // readiness never flips true before the pixels are actually available.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setDetailImgReady(true);
    img.onerror = () => setDetailImgReady(true);
    img.src = optimizeUrl(poem.image, FULL_BLEED_W);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [poem.image]);

  // Measure overlay lines and split into pages that fit the available viewport height.
  // detailLines is read but deliberately not listed: the effect already guards on
  // detailPages !== null and is re-triggered by clearing that.
  // biome-ignore lint/correctness/useExhaustiveDependencies: omitted on purpose; see above
  useLayoutEffect(() => {
    if (detailPages !== null) return;
    if (sourceSlides.length === 0) return;
    // Skipped while the prerenderer is capturing. Pagination depends on the measured
    // viewport, so a page captured at 1280x900 splits differently than the same poem
    // hydrating on a phone, and the markup would not match the client's first render —
    // React would discard it. Leaving detailPages null captures `[detailLines]`, exactly
    // what the client renders before this effect runs, and it puts the whole poem in the
    // HTML rather than only the first slide, which is what a crawler wants anyway.
    if (IS_PRERENDERING) return;
    // Custom slides are authored as complete pages, so they are used verbatim — never
    // measured or subdivided. The slide grows to fit instead (see .poem-detail.custom-slides),
    // scrolling past the viewport when a slide is long.
    if (usesCustomSlides) {
      setDetailPages(sourceSlides);
      if (sourceSlides.length === 1) {
        setBackBtnVisible(true);
        setDownBtnVisible(false);
      } else {
        setDownBtnVisible(true);
      }
      // Height each slide will need. Applied explicitly so the change between slides is a
      // transition rather than a jump — an auto height has nothing to animate from, which
      // is why the footer snapped up when a shorter slide came in. CSS min-height still
      // floors it at one viewport, so short slides resolve to the same value and sit still.
      const el = poemDetailRef.current;
      const box = el?.querySelector<HTMLElement>('.detail-measure .detail-overlay');
      const wrap = el?.querySelector<HTMLElement>('.detail-image-container');
      if (box && wrap) {
        const wcs = getComputedStyle(wrap);
        const bcs = getComputedStyle(box);
        const padding =
          parseFloat(wcs.paddingTop) +
          parseFloat(wcs.paddingBottom) +
          parseFloat(bcs.paddingTop) +
          parseFloat(bcs.paddingBottom);
        const all = Array.from(box.querySelectorAll<HTMLElement>('span'));
        let at = 0;
        const heights = sourceSlides.map((slide) => {
          let h = 0;
          for (let k = 0; k < slide.length; k++) {
            h += all[at + k]?.getBoundingClientRect().height ?? 0;
          }
          at += slide.length;
          return Math.ceil(h + padding);
        });
        setSlideHeights(heights);
      }
      return;
    }
    const detail = poemDetailRef.current;
    // Always measure the hidden full-poem copy, never the visible slide — see .detail-measure
    const measure = detail?.querySelector<HTMLElement>('.detail-measure .detail-overlay');
    if (!detail || !measure) {
      setDetailPages([detailLines]);
      setBackBtnVisible(true);
      setDownBtnVisible(false);
      return;
    }
    // Padding comes from the real container; CSS media queries have already switched it to
    // the current orientation even while the outgoing slide is still on screen.
    const container = detail.querySelector<HTMLElement>('.detail-image-container');
    const cs = container ? getComputedStyle(container) : null;
    // Measure the rendered slide instead of deriving it from window.innerHeight. The CSS
    // sizes .poem-detail in svh/dvh, but window.innerHeight tracks the live visual
    // viewport — so arriving from an already-scrolled grid (URL bar collapsed)
    // over-estimated the height by the toolbar, doubled in landscape, and packed too many
    // lines per page, running the text under the down arrow.
    const slideH = detail.getBoundingClientRect().height;
    const os = getComputedStyle(measure);
    const overlayPadV = parseFloat(os.paddingTop) + parseFloat(os.paddingBottom);
    const containerPadV = cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 160;
    const available = slideH - containerPadV - overlayPadV;
    const spans = Array.from(measure.querySelectorAll<HTMLElement>('span'));
    // Walk the author's slides in order, breaking a slide across pages when it outgrows
    // the viewport. Pages never span two source slides, so hand-authored breaks survive
    // while an over-long one is subdivided instead of overflowing off-screen.
    const pages: string[][] = [];
    let idx = 0;
    for (const slide of sourceSlides) {
      const heights = slide.map((_, k) => spans[idx + k]?.getBoundingClientRect().height ?? 0);
      idx += slide.length;

      // First: the fewest pages this slide can occupy, by filling each to capacity.
      let needed = 1;
      let accH = 0;
      for (const h of heights) {
        if (accH + h > available && accH > 0) {
          needed += 1;
          accH = 0;
        }
        accH += h;
      }

      // Then spread the lines evenly over exactly that many pages. Filling each page to
      // capacity instead would strand the remainder on a near-empty page whenever a slide
      // only just overflows — an 11-line slide against a 10-line viewport came out as
      // 10 + 1 rather than 6 + 5. Page count is unchanged, so this costs no extra paging.
      let i = 0;
      for (let p = 0; i < slide.length; p++) {
        const target = Math.ceil((slide.length - i) / Math.max(1, needed - p));
        const current: string[] = [];
        let h = 0;
        while (i < slide.length) {
          if (current.length >= target) break;
          if (h + heights[i] > available && current.length > 0) break;
          current.push(slide[i]);
          h += heights[i];
          i += 1;
        }
        pages.push(current);
      }
    }
    if (pages.length === 0) pages.push([]);
    setDetailPages(pages);
    if (pages.length === 1) {
      setBackBtnVisible(true);
      setDownBtnVisible(false);
    } else {
      setDownBtnVisible(true);
    }
  }, [detailPages, sourceSlides, usesCustomSlides]);

  // Rotating changes the slide height (portrait is one viewport, landscape two) and the
  // container padding, but the effect above only runs once per poem — so the split made
  // for the old orientation overflowed. Clearing detailPages re-runs it.
  // Deliberately matchMedia and not a resize listener: Android fires resize whenever the
  // URL bar collapses during a scroll, which would re-paginate constantly mid-read.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const repaginate = () => {
      setDetailPages(null);
      setSlideHeights(null); // line heights change with the orientation
      setCurrentSlide(0); // page count changes, so the old index may not exist
      setLayoutGen((g) => g + 1); // remount the slide so the reveal replays from the top
      setSeenSlides(new Set<number>()); // empty => lines animate instead of showing instantly
      setUpBtnVisible(false);
      setDownBtnVisible(true);
      setBackBtnVisible(false);
      // Rotating can leave the reader part-way down a slide that no longer exists
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    mq.addEventListener('change', repaginate);
    return () => mq.removeEventListener('change', repaginate);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // React's synthetic onTouchMove is passive, so e.preventDefault() is ignored by the browser.
  // A native listener with { passive: false } is required to actually suppress pull-to-refresh
  // and prevent the address bar from showing/hiding (which causes the background image to resize).
  useEffect(() => {
    const el = poemDetailRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => el.removeEventListener('touchmove', preventScroll);
  }, []);

  // Auto-advance to the next page after enough reading time.
  // goToSlide is rebuilt each render, so listing it would restart the reading timer
  // continuously and the page would never advance.
  // biome-ignore lint/correctness/useExhaustiveDependencies: omitted on purpose; see above
  useEffect(() => {
    if (!detailPages) return;
    if (currentSlide === detailPages.length - 1) return;
    const lines = detailPages[currentSlide]?.length ?? 1;
    const timer = setTimeout(
      () => goToSlide(currentSlide + 1, 1),
      Math.max(lines, 1) * DETAIL_MS_PER_LINE,
    );
    return () => clearTimeout(timer);
  }, [currentSlide, detailPages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/poems');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Navigate to a page of the poem; dir 1 = forward/down, -1 = backward/up
  const goToSlide = (next: number, dir: number) => {
    const pages = detailPages ?? [detailLines];
    if (next < 0 || next >= pages.length) return;
    setSlideDir(dir);
    setUpBtnVisible(next !== 0);
    setDownBtnVisible(next !== pages.length - 1);
    setBackBtnVisible(next === pages.length - 1);
    // Mark the current slide as seen before leaving it
    setSeenSlides((prev) => {
      const s = new Set(prev);
      s.add(currentSlide);
      return s;
    });
    setCurrentSlide(next);
    // Land at the top of the incoming slide. Previously gated on a landscape-sized
    // viewport, so in portrait you kept whatever scroll offset you had — pressing up from
    // the last slide left you part-way down the one before it. Repeated once the height
    // transition finishes: going to a taller slide, the page is still short at this point
    // and the browser clamps the scroll a few pixels shy of the target.
    const el = poemDetailRef.current;
    if (el) {
      // Where the top of the slide actually is depends on the header. While it is sticky
      // it covers the first 72px of the page, so the slide reads as "at the top" at scroll
      // 0; scrolling to the slide's own offset would tuck its first lines behind it. In
      // landscape the header is relative and scrolls away, so there the offset is right.
      const header = document.querySelector<HTMLElement>('.site-header');
      const stickyHeader = header ? getComputedStyle(header).position === 'sticky' : true;
      const target = stickyHeader ? 0 : el.offsetTop;
      const toTop = () => window.scrollTo({ top: target, behavior: 'smooth' });
      toTop();
      window.setTimeout(toTop, SLIDE_RESIZE);
    }
  };

  const renderPages = detailPages ?? [detailLines];
  const isLast = currentSlide === renderPages.length - 1;
  const currentPageLines = renderPages[currentSlide] ?? [];
  const textDelay =
    currentPageLines.length > 0
      ? (currentPageLines.length - 1) * DETAIL_LINE_STAGGER + DETAIL_BTN_OFFSET
      : DETAIL_BTN_OFFSET;
  const btnDelay = seenSlides.has(currentSlide)
    ? 0
    : currentSlide === 0
      ? DETAIL_IMG_DURATION + textDelay
      : textDelay;

  const dragStart = (y: number) => {
    const landscape = window.innerHeight <= 500;
    const rect = landscape ? poemDetailRef.current?.getBoundingClientRect() : null;
    dragRef.current = {
      startY: y,
      lastY: y,
      atTop: !landscape || !rect || rect.top >= -1,
      atBottom: !landscape || !rect || rect.bottom <= window.innerHeight + 1,
    };
    poemDetailRef.current?.classList.add('dragging');
  };
  const isNavGesture = (deltaY: number) => {
    if (!dragRef.current) return false;
    const canGoNext = currentSlide < renderPages.length - 1;
    const canGoPrev = currentSlide > 0;
    return (
      (deltaY < 0 && dragRef.current.atBottom && canGoNext) ||
      (deltaY > 0 && dragRef.current.atTop && canGoPrev)
    );
  };
  const dragMove = (y: number) => {
    if (!dragRef.current) return;
    const totalDelta = y - dragRef.current.startY;
    const step = y - dragRef.current.lastY;
    dragRef.current.lastY = y;
    // Scroll the page if not a slide-navigation gesture
    if (!isNavGesture(totalDelta)) window.scrollBy({ top: -step, behavior: 'instant' });
  };
  const dragEnd = (y: number) => {
    if (!dragRef.current) return;
    const delta = y - dragRef.current.startY;
    const nav = isNavGesture(delta); // must be read before clearing dragRef
    dragRef.current = null;
    poemDetailRef.current?.classList.remove('dragging');
    if (!nav || Math.abs(delta) < 50) return;
    if (delta < 0) goToSlide(currentSlide + 1, 1);
    else goToSlide(currentSlide - 1, -1);
  };

  return (
    <div
      ref={poemDetailRef}
      className={`page poem-detail${detailImgReady ? ' image-ready' : ''}${usesCustomSlides ? ' custom-slides' : ''}`}
      // A floor, not a fixed height: the measured copy can under-estimate (the webfont
      // may still be loading when it is measured, so the real text wraps onto more
      // rows). With a fixed height the extra rows overflowed and ran under the nav
      // button; as a floor the box just grows. max() keeps the CSS one-viewport floor.
      style={
        slideHeights
          ? {
              minHeight: `max(${slideHeights[currentSlide]}px, calc(100svh - var(--header-height, 72px)))`,
            }
          : undefined
      }
      onMouseDown={(e) => dragStart(e.clientY)}
      onMouseMove={(e) => dragMove(e.clientY)}
      onMouseUp={(e) => dragEnd(e.clientY)}
      onMouseLeave={(e) => dragEnd(e.clientY)}
      onTouchStart={(e) => dragStart(e.touches[0].clientY)}
      onTouchMove={(e) => {
        e.preventDefault();
        dragMove(e.touches[0].clientY);
      }}
      onTouchEnd={(e) => dragEnd(e.changedTouches[0].clientY)}
    >
      <img
        src={optimizeUrl(poem.image, FULL_BLEED_W)}
        srcSet={fullBleedSrcSet(poem.image)}
        sizes="100vw"
        alt={poem.title}
        className="detail-fixed-bg detail-img-anim"
      />

      {/* Hidden copy of the whole poem that pagination measures. It lives outside
          AnimatePresence so it is always mounted: measuring the visible slide meant
          measuring whichever page happened to be on screen (and during a transition
          mode="wait" hasn't mounted the incoming one yet), so rotating from a later
          page silently dropped every line that wasn't in it. */}
      <div className="detail-measure" aria-hidden="true">
        <p className="detail-overlay">
          {measureLines.map((line, i) => (
            // Poem lines are positional and never reorder, and two of the poems repeat a
            // line, so keying by text would collide.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional list, duplicate lines exist
            <span key={i} className="detail-overlay-line-revealed">
              {line || ' '}
            </span>
          ))}
        </p>
      </div>

      {/* Cold-cache loading prompt; fades out as the image + text fade in */}
      <AnimatePresence>
        {!detailImgReady && (
          <motion.p
            key="detail-loading"
            className="loading-prompt detail-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {t.poems.loading}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={`detail-scroll-up-btn${upBtnVisible ? '' : ' is-hidden'}`}
        onClick={() => goToSlide(currentSlide - 1, -1)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 11V3M3 7l4-4 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Vertical carousel: AnimatePresence swaps pages with a direction-aware fade+translate */}
      <AnimatePresence initial={false} custom={slideDir} mode="wait">
        <motion.div
          key={`${layoutGen}-${currentSlide}`}
          className="detail-slide"
          custom={slideDir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          <div className={`detail-image-container${currentSlide === 0 ? ' has-title' : ''}`}>
            {currentSlide === 0 && (
              <h1
                className="detail-title detail-overlay-line"
                style={{ animationDelay: `${DETAIL_IMG_DURATION / 2}ms` }}
              >
                {poem.title}
              </h1>
            )}
            {currentPageLines.length > 0 && (
              <p className="detail-overlay">
                {currentPageLines.map((line, i) => (
                  <span
                    // Poem lines are positional and never reorder, and two of the poems repeat a
                    // line, so keying by text would collide.
                    // biome-ignore lint/suspicious/noArrayIndexKey: positional list, duplicate lines exist
                    key={i}
                    // Seen slides show immediately; new slides play the mask-wipe reveal
                    className={
                      seenSlides.has(currentSlide)
                        ? 'detail-overlay-line-revealed'
                        : 'detail-overlay-line'
                    }
                    style={
                      !seenSlides.has(currentSlide)
                        ? {
                            animationDelay:
                              currentSlide === 0
                                ? `${DETAIL_IMG_DURATION + i * DETAIL_LINE_STAGGER}ms`
                                : `${i * DETAIL_LINE_STAGGER}ms`,
                          }
                        : undefined
                    }
                  >
                    {line || ' '}
                  </span>
                ))}
              </p>
            )}
            {isLast && (
              <button
                type="button"
                className={`detail-back-btn${backBtnVisible ? '' : ' is-hidden'}`}
                style={{ animationDelay: `${btnDelay}ms` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
              >
                {t.poems.back}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        className={`detail-scroll-down-btn${isLast || !downBtnVisible ? ' is-hidden' : ''}`}
        onClick={() => goToSlide(currentSlide + 1, 1)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 3v8M3 7l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePoemsContext } from '../context/PoemsContext';
import { useT } from '../i18n';

const PER_PAGE = 9;
const DETAIL_IMG_DURATION = 600; // ms — image + title fade-in
const DETAIL_LINE_STAGGER = 120; // ms between overlay lines
const DETAIL_BTN_OFFSET = 400; // ms after last line starts before bottom button appears
const PAGE_FADE_OUT = 400; // ms — must match --page-fade-out-duration in CSS

const optimizeUrl = (url: string) =>
  url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');

// Card enter/exit variants for the poems grid; custom(i) provides per-card stagger index
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.2 } }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// Direction-aware variants for the poem detail carousel; dir 1=forward/down, -1=backward/up
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: number) => ({ opacity: 0, y: dir > 0 ? -30 : 30 }),
};

export default function Poems() {
  const t = useT();
  const { poems, loading } = usePoemsContext();
  const { id } = useParams<{ id: string }>();
  const savedState = !id ? sessionStorage.getItem('poems-grid-state') : null;
  const savedParsed = savedState ? JSON.parse(savedState) : null;
  const [page, setPage] = useState<number>(savedParsed?.page ?? 0);
  const navigate = useNavigate();
  const detailPoem = id ? (poems.find((p) => p.id === id) ?? null) : null;
  const detailLines = detailPoem?.overlay ? detailPoem.overlay.split('\n') : [];
  const [detailPages, setDetailPages] = useState<string[][] | null>(null);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const [activePoemId, setActivePoemId] = useState<string | null>(savedParsed?.activePoemId ?? id ?? null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1 = next/down, -1 = prev/up
  const [upBtnVisible, setUpBtnVisible] = useState(false);
  const [downBtnVisible, setDownBtnVisible] = useState(true);
  const [backBtnVisible, setBackBtnVisible] = useState(false);
  const [seenSlides, setSeenSlides] = useState<Set<number>>(new Set<number>());
  const poemDetailRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; lastY: number; atTop: boolean; atBottom: boolean } | null>(null);
  const tocListRef = useRef<HTMLUListElement>(null);
  const tocLineRef = useRef<HTMLDivElement>(null);
  const tocDirectionRef = useRef<'down' | 'up'>('down');
  const pulseNavRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Stores a highlight callback to fire after the incoming grid page finishes entering
  const pendingHighlightRef = useRef<(() => void) | null>(null);

  // Reset all detail state when navigating to a different poem
  useLayoutEffect(() => {
    setDetailPages(null);
    setCurrentSlide(0);
    setSeenSlides(new Set<number>());
    setUpBtnVisible(false);
    setDownBtnVisible(true);
    setBackBtnVisible(false);
  }, [id]);

  // Measure overlay lines and split into pages that fit the available viewport height
  useLayoutEffect(() => {
    if (!id || !detailPoem || detailPages !== null) return;
    if (detailPoem.customSlidesEnabled && detailPoem.customSlides && detailPoem.customSlides.length > 0) {
      const pages = detailPoem.customSlides.map(s => s.split('\n'));
      setDetailPages(pages);
      if (pages.length === 1) { setBackBtnVisible(true); setDownBtnVisible(false); }
      else { setDownBtnVisible(true); }
      return;
    }
    if (!detailPoem.overlay) return;
    const overlay = document.querySelector<HTMLElement>('.detail-overlay');
    if (!overlay) { setDetailPages([detailLines]); setBackBtnVisible(true); setDownBtnVisible(false); return; }
    const container = overlay.closest<HTMLElement>('.detail-image-container');
    const cs = container ? getComputedStyle(container) : null;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
    const landscape = window.innerHeight <= 500;
    const slideH = landscape ? 2 * (window.innerHeight - headerH) : window.innerHeight - headerH;
    const os = getComputedStyle(overlay);
    const overlayPadV = parseFloat(os.paddingTop) + parseFloat(os.paddingBottom);
    const containerPadV = cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 160;
    const available = slideH - containerPadV - overlayPadV;
    const spans = Array.from(overlay.querySelectorAll<HTMLElement>('.detail-overlay-line'));
    const pages: string[][] = [[]];
    let accH = 0;
    for (let i = 0; i < spans.length; i++) {
      const h = spans[i].getBoundingClientRect().height;
      if (accH + h > available && pages[pages.length - 1].length > 0) {
        pages.push([]);
        accH = 0;
      }
      pages[pages.length - 1].push(detailLines[i]);
      accH += h;
    }
    setDetailPages(pages);
    if (pages.length === 1) { setBackBtnVisible(true); setDownBtnVisible(false); }
    else { setDownBtnVisible(true); }
  }, [id, detailPages, detailPoem?.overlay, detailPoem?.customSlides]);

  useEffect(() => () => { pulseNavRef.current.forEach(clearTimeout); }, []);

  // Re-apply highlight-static on the active card when returning from detail view
  useEffect(() => {
    if (id || !activePoemId) return;
    const card = document.querySelector<HTMLElement>(`#${activePoemId} .poem-card`);
    if (!card || card.classList.contains('poem-highlight') || card.classList.contains('poem-highlight-static')) return;
    card.classList.add('poem-highlight-static');
    activeCardRef.current = card;
  }, [id, activePoemId]);

  // Keep the TOC indicator line in sync with the current page range
  useEffect(() => {
    const ul = tocListRef.current;
    const line = tocLineRef.current;
    if (!ul || !line) return;
    const nav = ul.parentElement as HTMLElement;

    const firstIndex = page * PER_PAGE;
    const lastIndex = Math.min((page + 1) * PER_PAGE - 1, poems.length - 1);
    const first = ul.children[firstIndex] as HTMLElement | undefined;
    const last = ul.children[lastIndex] as HTMLElement | undefined;
    if (!first || !last) return;

    const layoutTop = first.offsetTop;
    const height = last.offsetTop + last.offsetHeight - layoutTop;

    // Auto-scroll the nav so the current range is always in view
    nav.scrollTop = Math.max(0, layoutTop - 24);

    const setTop = () => { line.style.top = `${layoutTop - nav.scrollTop}px`; };

    setTop();
    line.style.height = `${height}px`;
    line.style.animation = 'none';
    void line.offsetHeight; // force reflow so restarting the same animation actually re-runs
    line.style.animation = tocDirectionRef.current === 'down'
      ? 'toc-line-grow-down 0.65s ease forwards'
      : 'toc-line-grow-up 0.65s ease forwards';

    nav.addEventListener('scroll', setTop);

    const ro = new ResizeObserver(() => {
      const f = ul.children[firstIndex] as HTMLElement | undefined;
      const l = ul.children[lastIndex] as HTMLElement | undefined;
      if (!f || !l) return;
      line.style.top = `${f.offsetTop - nav.scrollTop}px`;
      line.style.height = `${l.offsetTop + l.offsetHeight - f.offsetTop}px`;
    });
    ro.observe(ul);
    return () => { nav.removeEventListener('scroll', setTop); ro.disconnect(); };
  }, [page, id]);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    setCurrentSlide(0);
  }, [id]);

  // React's synthetic onTouchMove is passive, so e.preventDefault() is ignored by the browser.
  // A native listener with { passive: false } is required to actually suppress pull-to-refresh
  // and prevent the address bar from showing/hiding (which causes the background image to resize).
  // detailPoem is included in deps so this re-runs after poems load on a hard refresh —
  // without it, poemDetailRef.current is null on the first run (div not yet in the DOM).
  useEffect(() => {
    const el = poemDetailRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => { e.preventDefault(); };
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => el.removeEventListener('touchmove', preventScroll);
  }, [id, detailPoem]);

  // Auto-advance to the next poem page after enough reading time
  useEffect(() => {
    if (!id || !detailPages) return;
    if (currentSlide === detailPages.length - 1) return;
    const lines = detailPages[currentSlide]?.length ?? 1;
    const timer = setTimeout(() => goToSlide(currentSlide + 1, 1), Math.max(lines, 1) * 2500);
    return () => clearTimeout(timer);
  }, [id, currentSlide, detailPages]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/poems'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, navigate]);

  useEffect(() => {
    if (id) return;
    const onClick = (e: MouseEvent) => {
      if (activeCardRef.current && !(e.target as Element).closest('.poem-card, .poems-toc, .site-header')) {
        activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
        activeCardRef.current = null;
        setActivePoemId(null);
        sessionStorage.removeItem('poems-grid-state');
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [id]);

  // Navigate to a detail carousel page; dir 1 = forward/down, -1 = backward/up
  const goToSlide = (next: number, dir: number) => {
    const pages = detailPages ?? [detailLines];
    if (next < 0 || next >= pages.length) return;
    setSlideDir(dir);
    setUpBtnVisible(next !== 0);
    setDownBtnVisible(next !== pages.length - 1);
    setBackBtnVisible(next === pages.length - 1);
    // Mark the current slide as seen before leaving it
    setSeenSlides(prev => { const s = new Set(prev); s.add(currentSlide); return s; });
    setCurrentSlide(next);
    if (window.innerHeight <= 500 && poemDetailRef.current) {
      window.scrollTo({ top: poemDetailRef.current.offsetTop, behavior: 'smooth' });
    }
  };

  // Play the TOC line retract animation; called just before a page change
  const retractTocLine = () => {
    const line = tocLineRef.current;
    if (!line) return;
    line.style.animation = 'none';
    void line.offsetHeight;
    line.style.animation = tocDirectionRef.current === 'down'
      ? 'toc-line-retract-down 0.4s ease forwards'
      : 'toc-line-retract-up 0.4s ease forwards';
  };

  // ── Detail page ───────────────────────────────────────────────────────────────

  if (id) {
    if (!detailPoem) return loading ? null : <div className="page"><p>Poem not found.</p></div>;
    const renderPages = detailPages ?? [detailLines];
    const isLast = currentSlide === renderPages.length - 1;
    const currentPageLines = renderPages[currentSlide] ?? [];
    const textDelay = currentPageLines.length > 0
      ? (currentPageLines.length - 1) * DETAIL_LINE_STAGGER + DETAIL_BTN_OFFSET
      : DETAIL_BTN_OFFSET;
    const btnDelay = seenSlides.has(currentSlide) ? 0 : currentSlide === 0 ? DETAIL_IMG_DURATION + textDelay : textDelay;

    const dragStart = (y: number) => {
      const landscape = window.innerHeight <= 500;
      const rect = landscape ? poemDetailRef.current?.getBoundingClientRect() : null;
      dragRef.current = {
        startY: y, lastY: y,
        atTop: !landscape || !rect || rect.top >= -1,
        atBottom: !landscape || !rect || rect.bottom <= window.innerHeight + 1,
      };
      poemDetailRef.current?.classList.add('dragging');
    };
    const isNavGesture = (deltaY: number) => {
      if (!dragRef.current) return false;
      const canGoNext = currentSlide < renderPages.length - 1;
      const canGoPrev = currentSlide > 0;
      return (deltaY < 0 && dragRef.current.atBottom && canGoNext)
          || (deltaY > 0 && dragRef.current.atTop && canGoPrev);
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
        className="page poem-detail"
        onMouseDown={(e) => dragStart(e.clientY)}
        onMouseMove={(e) => dragMove(e.clientY)}
        onMouseUp={(e) => dragEnd(e.clientY)}
        onMouseLeave={(e) => dragEnd(e.clientY)}
        onTouchStart={(e) => dragStart(e.touches[0].clientY)}
        onTouchMove={(e) => { e.preventDefault(); dragMove(e.touches[0].clientY); }}
        onTouchEnd={(e) => dragEnd(e.changedTouches[0].clientY)}
      >
        <img src={detailPoem.image} alt={detailPoem.title} className="detail-fixed-bg detail-img-anim" />

        <button
          type="button"
          className={`detail-scroll-up-btn${upBtnVisible ? '' : ' is-hidden'}`}
          onClick={() => goToSlide(currentSlide - 1, -1)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Vertical carousel: AnimatePresence swaps pages with a direction-aware fade+translate */}
        <AnimatePresence initial={false} custom={slideDir} mode="wait">
          <motion.div
            key={currentSlide}
            custom={slideDir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: 'easeInOut' }}
          >
            <div className={`detail-image-container${currentSlide === 0 ? ' has-title' : ''}`}>
              {currentSlide === 0 && (
                <h1 className="detail-title detail-overlay-line" style={{ animationDelay: `${DETAIL_IMG_DURATION / 2}ms` }}>
                  {detailPoem.title}
                </h1>
              )}
              {currentPageLines.length > 0 && (
                <p className="detail-overlay">
                  {currentPageLines.map((line, i) => (
                    <span
                      key={i}
                      // Seen slides show immediately; new slides play the mask-wipe reveal
                      className={seenSlides.has(currentSlide) ? 'detail-overlay-line-revealed' : 'detail-overlay-line'}
                      style={!seenSlides.has(currentSlide) ? {
                        animationDelay: currentSlide === 0
                          ? `${DETAIL_IMG_DURATION + i * DETAIL_LINE_STAGGER}ms`
                          : `${i * DETAIL_LINE_STAGGER}ms`,
                      } : undefined}
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
                    const targetPage = Math.floor(poems.findIndex(p => p.id === id) / PER_PAGE);
                    sessionStorage.setItem('poems-grid-state', JSON.stringify({ page: targetPage, activePoemId: id }));
                    navigate('/poems');
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
            <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }

  // ── Grid page ─────────────────────────────────────────────────────────────────

  const displayed = poems.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const handleNextPage = () => {
    const nextPage = (page + 1) * PER_PAGE >= poems.length ? 0 : page + 1;
    tocDirectionRef.current = nextPage > page ? 'down' : 'up';
    retractTocLine(); // retract the indicator line before AnimatePresence starts the exit
    if (activeCardRef.current) {
      activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
      activeCardRef.current = null;
    }
    setActivePoemId(null);
    sessionStorage.removeItem('poems-grid-state');
    setPage(nextPage);
  };

  const handleTocClick = (poemId: string) => {
    pulseNavRef.current.forEach(clearTimeout);
    pulseNavRef.current = [];
    document.querySelectorAll<HTMLElement>('.poem-card.poem-highlight, .poem-card.poem-highlight-static').forEach(el => {
      el.classList.remove('poem-highlight', 'poem-highlight-static');
    });
    setActivePoemId(poemId);
    const targetPage = Math.floor(poems.findIndex(p => p.id === poemId) / PER_PAGE);

    // Pulses the card and then navigates to its detail page
    const doHighlight = () => {
      if (activeCardRef.current) activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
      const card = document.querySelector<HTMLElement>(`#${poemId} .poem-card`);
      if (!card) return;
      card.classList.remove('poem-highlight', 'poem-highlight-static');
      void card.offsetWidth;
      card.classList.add('poem-highlight');
      activeCardRef.current = card;
      const wrapper = card.closest<HTMLElement>('.poem-card-wrapper') ?? card;
      const rect = wrapper.getBoundingClientRect();
      const headerHeight = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height')
      ) || 72;
      if (rect.top < headerHeight) {
        window.scrollBy({ top: rect.top - headerHeight - 16, behavior: 'smooth' });
      } else if (rect.bottom > window.innerHeight) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      const rawPulse = getComputedStyle(document.documentElement).getPropertyValue('--pulse-duration').trim();
      const pulseDuration = rawPulse.endsWith('ms')
        ? parseFloat(rawPulse)
        : rawPulse.endsWith('s')
        ? parseFloat(rawPulse) * 1000
        : 2400;
      const t1 = setTimeout(() => {
        document.querySelector('.poems-grid-page')?.classList.add('page-fade-out');
      }, pulseDuration - PAGE_FADE_OUT);
      const t2 = setTimeout(() => {
        sessionStorage.setItem('poems-grid-state', JSON.stringify({ page: targetPage, activePoemId: poemId }));
        navigate(`/poems/${poemId}`);
      }, pulseDuration);
      pulseNavRef.current = [t1, t2];
    };

    if (targetPage === page) {
      doHighlight();
      return;
    }

    tocDirectionRef.current = targetPage > page ? 'down' : 'up';
    retractTocLine();
    if (activeCardRef.current) {
      activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
      activeCardRef.current = null;
    }
    // Queue the highlight to fire after the incoming page finishes entering
    pendingHighlightRef.current = doHighlight;
    setPage(targetPage);
  };

  return (
    <div className="page poems-grid-page">
      <h1 className="poems-heading">{t.poems.heading}</h1>
      <div className="poems-layout">
        <div className="poems-toc-wrap">
          <nav className="poems-toc">
            <p className="poems-toc-title">{t.poems.index}</p>
            <ul ref={tocListRef}>
              {poems.map((poem) => (
                <li key={poem.id} className={poem.id === activePoemId ? 'toc-active' : undefined}>
                  <a href={`#${poem.id}`} onClick={(e) => { e.preventDefault(); handleTocClick(poem.id); }}>{poem.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div ref={tocLineRef} className="toc-range-line" />
        </div>
        <div className="poems-content">
          {/* mode="wait" sequences exit then enter so cards never overlap between pages */}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="poems-grid"
              initial="hidden"
              animate="show"
              exit="exit"
              onAnimationComplete={(definition) => {
                // Only fire after the enter animation ("show"), not the exit
                if (definition === 'show' && pendingHighlightRef.current) {
                  pendingHighlightRef.current();
                  pendingHighlightRef.current = null;
                }
              }}
            >
              {displayed.map((poem, i) => (
                // Each card staggered via the custom prop passed to cardVariants
                <motion.div
                  key={poem.id}
                  id={poem.id}
                  className="poem-card-wrapper"
                  variants={cardVariants}
                  custom={i}
                >
                  <div className="poem-card-title">{poem.title}</div>
                  <Link to={`/poems/${poem.id}`} className="poem-card" onClick={() => {
                      pulseNavRef.current.forEach(clearTimeout);
                      pulseNavRef.current = [];
                      document.querySelectorAll<HTMLElement>('.poem-card.poem-highlight, .poem-card.poem-highlight-static').forEach(el => {
                        el.classList.remove('poem-highlight', 'poem-highlight-static');
                      });
                      sessionStorage.setItem('poems-grid-state', JSON.stringify({ page, activePoemId: poem.id }));
                      setActivePoemId(poem.id);
                    }}>
                    <div className="poem-card-img-wrap">
                      <img src={optimizeUrl(poem.image)} alt={poem.title} loading="lazy" />
                    </div>
                    {poem.overlay && (
                      <span className="poem-overlay">{poem.overlay}</span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          <button type="button" className="btn-more" onClick={handleNextPage}>{t.poems.more}</button>
        </div>
      </div>
    </div>
  );
}

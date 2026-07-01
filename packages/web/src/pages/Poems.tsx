import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { POEMS } from '@gedichtenv2/shared';

const PER_PAGE = 9;
const DETAIL_IMG_DURATION = 600; // ms — image + title fade-in
const DETAIL_LINE_STAGGER = 120; // ms between overlay lines
const DETAIL_BTN_OFFSET = 400; // ms after last line starts before bottom button appears
const PAGE_FADE_OUT = 400; // ms — must match --page-fade-out-duration in CSS

const optimizeUrl = (url: string) =>
  url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');

export default function Poems() {
  const { id } = useParams<{ id: string }>();
  const savedState = !id ? sessionStorage.getItem('poems-grid-state') : null;
  const savedParsed = savedState ? JSON.parse(savedState) : null;
  const [page, setPage] = useState<number>(savedParsed?.page ?? 0);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const navigate = useNavigate();
  const detailPoem = id ? (POEMS.find((p) => p.id === id) ?? null) : null;
  const detailLines = detailPoem?.overlay ? detailPoem.overlay.split('\n') : [];
  const [detailPages, setDetailPages] = useState<string[][] | null>(null);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const [activePoemId, setActivePoemId] = useState<string | null>(savedParsed?.activePoemId ?? id ?? null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [upBtnVisible, setUpBtnVisible] = useState(false);
  const [downBtnVisible, setDownBtnVisible] = useState(true);
  const [backBtnVisible, setBackBtnVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [seenSlides, setSeenSlides] = useState<Set<number>>(new Set<number>());
  const [incomingSlide, setIncomingSlide] = useState<number | null>(null);
  const sliderRef = useRef<InstanceType<typeof Slider> | null>(null);
  const poemDetailRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; lastY: number; atTop: boolean; atBottom: boolean } | null>(null);
  const tocListRef = useRef<HTMLUListElement>(null);
  const tocLineRef = useRef<HTMLDivElement>(null);
  const tocDirectionRef = useRef<'down' | 'up'>('down');
  const pulseNavRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useLayoutEffect(() => {
    setDetailPages(null);
    setCurrentSlide(0);
    setAnimKey(0);
    setSeenSlides(new Set<number>());
    setIncomingSlide(null);
    setUpBtnVisible(false);
    setDownBtnVisible(true);
    setBackBtnVisible(false);
  }, [id]);

  useLayoutEffect(() => {
    if (!id || !detailPoem?.overlay || detailPages !== null) return;
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
  }, [id, detailPages]);

  useEffect(() => () => { pulseNavRef.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (id || !activePoemId) return;
    const card = document.querySelector<HTMLElement>(`#${activePoemId} .poem-card`);
    if (!card || card.classList.contains('poem-highlight') || card.classList.contains('poem-highlight-static')) return;
    card.classList.add('poem-highlight-static');
    activeCardRef.current = card;
  }, [id, activePoemId]);

  useEffect(() => {
    const ul = tocListRef.current;
    const line = tocLineRef.current;
    if (!ul || !line) return;
    const nav = ul.parentElement as HTMLElement;

    const firstIndex = page * PER_PAGE;
    const lastIndex = Math.min((page + 1) * PER_PAGE - 1, POEMS.length - 1);
    const first = ul.children[firstIndex] as HTMLElement | undefined;
    const last = ul.children[lastIndex] as HTMLElement | undefined;
    if (!first || !last) return;

    const layoutTop = first.offsetTop;
    const height = last.offsetTop + last.offsetHeight - layoutTop;

    // Auto-scroll nav so the current page range is visible
    nav.scrollTop = Math.max(0, layoutTop - 24);

    const setTop = () => { line.style.top = `${layoutTop - nav.scrollTop}px`; };

    setTop();
    line.style.height = `${height}px`;
    line.style.animation = 'none';
    void line.offsetHeight;
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
    const line = tocLineRef.current;
    if (!line || phase !== 'out') return;
    const retractAnim = tocDirectionRef.current === 'down'
      ? 'toc-line-retract-down 0.4s ease forwards'
      : 'toc-line-retract-up 0.4s ease forwards';
    line.style.animation = 'none';
    void line.offsetHeight;
    line.style.animation = retractAnim;
  }, [phase]);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    setCurrentSlide(0);
    setAnimKey(0);
  }, [id]);

  useEffect(() => {
    if (!id || !detailPages) return;
    if (currentSlide === detailPages.length - 1) return;
    const lines = detailPages[currentSlide]?.length ?? 1;
    const timer = setTimeout(() => sliderRef.current?.slickNext(), Math.max(lines, 1) * 2500);
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

  if (id) {
    if (!detailPoem) return <div className="page"><p>Poem not found.</p></div>;
    const renderPages = detailPages ?? [detailLines];
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === renderPages.length - 1;
    const currentPageLines = renderPages[currentSlide] ?? [];
    const textDelay = currentPageLines.length > 0
      ? (currentPageLines.length - 1) * DETAIL_LINE_STAGGER + DETAIL_BTN_OFFSET
      : DETAIL_BTN_OFFSET;
    const btnDelay = seenSlides.has(currentSlide) ? 0 : isFirst ? DETAIL_IMG_DURATION + textDelay : textDelay;

    const getList = () => poemDetailRef.current?.querySelector<HTMLElement>('.slick-list') ?? null;

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
      return (deltaY < 0 && dragRef.current.atBottom) || (deltaY > 0 && dragRef.current.atTop);
    };
    const dragMove = (y: number) => {
      if (!dragRef.current) return;
      const totalDelta = y - dragRef.current.startY;
      const step = y - dragRef.current.lastY;
      dragRef.current.lastY = y;
      if (isNavGesture(totalDelta)) {
        const list = getList();
        if (list) list.style.transform = `translateY(${totalDelta * 0.35}px)`;
      } else {
        window.scrollBy({ top: -step, behavior: 'instant' });
      }
    };
    const dragEnd = (y: number) => {
      if (!dragRef.current) return;
      const delta = y - dragRef.current.startY;
      const nav = isNavGesture(delta);
      dragRef.current = null;
      poemDetailRef.current?.classList.remove('dragging');
      const list = getList();
      if (list) {
        list.style.transition = 'transform 0.3s ease';
        list.style.transform = '';
        setTimeout(() => { if (list) list.style.transition = ''; }, 300);
      }
      if (!nav || Math.abs(delta) < 50) return;
      if (delta < 0) sliderRef.current?.slickNext();
      else sliderRef.current?.slickPrev();
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
            onClick={() => sliderRef.current?.slickPrev()}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

        <Slider
          key={`${id}-${detailPages ? 'loaded' : 'loading'}`}
          ref={sliderRef}
          vertical
          swipe={false}
          draggable={false}
          infinite={false}
          arrows={false}
          speed={500}
          beforeChange={(_: number, next: number) => {
            setIncomingSlide(next);
            setUpBtnVisible(next !== 0);
            setDownBtnVisible(next !== renderPages.length - 1);
            setBackBtnVisible(next === renderPages.length - 1);
          }}
          afterChange={(index: number) => {
            setIncomingSlide(null);
            if (index !== currentSlide) {
              setSeenSlides(prev => {
                if (prev.has(currentSlide)) return prev;
                const s = new Set(prev); s.add(currentSlide); return s;
              });
              if (!seenSlides.has(index)) setAnimKey(k => k + 1);
            }
            setCurrentSlide(index);
          }}
        >
          {renderPages.map((pageLines, pageIdx) => {
            const isCurrentPage = pageIdx === currentSlide;
            const isLastPage = pageIdx === renderPages.length - 1;
            return (
              <div key={pageIdx}>
                <div className="detail-image-container">
                  {pageIdx === 0 && (
                    <h1 className="detail-title detail-overlay-line" style={{ animationDelay: `${DETAIL_IMG_DURATION / 2}ms` }}>
                      {detailPoem.title}
                    </h1>
                  )}
                  {pageLines.length > 0 && (
                    <p key={animKey} className="detail-overlay">
                      {pageLines.map((line, i) => (
                        <span
                          key={i}
                          className={
                            isCurrentPage || (pageIdx === incomingSlide && seenSlides.has(pageIdx))
                              ? seenSlides.has(pageIdx)
                                ? 'detail-overlay-line-revealed'
                                : 'detail-overlay-line'
                              : 'detail-overlay-line-shown'
                          }
                          style={isCurrentPage && !seenSlides.has(pageIdx) ? {
                            animationDelay: pageIdx === 0
                              ? `${DETAIL_IMG_DURATION + i * DETAIL_LINE_STAGGER}ms`
                              : `${i * DETAIL_LINE_STAGGER}ms`,
                          } : undefined}
                        >
                          {line || ' '}
                        </span>
                      ))}
                    </p>
                  )}
                  {isLastPage && (
                    <button
                      key={`back-${animKey}`}
                      type="button"
                      className={`detail-back-btn${backBtnVisible ? '' : ' is-hidden'}`}
                      style={{ animationDelay: `${btnDelay}ms` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetPage = Math.floor(POEMS.findIndex(p => p.id === id) / PER_PAGE);
                        sessionStorage.setItem('poems-grid-state', JSON.stringify({ page: targetPage, activePoemId: id }));
                        navigate('/poems');
                      }}
                    >
                      ← Poems
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Slider>

        <button
          type="button"
          className={`detail-scroll-down-btn${isLast || !downBtnVisible ? ' is-hidden' : ''}`}
          onClick={() => sliderRef.current?.slickNext()}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }

  const displayed = POEMS.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const STAGGER = 80; // ms between each card
  const FADE_DURATION = 200; // ms per fade

  const handleNextPage = () => {
    if (phase !== 'idle') return;
    const nextPage = (page + 1) * PER_PAGE >= POEMS.length ? 0 : page + 1;
    tocDirectionRef.current = nextPage > page ? 'down' : 'up';
    if (activeCardRef.current) {
      activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
      activeCardRef.current = null;
    }
    setActivePoemId(null);
    sessionStorage.removeItem('poems-grid-state');
    setPhase('out');
    setTimeout(() => {
      setPage(p => ((p + 1) * PER_PAGE >= POEMS.length ? 0 : p + 1));
      setPhase('in');
      setTimeout(() => setPhase('idle'), PER_PAGE * STAGGER + FADE_DURATION);
    }, PER_PAGE * STAGGER + FADE_DURATION);
  };

  const handleTocClick = (poemId: string) => {
    pulseNavRef.current.forEach(clearTimeout);
    pulseNavRef.current = [];
    document.querySelectorAll<HTMLElement>('.poem-card.poem-highlight, .poem-card.poem-highlight-static').forEach(el => {
      el.classList.remove('poem-highlight', 'poem-highlight-static');
    });
    setActivePoemId(poemId);
    const targetPage = Math.floor(POEMS.findIndex(p => p.id === poemId) / PER_PAGE);

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

    if (phase !== 'idle') return;
    tocDirectionRef.current = targetPage > page ? 'down' : 'up';
    if (activeCardRef.current) {
      activeCardRef.current.classList.remove('poem-highlight', 'poem-highlight-static');
      activeCardRef.current = null;
    }
    setPhase('out');
    setTimeout(() => {
      setPage(targetPage);
      setPhase('in');
      setTimeout(() => {
        setPhase('idle');
        doHighlight();
      }, PER_PAGE * STAGGER + FADE_DURATION);
    }, PER_PAGE * STAGGER + FADE_DURATION);
  };

  return (
    <div className="page poems-grid-page">
      <h1 className="poems-heading">Poems</h1>
      <div className="poems-layout">
        <div className="poems-toc-wrap">
          <nav className="poems-toc">
            <p className="poems-toc-title">Index</p>
            <ul ref={tocListRef}>
              {POEMS.map((poem) => (
                <li key={poem.id} className={poem.id === activePoemId ? 'toc-active' : undefined}>
                  <a href={`#${poem.id}`} onClick={(e) => { e.preventDefault(); handleTocClick(poem.id); }}>{poem.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div ref={tocLineRef} className="toc-range-line" />
        </div>
        <div className="poems-content">
          <div className={`poems-grid${phase === 'out' ? ' poems-fading-out' : phase === 'in' ? ' poems-fading-in' : ''}`}>
            {displayed.map((poem, i) => (
              <div
                key={poem.id}
                id={poem.id}
                className="poem-card-wrapper"
                style={{ '--stagger': `${i * STAGGER}ms` } as React.CSSProperties}
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
              </div>
            ))}
          </div>
          <button
            className={`btn-more${phase === 'out' ? ' btn-more-out' : phase === 'in' ? ' btn-more-in' : ''}`}
            style={{
              '--btn-fade-delay': `${(PER_PAGE - 1) * STAGGER}ms`,
              '--btn-fade-duration': `${FADE_DURATION}ms`,
            } as React.CSSProperties}
            onClick={handleNextPage}
          >More Poems</button>
        </div>
      </div>
    </div>
  );
}

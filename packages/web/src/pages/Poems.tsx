import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

const PER_PAGE = 9;
const DETAIL_IMG_DURATION = 600; // ms — image + title fade-in
const DETAIL_LINE_STAGGER = 120; // ms between overlay lines
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
  const tocListRef = useRef<HTMLUListElement>(null);
  const tocLineRef = useRef<HTMLDivElement>(null);
  const tocDirectionRef = useRef<'down' | 'up'>('down');
  const pulseNavRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useLayoutEffect(() => { setDetailPages(null); }, [id]);

  useLayoutEffect(() => {
    if (!id || !detailPoem?.overlay || detailPages !== null) return;
    const overlay = document.querySelector<HTMLElement>('.detail-overlay');
    const container = document.querySelector<HTMLElement>('.detail-image-container');
    if (!overlay || !container) { setDetailPages([detailLines]); return; }
    const btn = container.querySelector<HTMLElement>('.detail-back-btn');
    const os = getComputedStyle(overlay);
    const overlayPadV = parseFloat(os.paddingTop) + parseFloat(os.paddingBottom);
    const available = container.getBoundingClientRect().height - 80 - 32 - (btn?.getBoundingClientRect().height ?? 48) - overlayPadV;
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
    if (id) window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id || detailPages === null) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in-view');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.5 }
    );
    document.querySelectorAll('.detail-image-container').forEach(c => observer.observe(c));
    return () => observer.disconnect();
  }, [id, detailPages]);

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
    const singlePage = renderPages.length === 1;
    const btnDelay = singlePage
      ? (detailLines.length > 0 ? DETAIL_IMG_DURATION + (detailLines.length - 1) * DETAIL_LINE_STAGGER + 900 : DETAIL_IMG_DURATION + 400)
      : 0;
    return (
      <div className="page poem-detail">
        <img src={detailPoem.image} alt={detailPoem.title} className="detail-fixed-bg detail-img-anim" />
        {renderPages.map((pageLines, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === renderPages.length - 1;
          const lineOffset = renderPages.slice(0, pageIdx).reduce((s, p) => s + p.length, 0);
          return (
            <div key={pageIdx} className="detail-image-container">
              {isFirst ? (
                <h1 className="detail-title detail-overlay-line" style={{ animationDelay: `${DETAIL_IMG_DURATION / 2}ms` }}>
                  {detailPoem.title}
                </h1>
              ) : (
                <button
                  type="button"
                  className="detail-scroll-up-btn"
                  onClick={() => {
                    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
                    window.scrollTo({ top: (pageIdx - 1) * (window.innerHeight - headerH), behavior: 'smooth' });
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              {pageLines.length > 0 && (
                <p className="detail-overlay">
                  {pageLines.map((line, i) => (
                    <span
                      key={i}
                      className="detail-overlay-line"
                      style={{ animationDelay: isFirst
                        ? `${DETAIL_IMG_DURATION + (lineOffset + i) * DETAIL_LINE_STAGGER}ms`
                        : `${i * DETAIL_LINE_STAGGER}ms`
                      }}
                    >
                      {line || ' '}
                    </span>
                  ))}
                </p>
              )}
              {isLast ? (
                <button
                  type="button"
                  className="detail-back-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetPage = Math.floor(POEMS.findIndex(p => p.id === id) / PER_PAGE);
                    sessionStorage.setItem('poems-grid-state', JSON.stringify({ page: targetPage, activePoemId: id }));
                    navigate('/poems');
                  }}
                  style={{ animationDelay: `${btnDelay}ms` }}
                >
                  ← Poems
                </button>
              ) : (
                <button
                  type="button"
                  className="detail-scroll-down-btn"
                  onClick={() => {
                    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
                    window.scrollTo({ top: (pageIdx + 1) * (window.innerHeight - headerH), behavior: 'smooth' });
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
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

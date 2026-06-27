import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

const PER_PAGE = 9;
const DETAIL_IMG_DURATION = 600; // ms — image + title fade-in
const DETAIL_LINE_STAGGER = 120; // ms between overlay lines
const PAGE_FADE_OUT = 400; // ms — must match --page-fade-out-duration in CSS

const optimizeUrl = (url: string) =>
  url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');

function useFitDetailOverlay(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const fit = () => {
      const overlay = document.querySelector('.detail-overlay') as HTMLElement | null;
      const container = document.querySelector('.detail-image-container') as HTMLElement | null;
      if (!overlay || !container) return;
      overlay.style.fontSize = '';
      overlay.style.columnCount = '';
      let size = parseFloat(getComputedStyle(overlay).fontSize);
      const btn = container.querySelector('.detail-back-btn') as HTMLElement | null;
      const target = container.getBoundingClientRect().height - 80 - 32 - (btn?.getBoundingClientRect().height ?? 48);
      while (overlay.scrollHeight > target && size > 10) {
        size -= 1;
        overlay.style.fontSize = `${size}px`;
      }
      if (overlay.scrollHeight > target) {
        overlay.style.fontSize = '';
        overlay.style.columnCount = '2';
      }
    };
    fit();
    document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [active]);
}

export default function Poems() {
  const { id } = useParams<{ id: string }>();
  const savedState = !id ? sessionStorage.getItem('poems-grid-state') : null;
  const savedParsed = savedState ? JSON.parse(savedState) : null;
  const [page, setPage] = useState<number>(savedParsed?.page ?? 0);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const navigate = useNavigate();
  useFitDetailOverlay(!!id);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const [activePoemId, setActivePoemId] = useState<string | null>(savedParsed?.activePoemId ?? null);
  const tocListRef = useRef<HTMLUListElement>(null);
  const tocLineRef = useRef<HTMLDivElement>(null);
  const tocDirectionRef = useRef<'down' | 'up'>('down');
  const pulseNavRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    const poem = POEMS.find((p) => p.id === id);
    if (!poem) return <div className="page"><p>Poem not found.</p></div>;
    const lines = poem.overlay ? poem.overlay.split('\n') : [];
    const buttonDelay = lines.length > 0
      ? DETAIL_IMG_DURATION + (lines.length - 1) * DETAIL_LINE_STAGGER + 900
      : DETAIL_IMG_DURATION + 400;
    return (
      <div className="page poem-detail">
        <div className="detail-image-container">
          <img src={poem.image} alt={poem.title} className="detail-img-anim" />
          <h1 className="detail-title detail-overlay-line" style={{ animationDelay: `${DETAIL_IMG_DURATION / 2}ms` }}>{poem.title}</h1>
          {poem.overlay && (
            <p className="detail-overlay">
              {lines.map((line, i) => (
                <span
                  key={i}
                  className="detail-overlay-line"
                  style={{ animationDelay: `${DETAIL_IMG_DURATION + i * DETAIL_LINE_STAGGER}ms` }}
                >
                  {line || ' '}
                </span>
              ))}
            </p>
          )}
          <button
            type="button"
            className="detail-back-btn"
            onClick={() => navigate('/poems')}
            style={{ animationDelay: `${buttonDelay}ms` }}
          >
            ← Poems
          </button>
        </div>
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

import { useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

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
      const target = container.getBoundingClientRect().height * 0.85;
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
  const [visible, setVisible] = useState(6);
  const navigate = useNavigate();
  useFitDetailOverlay(!!id);
  const activeCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/poems'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, navigate]);

  useEffect(() => {
    if (id) return;
    const onClick = (e: MouseEvent) => {
      if (activeCardRef.current && !(e.target as Element).closest('.poem-card, .poems-toc')) {
        activeCardRef.current.classList.remove('poem-highlight');
        activeCardRef.current = null;
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [id]);

  if (id) {
    const poem = POEMS.find((p) => p.id === id);
    if (!poem) return <div className="page"><p>Poem not found.</p></div>;
    return (
      <div className="page poem-detail">
        <div className="detail-image-container">
          <img src={poem.image} alt={poem.title} />
          <h1 className="detail-title">{poem.title}</h1>
          {poem.overlay && <p className="detail-overlay">{poem.overlay}</p>}
        </div>
      </div>
    );
  }

  const displayed = POEMS.slice(0, visible);

  const handleTocClick = (id: string) => {
    if (activeCardRef.current) {
      activeCardRef.current.classList.remove('poem-highlight');
    }
    const card = document.querySelector<HTMLElement>(`#${id} .poem-card`);
    if (!card) return;
    card.classList.remove('poem-highlight');
    void card.offsetWidth;
    card.classList.add('poem-highlight');
    activeCardRef.current = card;
  };

  return (
    <div className="page poems-grid-page">
      <h1 className="poems-heading">Poems</h1>
      <div className="poems-layout">
        <nav className="poems-toc">
          <p className="poems-toc-title">Index</p>
          <ul>
            {displayed.map((poem) => (
              <li key={poem.id}>
                <a href={`#${poem.id}`} onClick={() => handleTocClick(poem.id)}>{poem.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="poems-content">
          <div className="poems-grid">
            {displayed.map((poem) => (
              <div key={poem.id} id={poem.id} className="poem-card-wrapper">
                <div className="poem-card-title">{poem.title}</div>
                <Link to={`/poems/${poem.id}`} className="poem-card">
                  <div className="poem-card-img-wrap">
                    <img src={poem.image} alt={poem.title} loading="lazy" />
                  </div>
                  {poem.overlay && (
                    <span className="poem-overlay">{poem.overlay}</span>
                  )}
                </Link>
              </div>
            ))}
          </div>
          {visible < POEMS.length && (
            <button className="btn-more" onClick={() => setVisible(v => v + 6)}>More Poems</button>
          )}
        </div>
      </div>
    </div>
  );
}


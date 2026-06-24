import { useLayoutEffect, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/poems'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, navigate]);

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

  return (
    <div className="page poems-grid-page">
      <h1 className="poems-heading">Poems</h1>
      <div className="poems-grid">
        {POEMS.slice(0, visible).map((poem) => (
          <div key={poem.id} className="poem-card-wrapper">
            <div className="poem-card-title">{poem.title}</div>
            <Link to={`/poems/${poem.id}`} className="poem-card">
              <img src={poem.image} alt={poem.title} loading="lazy" />
              
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
  );
}


import { useLayoutEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

function useFitDetailOverlay(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const fit = () => {
      const overlay = document.querySelector('.detail-overlay') as HTMLElement | null;
      const container = document.querySelector('.detail-image-container') as HTMLElement | null;
      if (!overlay || !container) return;
      overlay.style.fontSize = '';
      let size = parseFloat(getComputedStyle(overlay).fontSize);
      const target = container.getBoundingClientRect().height * 0.85;
      while (overlay.scrollHeight > target && size > 10) {
        size -= 1;
        overlay.style.fontSize = `${size}px`;
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
  useFitDetailOverlay(!!id);

  if (id) {
    const poem = POEMS.find((p) => p.id === id);
    if (!poem) return <div className="page"><p>Poem not found.</p></div>;
    return (
      <div className="page poem-detail">
        <div className="poem-detail-title-section">
          <h1>{poem.title}</h1>
        </div>
        <div className="detail-image-container">
          <img src={poem.image} alt={poem.title} />
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


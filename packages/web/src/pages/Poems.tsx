import { useParams, Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

export default function Poems() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    const poem = POEMS.find((p) => p.id === id);
    if (!poem) return <div className="page"><p>Poem not found.</p></div>;
    return (
      <div className="page poem-detail">
        <h1>{poem.title}</h1>
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
    {POEMS.map((poem) => (
      <Link key={poem.id} to={`/poems/${poem.id}`} className="poem-card">
        <img src={poem.image} alt={poem.title} loading="lazy" />
        
        {poem.overlay && (
          <span 
            className="poem-overlay" 
            style={{ 
              display: '-webkit-box',
              WebkitLineClamp: '10',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              
              /* The Magic Sauce: Alpha mask for the text pixels */
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 95%)',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 95%)'
            }}
          >
            {poem.overlay}
          </span>
        )}
      </Link>
    ))}
  </div>
</div>
  );
}

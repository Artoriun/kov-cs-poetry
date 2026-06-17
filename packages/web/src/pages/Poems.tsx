import { useParams, Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';

export default function Poems() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    const poem = POEMS.find((p) => p.id === id);
    if (!poem) return <div className="page"><p>Poem not found.</p></div>;
    return (
      <div className="page project-detail">
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
          <Link key={poem.id} to={`/projects/${poem.id}`} className="poem-card">
            <img src={poem.image} alt={poem.title} loading="lazy" />
            {poem.overlay && <span className="poem-overlay">{poem.overlay}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

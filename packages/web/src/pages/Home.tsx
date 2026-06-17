import ProjectCarousel from '../components/ProjectCarousel';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <h1>Kovács</h1>
        <p className="hero-subtitle">POETRY</p>
        <p className="hero-description">
          Poet and writer exploring the depths of human emotion and experience.
        </p>
      </section>

      <section className="carousel-section">
        <h2 className="section-heading">Featured Poems</h2>
        <ProjectCarousel />
      </section>
    </div>
  );
}
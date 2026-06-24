import PoemCarousel from '../components/PoemCarousel';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero-section" id="hero">
        <h1>Kovács</h1>
        <p className="hero-subtitle">Poetry</p>
        <div className="hero-divider" />
        <p className="hero-description">
          Poet and writer exploring the depths of human emotion and experience.
        </p>
        <a href="#carousel" className="hero-scroll-arrow" aria-label="Scroll to poems">
          <span className="hero-scroll-chevron" />
        </a>
      </section>

      <section className="carousel-section" id="carousel">
        <h2 className="section-heading">Featured Poems</h2>
        <PoemCarousel />
      </section>
    </div>
  );
}
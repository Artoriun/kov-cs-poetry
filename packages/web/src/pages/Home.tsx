import PoemCarousel from '../components/PoemCarousel';

export default function Home() {
  return (
    <div className="home-page">
      <section className="carousel-section" id="carousel">
        <PoemCarousel />
      </section>
    </div>
  );
}
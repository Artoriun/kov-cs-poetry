import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function ProjectCarousel() {
  const settings = {
    dots: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: true,
    pauseOnHover: true,
  };

  return (
    <div className="project-carousel-wrapper">
      <Slider {...settings}>
        {POEMS.map((poem) => (
          <div key={poem.id} className="carousel-slide">
            <Link to={`/projects/${poem.id}`} className="carousel-link">
              <div className="carousel-image-container">
                <img src={poem.image} alt={poem.title} loading="lazy" />
                {poem.overlay && <span className="carousel-overlay">{poem.overlay}</span>}
              </div>
            </Link>
          </div>
        ))}
      </Slider>
    </div>
  );
}

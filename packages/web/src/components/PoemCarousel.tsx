import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';
import '../styles/global.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function PoemCarousel() {
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
    <div className="poem-carousel-wrapper">
      <Slider {...settings}>
        {POEMS.map((poem) => (
          <div key={poem.id} className="carousel-slide">
            <Link to={`/poems/${poem.id}`} className="carousel-link">
            <div className="carousel-image-container">
              <img 
                src={poem.image} 
                alt={poem.title} 
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {poem.overlay && <span className="carousel-overlay">{poem.overlay}</span>}
            </div>
            </Link>
          </div>
        ))}
      </Slider>
    </div>
  );
}

import { useState, useEffect, useRef, SetStateAction } from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';
import '../styles/global.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function PoemCarousel() {
  const sliderRef = useRef<InstanceType<typeof Slider> | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Custom Autoplay Logic
  useEffect(() => {
    // 1. If the user is hovering over the carousel, pause the timer
    if (isHovered) return;

    // 2. Count the lines of the current poem string
    const currentPoem = POEMS[currentSlide];
    const lineCount = currentPoem?.overlay ? currentPoem.overlay.split('\n').length : 3;
    
    // 3. Calculate delay: 1 second per line (with a 3-second minimum baseline so short ones don't vanish instantly)
    const delay = Math.max(3000, lineCount * 1000);

    // 4. Set the timer to trigger the next slide
    const timer = setTimeout(() => {
      if (sliderRef.current) {
        sliderRef.current.slickNext();
      }
    }, delay);

    // Cleanup the timer if the slide changes or component unmounts
    return () => clearTimeout(timer);
  }, [currentSlide, isHovered]);

  const settings = {
    dots: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false, // <-- Turn off native autoplay so our useEffect handles it
    arrows: true,
    beforeChange: (_current: number, next: number) => {
      // Track which slide we are moving to so the useEffect can recalculate the lines
      setCurrentSlide(next);
    },
  };

  return (
    /* Mouse events recreate "pauseOnHover" feature manually */
    <div 
      className="poem-carousel-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Slider ref={sliderRef} {...settings}>
        {POEMS.map((poem) => (
          <div key={poem.id} className="carousel-slide">
            <div className="carousel-slide-title">{poem.title}</div>
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


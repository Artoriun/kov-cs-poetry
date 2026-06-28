import React, { useState, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { POEMS } from '@gedichtenv2/shared';
import '../styles/global.css';

const CAROUSEL_POEMS = POEMS.slice(0, 5);
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const PrevArrow = ({ onClick }: { onClick?: React.MouseEventHandler }) => (
  <button type="button" className="carousel-nav-btn carousel-nav-prev" onClick={onClick} aria-label="Previous">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M11 7H3M7 11l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);

const NextArrow = ({ onClick }: { onClick?: React.MouseEventHandler }) => (
  <button type="button" className="carousel-nav-btn carousel-nav-next" onClick={onClick} aria-label="Next">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);

export default function PoemCarousel() {
  const sliderRef = useRef<InstanceType<typeof Slider> | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  useEffect(() => {
    const fit = () => {
      document.querySelectorAll<HTMLElement>('.carousel-overlay').forEach((overlay) => {
        const container = overlay.closest<HTMLElement>('.carousel-image-container');
        if (!container) return;
        overlay.style.fontSize = '';
        overlay.style.columnCount = '';
        let size = parseFloat(getComputedStyle(overlay).fontSize);
        const target = (container.getBoundingClientRect().height || window.innerHeight) * 0.85;
        while (overlay.scrollHeight > target && size > 10) {
          size -= 1;
          overlay.style.fontSize = `${size}px`;
        }
        if (overlay.scrollHeight > target) {
          overlay.style.fontSize = '';
          overlay.style.columnCount = '2';
        }
      });
    };
    fit();
    document.fonts.ready.then(fit);
    const onResize = () => requestAnimationFrame(fit);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [currentSlide]);

  // Custom Autoplay Logic
  useEffect(() => {
    // 1. If the user is hovering over the carousel, pause the timer
    if (isHovered) return;

    // 2. Count the lines of the current poem string
    const currentPoem = CAROUSEL_POEMS[currentSlide];
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

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const endX = e.clientX;
    const endY = e.clientY;
    const deltaX = Math.abs(endX - startXRef.current);
    const deltaY = Math.abs(endY - startYRef.current);
    
    // If moved more than 10px in any direction, consider it a drag
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
    }
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    beforeChange: (_current: number, next: number) => {
      setCurrentSlide(next);
      setAnimKey(k => k + 1);
    },
  };

  return (
    <div
      className="poem-carousel-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-section-label">Featured Poems</div>
      <Slider ref={sliderRef} {...settings}>
        {CAROUSEL_POEMS.map((poem) => (
          <div key={poem.id} className="carousel-slide">
            <Link
              to={`/poems/${poem.id}`}
              className="carousel-link"
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault();
                  setIsDragging(false);
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              <div className="carousel-image-container">
                <img
                  src={poem.image}
                  alt={poem.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {CAROUSEL_POEMS.indexOf(poem) === currentSlide
                  ? <div key={animKey} className="carousel-slide-title carousel-overlay-line">{poem.title}</div>
                  : <div className="carousel-slide-title">{poem.title}</div>
                }
                {poem.overlay && (
                  <span className="carousel-overlay">
                    {CAROUSEL_POEMS.indexOf(poem) === currentSlide ? (
                      <span key={animKey}>
                        {poem.overlay.split('\n').map((line, i) => (
                          <span
                            key={i}
                            className="carousel-overlay-line"
                            style={{ animationDelay: `${(i + 1) * 100}ms` }}
                          >
                            {line || ' '}
                          </span>
                        ))}
                      </span>
                    ) : poem.overlay}
                  </span>
                )}
              </div>
            </Link>
          </div>
        ))}
      </Slider>
    </div>
  );
}

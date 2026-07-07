import React, { useState, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { usePoemsContext } from '../context/PoemsContext';
import '../styles/global.css';
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
  const { poems: allPoems, loading } = usePoemsContext();
  const withOverlay = allPoems.filter(p => p.overlay);
  const featured = withOverlay.filter(p => p.featured);
  const CAROUSEL_POEMS = featured.length > 0 ? featured : withOverlay.slice(0, 5);
  const sliderRef = useRef<InstanceType<typeof Slider> | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Custom Autoplay Logic
  useEffect(() => {
    if (isHovered || CAROUSEL_POEMS.length === 0) return;

    const currentPoem = CAROUSEL_POEMS[currentSlide];
    const lineCount = currentPoem?.overlay ? currentPoem.overlay.split('\n').length : 3;
    const delay = Math.max(3000, lineCount * 1000);

    const timer = setTimeout(() => {
      if (sliderRef.current) sliderRef.current.slickNext();
    }, delay);

    return () => clearTimeout(timer);
  }, [currentSlide, isHovered, CAROUSEL_POEMS.length]);

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
      className={`poem-carousel-wrapper${!loading && CAROUSEL_POEMS.length > 0 ? ' carousel-loaded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-section-label">Featured Poems</div>
      <Slider ref={sliderRef} {...settings}>
        {CAROUSEL_POEMS.map((poem) => {
          const isActive = CAROUSEL_POEMS.indexOf(poem) === currentSlide;
          const dragHandlers = {
            onMouseDown: handleMouseDown,
            onMouseUp: handleMouseUp,
            onClick: (e: React.MouseEvent) => { if (isDragging) { e.preventDefault(); setIsDragging(false); } },
          };
          return (
            <div key={poem.id} className="carousel-slide">
              <Link to={`/poems/${poem.id}`} className="carousel-link" {...dragHandlers}>
                <div className="carousel-image-container">
                  <img
                    src={poem.image}
                    alt={poem.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {isActive
                    ? <div key={animKey} className="carousel-slide-title carousel-overlay-line">{poem.title}</div>
                    : <div className="carousel-slide-title">{poem.title}</div>
                  }
                  {poem.overlay && (
                    <span className="carousel-overlay">
                      {isActive ? (
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
              <Link to={`/poems/${poem.id}`} className="carousel-read-more-btn" {...dragHandlers}>
                Read More
              </Link>
            </div>
          );
        })}
      </Slider>
    </div>
  );
}

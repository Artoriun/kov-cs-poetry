import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePoemsContext } from '../context/PoemsContext';
import '../styles/global.css';

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

// Horizontal slide variants; dir 1 = next/right, -1 = prev/left
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

export default function PoemCarousel() {
  const { poems: allPoems, loading } = usePoemsContext();
  const withOverlay = allPoems.filter(p => p.overlay);
  const featured = withOverlay.filter(p => p.featured);
  const CAROUSEL_POEMS = featured.length > 0 ? featured : withOverlay.slice(0, 5);
  const count = CAROUSEL_POEMS.length;

  // [current index, slide direction] packed together so one setState drives both
  const [[current, direction], setSlide] = useState([0, 0]);
  const [isHovered, setIsHovered] = useState(false);
  // Prevents navigating on a drag release that also fires a click event
  const isDraggingRef = useRef(false);

  const paginate = (dir: number) =>
    setSlide(([c]) => [(c + dir + count) % count, dir]);

  // Autoplay: delay proportional to line count so longer poems get more reading time
  useEffect(() => {
    if (isHovered || count === 0) return;
    const poem = CAROUSEL_POEMS[current];
    const lineCount = poem?.overlay ? poem.overlay.split('\n').length : 3;
    const timer = setTimeout(() => paginate(1), Math.max(3000, lineCount * 1000));
    return () => clearTimeout(timer);
  }, [current, isHovered, count]);

  const poem = CAROUSEL_POEMS[current];

  return (
    <div
      className={`poem-carousel-wrapper${!loading && count > 0 ? ' carousel-loaded' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-section-label">Featured Poems</div>

      {/* Horizontally sliding carousel; mode="popLayout" lets exit and enter overlap */}
      {/* onDragStart suppresses native HTML5 drag (text/image copy) so Motion gets the pointer cleanly */}
      <div style={{ position: 'relative', overflow: 'hidden' }} onDragStart={e => e.preventDefault()}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragStart={() => { isDraggingRef.current = true; }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) paginate(1);
              else if (info.offset.x > 50) paginate(-1);
              // Delay clearing so the click event that fires after drag-end is still blocked
              setTimeout(() => { isDraggingRef.current = false; }, 100);
            }}
            className="carousel-slide"
          >
            {poem && (
              <>
                <Link
                  to={`/poems/${poem.id}`}
                  className="carousel-link"
                  onClick={e => { if (isDraggingRef.current) e.preventDefault(); }}
                >
                  <div className="carousel-image-container">
                    <img
                      src={poem.image}
                      alt={poem.title}
                      loading="lazy"
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* key=current restarts the CSS reveal animation on every slide change */}
                    <div key={current} className="carousel-slide-title carousel-overlay-line">
                      {poem.title}
                    </div>
                    {poem.overlay && (
                      <span className="carousel-overlay">
                        <span key={current}>
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
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to={`/poems/${poem.id}`}
                  className="carousel-read-more-btn"
                  onClick={e => { if (isDraggingRef.current) e.preventDefault(); }}
                >
                  Read More
                </Link>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <PrevArrow onClick={() => paginate(-1)} />
      <NextArrow onClick={() => paginate(1)} />
    </div>
  );
}

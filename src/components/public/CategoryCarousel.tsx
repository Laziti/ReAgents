import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  label: string;
  count?: number;
}

interface CategoryCarouselProps {
  categories: Category[];
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  autoScrollInterval?: number;
}

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  autoScrollInterval = 5000, // 5 seconds default
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPaused || isDragging || categories.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, autoScrollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isDragging, categories.length, autoScrollInterval]);

  // Sync currentIndex with activeCategory
  useEffect(() => {
    if (activeCategory) {
      const index = categories.findIndex((cat) => cat.id === activeCategory);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [activeCategory, categories]);

  // Handle category click
  const handleCategoryClick = useCallback(
    (categoryId: string, index: number) => {
      setCurrentIndex(index);
      if (onCategoryChange) {
        onCategoryChange(categoryId);
      }
      // Pause auto-scroll briefly when user interacts
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 3000);
    },
    [onCategoryChange]
  );

  // Handle manual navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + categories.length) % categories.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [categories.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % categories.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [categories.length]);

  // Touch/drag handlers
  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(true);
    setIsPaused(true);
    if (carouselRef.current) {
      startXRef.current = info.point.x;
      scrollLeftRef.current = carouselRef.current.scrollLeft;
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!carouselRef.current) return;
    const x = info.point.x;
    const walk = (x - startXRef.current) * 2; // Scroll speed multiplier
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (!carouselRef.current) return;

    const threshold = 50; // Minimum drag distance to trigger slide
    const diff = startXRef.current - info.point.x;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    // Resume auto-scroll after a delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  if (categories.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="relative flex items-center justify-center py-4 sm:py-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Navigation Buttons - Desktop Only */}
        {categories.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 sm:left-4 z-20 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 hidden sm:flex items-center justify-center"
              onClick={goToPrevious}
              aria-label="Previous category"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 sm:right-4 z-20 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 hidden sm:flex items-center justify-center"
              onClick={goToNext}
              aria-label="Next category"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
            </Button>
          </>
        )}

        {/* Categories Container */}
        <motion.div
          className="flex items-center gap-3 sm:gap-4 px-12 sm:px-16"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{
            x: `-${currentIndex * 100}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          style={{
            width: `${categories.length * 100}%`,
          }}
        >
          <AnimatePresence mode="wait">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                className={cn(
                  'flex-shrink-0 w-full flex items-center justify-center',
                  'px-4 sm:px-6'
                )}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: index === currentIndex ? 1 : 0.6,
                  scale: index === currentIndex ? 1 : 0.95,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeInOut',
                }}
              >
                <motion.button
                  onClick={() => handleCategoryClick(category.id, index)}
                  className={cn(
                    'relative px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl',
                    'text-base sm:text-lg font-semibold transition-all duration-300',
                    'shadow-sm border-2',
                    index === currentIndex
                      ? 'bg-red-500 text-white border-red-500 shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:shadow-md',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2 sm:gap-3">
                    {category.label}
                    {category.count !== undefined && (
                      <span
                        className={cn(
                          'px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium',
                          index === currentIndex
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {category.count}
                      </span>
                    )}
                  </span>
                  {/* Active indicator */}
                  {index === currentIndex && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"
                      layoutId="activeIndicator"
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Dots Indicator - Mobile Only */}
      {categories.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-2 sm:hidden">
          {categories.map((_, index) => (
            <button
              key={index}
              onClick={() => handleCategoryClick(categories[index].id, index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 bg-red-500'
                  : 'w-2 bg-gray-300'
              )}
              aria-label={`Go to ${categories[index].label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryCarousel;






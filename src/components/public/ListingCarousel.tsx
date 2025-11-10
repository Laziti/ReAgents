import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListingCard from './ListingCard';

interface Listing {
  id: string;
  title: string;
  price: number;
  location?: string;
  city?: string;
  main_image_url?: string;
  description?: string;
  created_at?: string;
  progress_status?: 'excavation' | 'on_progress' | 'semi_finished' | 'fully_finished';
  bank_option?: boolean;
}

interface ListingCarouselProps {
  listings: Listing[];
  agentSlug?: string;
  onViewDetails?: (listingId: string) => void;
  autoScrollInterval?: number;
}

const getItemsPerView = () => {
  if (typeof window === 'undefined') {
    return 1;
  }
  if (window.innerWidth >= 1280) {
    return 3;
  }
  if (window.innerWidth >= 1024) {
    return 3;
  }
  if (window.innerWidth >= 768) {
    return 2;
  }
  return 1;
};

const ListingCarousel: React.FC<ListingCarouselProps> = ({
  listings,
  agentSlug,
  onViewDetails,
  autoScrollInterval = 4000, // 4 seconds default
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number>(0);

  const effectiveItemsPerView = useMemo(() => {
    const count = Math.max(listings.length, 1);
    return Math.min(itemsPerView, count);
  }, [itemsPerView, listings.length]);

  const maxIndex = Math.max(0, listings.length - effectiveItemsPerView);
  const slideWidth = 100 / effectiveItemsPerView;

  useEffect(() => {
    const updateItemsPerView = () => {
      setItemsPerView(getItemsPerView());
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);

    return () => {
      window.removeEventListener('resize', updateItemsPerView);
    };
  }, []);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPaused || isDragging || listings.length <= effectiveItemsPerView || maxIndex === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next > maxIndex) {
          return 0;
        }
        return next;
      });
    }, autoScrollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isDragging, listings.length, effectiveItemsPerView, autoScrollInterval, maxIndex]);

  // Handle manual navigation

  const goToPrevious = () => {
    setCurrentIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? maxIndex : next;
    });
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      return next > maxIndex ? 0 : next;
    });
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };

  // Touch/drag handlers
  const handleDragStart = (_event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number } }) => {
    setIsDragging(true);
    setIsPaused(true);
    startXRef.current = info.point.x;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number } }) => {
    setIsDragging(false);
    const diff = startXRef.current - info.point.x;
    const threshold = 50; // Minimum drag distance to trigger slide

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setTimeout(() => setIsPaused(false), 2000);
  };

  if (listings.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Navigation Buttons - Desktop Only */}
      {listings.length > effectiveItemsPerView && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-lg border border-gray-200 hidden sm:flex items-center justify-center"
            onClick={goToPrevious}
            aria-label="Previous listing"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 z-20 h-10 w-10 rounded-full bg-white/95 hover:bg-white shadow-lg border border-gray-200 hidden sm:flex items-center justify-center"
            onClick={goToNext}
            aria-label="Next listing"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </Button>
        </>
      )}

      {/* Carousel Container */}
      <div className="overflow-hidden w-full">
        <motion.div
          ref={carouselRef}
          className="flex items-stretch"
          drag={maxIndex > 0 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          animate={{
            x: `-${currentIndex * slideWidth}%`,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          style={{
            width: `${(listings.length / effectiveItemsPerView) * 100}%`,
          }}
        >
          {listings.map((listing, index) => (
            <motion.div
              key={listing.id}
              className="flex-shrink-0 px-2 sm:px-3"
              style={{
                flex: `0 0 ${slideWidth}%`,
                maxWidth: `${slideWidth}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
            >
              <div className="h-full">
                <ListingCard
                  id={listing.id}
                  title={listing.title}
                  location={listing.location}
                  mainImageUrl={listing.main_image_url}
                  agentSlug={agentSlug}
                  description={listing.description}
                  createdAt={listing.created_at}
                  progressStatus={listing.progress_status}
                  bankOption={listing.bank_option}
                  onViewDetails={() => {
                    if (onViewDetails) {
                      onViewDetails(listing.id);
                    }
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dots Indicator */}
      {listings.length > effectiveItemsPerView && (
        <div className="flex items-center justify-center gap-2 mt-6 pb-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 3000);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-red-500'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to listing ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingCarousel;


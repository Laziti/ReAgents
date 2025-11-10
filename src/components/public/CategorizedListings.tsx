import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface Category {
  id: string;
  label: string;
  listings: Listing[];
}

interface CategorizedListingsProps {
  listings: Listing[];
  agentSlug?: string;
  onViewDetails?: (listingId: string) => void;
  autoScrollInterval?: number;
}

const getItemsPerView = () => {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth >= 1024) return 3; // Desktop: 3 cards
  if (window.innerWidth >= 768) return 2;  // Tablet: 2 cards
  return 1; // Mobile: 1 card
};

const CategorizedListings: React.FC<CategorizedListingsProps> = ({
  listings,
  agentSlug,
  onViewDetails,
  autoScrollInterval = 5000, // 5 seconds default
}) => {
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);
  const [scrollStates, setScrollStates] = useState<{ [key: string]: { left: boolean; right: boolean } }>({});
  const [isPaused, setIsPaused] = useState<{ [key: string]: boolean }>({});
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollHandlersRef = useRef<{ [key: string]: () => void }>({});
  const autoScrollTimersRef = useRef<{ [key: string]: NodeJS.Timeout | null }>({});

  // Categorize listings
  const categories = useMemo<Category[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // All listings
    const allListings = listings;

    // Recent Listings - Listings from last 30 days
    const recentListings = listings.filter(listing => {
      if (!listing.created_at) return false;
      return new Date(listing.created_at) >= thirtyDaysAgo;
    });

    // In Addis Ababa - Listings in Addis Ababa
    const inAddisAbaba = listings.filter(listing => {
      return listing.city === 'Addis Ababa';
    });

    return [
      {
        id: 'all-listings',
        label: 'All Listings',
        listings: allListings,
      },
      {
        id: 'recent-listings',
        label: 'Recent Listings',
        listings: recentListings,
      },
      {
        id: 'in-addis-ababa',
        label: 'In Addis Ababa',
        listings: inAddisAbaba,
      },
    ];
  }, [listings]);

  // Handle window resize
  useEffect(() => {
    const updateItemsPerView = () => {
      setItemsPerView(getItemsPerView());
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  // Update scroll button states
  const updateScrollButtons = useCallback((categoryId: string) => {
    const container = scrollRefs.current[categoryId];
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;

    setScrollStates(prev => {
      const current = prev[categoryId] || { left: false, right: false };
      if (current.left === canScrollLeft && current.right === canScrollRight) {
        return prev; // No change, return previous state
      }
      return {
        ...prev,
        [categoryId]: { left: canScrollLeft, right: canScrollRight },
      };
    });
  }, []);

  // Setup scroll event listeners
  useEffect(() => {
    const setupScrollListeners = () => {
      categories.forEach(category => {
        const container = scrollRefs.current[category.id];
        if (!container) return;

        const handler = () => updateScrollButtons(category.id);
        scrollHandlersRef.current[category.id] = handler;
        container.addEventListener('scroll', handler);
        updateScrollButtons(category.id);
      });
    };

    // Small delay to ensure refs are mounted
    const timeoutId = setTimeout(setupScrollListeners, 100);

    return () => {
      clearTimeout(timeoutId);
      Object.values(scrollHandlersRef.current).forEach((handler, index) => {
        const categoryId = Object.keys(scrollHandlersRef.current)[index];
        const container = scrollRefs.current[categoryId];
        if (container && handler) {
          container.removeEventListener('scroll', handler);
        }
      });
    };
  }, [categories, updateScrollButtons]);

  // Auto-scroll functionality
  useEffect(() => {
    const timers: { [key: string]: NodeJS.Timeout } = {};

    categories.forEach(category => {
      const categoryId = category.id;
      const container = scrollRefs.current[categoryId];
      if (!container || category.listings.length <= itemsPerView) return;

      const scroll = () => {
        if (isPaused[categoryId]) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScroll = scrollWidth - clientWidth;
        const cardWidth = container.scrollWidth / category.listings.length;
        const scrollAmount = cardWidth * itemsPerView;

        let newScrollLeft = scrollLeft + scrollAmount;
        if (newScrollLeft >= maxScroll) {
          newScrollLeft = 0; // Loop back to start
        }

        container.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth',
        });
      };

      timers[categoryId] = setInterval(scroll, autoScrollInterval);
      autoScrollTimersRef.current[categoryId] = timers[categoryId];
    });

    return () => {
      Object.values(timers).forEach(timer => {
        if (timer) clearInterval(timer);
      });
      Object.keys(autoScrollTimersRef.current).forEach(categoryId => {
        if (autoScrollTimersRef.current[categoryId]) {
          clearInterval(autoScrollTimersRef.current[categoryId]);
        }
      });
    };
  }, [categories, itemsPerView, autoScrollInterval, isPaused]);

  // Manual scroll functions
  const scrollLeft = (categoryId: string) => {
    const container = scrollRefs.current[categoryId];
    if (!container) return;

    const cardWidth = container.scrollWidth / categories.find(c => c.id === categoryId)?.listings.length || 1;
    const scrollAmount = cardWidth * itemsPerView;

    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });

    setIsPaused(prev => ({ ...prev, [categoryId]: true }));
    setTimeout(() => setIsPaused(prev => ({ ...prev, [categoryId]: false })), 3000);
  };

  const scrollRight = (categoryId: string) => {
    const container = scrollRefs.current[categoryId];
    if (!container) return;

    const cardWidth = container.scrollWidth / categories.find(c => c.id === categoryId)?.listings.length || 1;
    const scrollAmount = cardWidth * itemsPerView;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });

    setIsPaused(prev => ({ ...prev, [categoryId]: true }));
    setTimeout(() => setIsPaused(prev => ({ ...prev, [categoryId]: false })), 3000);
  };

  // Pause on hover
  const handleMouseEnter = (categoryId: string) => {
    setIsPaused(prev => ({ ...prev, [categoryId]: true }));
  };

  const handleMouseLeave = (categoryId: string) => {
    setIsPaused(prev => ({ ...prev, [categoryId]: false }));
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      {categories.map((category) => {
        if (category.listings.length === 0) return null;

        const scrollState = scrollStates[category.id] || { left: false, right: false };
        const canScroll = category.listings.length > itemsPerView;

        return (
          <div
            key={category.id}
            className="relative"
            onMouseEnter={() => handleMouseEnter(category.id)}
            onMouseLeave={() => handleMouseLeave(category.id)}
          >
            {/* Category Title */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-text)]">
                {category.label}
              </h2>
              {canScroll && (
                <div className="hidden sm:flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-gray-300 hover:bg-gray-100 disabled:opacity-30"
                    onClick={() => scrollLeft(category.id)}
                    disabled={!scrollState.left}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-gray-300 hover:bg-gray-100 disabled:opacity-30"
                    onClick={() => scrollRight(category.id)}
                    disabled={!scrollState.right}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Scrollable Listings Container */}
            <div className="relative">
              <div
                ref={(el) => {
                  scrollRefs.current[category.id] = el;
                }}
                className="flex gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide pb-4"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {category.listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex-shrink-0"
                    style={{
                      width: `calc((100% - ${(itemsPerView - 1) * 1.5}rem) / ${itemsPerView})`,
                      minWidth: `calc((100% - ${(itemsPerView - 1) * 1.5}rem) / ${itemsPerView})`,
                    }}
                  >
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
                ))}
              </div>

              {/* Mobile Navigation Arrows */}
              {canScroll && (
                <div className="sm:hidden flex justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-gray-300 hover:bg-gray-100 disabled:opacity-30"
                    onClick={() => scrollLeft(category.id)}
                    disabled={!scrollState.left}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-gray-300 hover:bg-gray-100 disabled:opacity-30"
                    onClick={() => scrollRight(category.id)}
                    disabled={!scrollState.right}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategorizedListings;

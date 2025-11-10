import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet';
import AgentProfileHeader from '@/components/public/AgentProfileHeader';
import ListingCard from '@/components/public/ListingCard';
import SearchBar from '@/components/public/SearchBar';
import CategorizedListings from '@/components/public/CategorizedListings';
import { Loader2, Building, ChevronRight, Home, ArrowLeft, Phone, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { createSlug } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface AgentProfile {
  id: string;
  first_name: string;
  last_name: string;
  career?: string;
  phone_number?: string;
  avatar_url?: string;
  slug?: string;
  whatsapp_link?: string;
  telegram_link?: string;
}

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

interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  progressStatus?: string;
  bankOption?: boolean;
}

const AgentPublicProfile = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [activeFilters, setActiveFilters] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const progressStatusLabels: Record<string, string> = {
    excavation: 'Excavation',
    on_progress: 'On Progress',
    semi_finished: 'Semi-finished',
    fully_finished: 'Fully Finished',
  };
  const priceRanges = [
    { id: 'lt1m', label: '< 1M ETB', min: 0, max: 1_000_000 },
    { id: '1m-3m', label: '1M - 3M ETB', min: 1_000_000, max: 3_000_000 },
    { id: '3m-5m', label: '3M - 5M ETB', min: 3_000_000, max: 5_000_000 },
    { id: '5m-10m', label: '5M - 10M ETB', min: 5_000_000, max: 10_000_000 },
    { id: 'gt10m', label: '> 10M ETB', min: 10_000_000, max: Infinity },
  ];

  // Fetch agent profile by slug
  useEffect(() => {
    const fetchAgent = async () => {
      setLoading(true);
      try {
        // Skip profile lookup for special pages
        if (agentSlug === 'not-found' || agentSlug === 'pending') {
          setLoading(false);
          return;
        }

        // Attempt to fetch by slug
        const { data: profileBySlug, error: slugError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, career, phone_number, avatar_url, slug, status, whatsapp_link, telegram_link')
          .eq('slug', agentSlug)
          .eq('status', 'active')
          .single();

        if (slugError) {
          logger.error('Error fetching agent by slug:', slugError);
          navigate('/not-found');
          return;
        }

        if (profileBySlug) {
          setAgent(profileBySlug);
          logger.log('Agent found by slug:', profileBySlug);
            } else {
          navigate('/not-found');
          return;
        }

      } catch (error) {
        logger.error('Error fetching agent profile:', error);
        setError('Error fetching agent profile');
        navigate('/not-found');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSlug, navigate]);

  // Fetch listings when agent is set
  useEffect(() => {
    const fetchListings = async () => {
      if (!agent) {
        logger.log('Agent not set, skipping listings fetch.');
        return;
      }
      setLoading(true);
      logger.log(`Fetching listings for agent ID: ${agent.id}`);
      try {
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, price, location, city, main_image_url, description, created_at, progress_status, bank_option, expires_at, views')
          .eq('user_id', agent.id)
          .neq('status', 'hidden')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false });

        if (listingsError) {
          logger.error('Error fetching listings:', listingsError);
          setListings([]);
        } else {
          logger.log(`Fetched ${listingsData?.length || 0} listings.`);
          setListings(listingsData as unknown as Listing[]);
        }
      } catch (error) {
        logger.error('Error fetching listings:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [agent]);

  // Extract available cities from listings
  useEffect(() => {
    if (listings.length > 0) {
      const cities = Array.from(new Set(listings.map(listing => listing.city).filter(Boolean)));
      setAvailableCities(cities as string[]);
      logger.log('Available cities for filtering:', cities);
    }
  }, [listings]);

  // Helper to toggle a filter value
  function toggleFilter(key, value) {
    setSearchFilters(prev => {
      let next = { ...prev };
      if (key === 'city') {
        next.city = prev.city === value ? undefined : value;
      } else if (key === 'progressStatus') {
        next.progressStatus = prev.progressStatus === value ? undefined : value;
      } else if (key === 'bankOption') {
        next.bankOption = prev.bankOption === value ? undefined : value;
      } else if (key === 'priceRange') {
        if (prev.minPrice === value.min && prev.maxPrice === value.max) {
          next.minPrice = undefined;
          next.maxPrice = undefined;
        } else {
          next.minPrice = value.min;
          next.maxPrice = value.max;
        }
      }
      return next;
    });
  }

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (searchFilters.city) count++;
    if (searchFilters.progressStatus) count++;
    if (searchFilters.bankOption !== undefined) count++;
    if (searchFilters.minPrice !== undefined && searchFilters.maxPrice !== undefined) count++;
    setActiveFilters(count);
  }, [searchFilters]);

  // Update filtered listings when searchFilters, listings, or activeCategory change
  useEffect(() => {
    let filtered = [...listings];
    
    // Apply category filter
    if (activeCategory === 'recent') {
      // Show listings from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(l => {
        if (!l.created_at) return false;
        return new Date(l.created_at) >= thirtyDaysAgo;
      });
    } else if (activeCategory !== 'all' && activeCategory.startsWith('city-')) {
      // Filter by city
      const cityName = activeCategory.replace('city-', '');
      filtered = filtered.filter(l => l.city === cityName);
    }
    
    // Apply other filters
    if (searchFilters.city) {
      filtered = filtered.filter(l => l.city === searchFilters.city);
    }
    if (searchFilters.progressStatus) {
      filtered = filtered.filter(l => l.progress_status === searchFilters.progressStatus);
    }
    if (searchFilters.bankOption !== undefined) {
      filtered = filtered.filter(l => l.bank_option === searchFilters.bankOption);
    }
    if (searchFilters.minPrice !== undefined && searchFilters.maxPrice !== undefined) {
      filtered = filtered.filter(l => l.price >= searchFilters.minPrice && l.price < searchFilters.maxPrice);
    }
    setFilteredListings(filtered);
  }, [searchFilters, listings, activeCategory]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchFilters({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-gold-500" />
          <p className="text-[var(--portal-text-secondary)] animate-pulse">Loading agent profile...</p>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const pageTitle = `${agent.first_name} ${agent.last_name} - Professional Real Estate Agent`;
  const pageDescription = `Connect with ${agent.first_name} ${agent.last_name}${agent.career ? `, ${agent.career}` : ''} for expert real estate services. Browse ${listings.length} property listings and find your perfect home.`;

  const hasActiveSearch = searchQuery.trim() !== '' || Object.keys(searchFilters).some(key => 
    searchFilters[key as keyof SearchFilters] !== undefined
  );

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] text-[var(--portal-text)]">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={agent.avatar_url || "/LogoIcon.svg"} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={agent.avatar_url || "/LogoIcon.svg"} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-4 sm:py-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Agent Profile Header */}
          <div className="mb-8 relative z-20">
            <AgentProfileHeader 
              firstName={agent.first_name}
              lastName={agent.last_name}
              career={agent.career}
              phoneNumber={agent.phone_number}
              avatarUrl={agent.avatar_url}
              whatsappLink={agent.whatsapp_link}
              telegramLink={agent.telegram_link}
              listings={listings}
            />
          </div>

          {/* Filter section with tabs */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--portal-text)]">Filter Properties</h2>
              {activeFilters > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1"
                >
                  <X className="h-4 w-4" /> Clear filters ({activeFilters})
                </Button>
              )}
            </div>

            <Tabs defaultValue="places" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-2 bg-gray-100">
                <TabsTrigger value="places">Places</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="bank">Bank Option</TabsTrigger>
                <TabsTrigger value="prices">Prices</TabsTrigger>
              </TabsList>
              
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <TabsContent value="places" className="mt-0">
                  {availableCities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableCities.map(city => (
                        <Badge
                          key={city}
                          variant={searchFilters.city === city ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1.5 ${
                            searchFilters.city === city 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-transparent hover:bg-red-50 text-[var(--portal-text)]'
                          }`}
                          onClick={() => toggleFilter('city', city)}
                        >
                          {city}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[var(--portal-text-secondary)] text-sm">No locations available</p>
                  )}
                </TabsContent>
                
                <TabsContent value="progress" className="mt-0">
                  {(() => {
                    const progressStatuses = Array.from(new Set(listings.map(l => l.progress_status).filter(Boolean)));
                    return progressStatuses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {progressStatuses.map(status => (
                          <Badge
                            key={status as string}
                            variant={searchFilters.progressStatus === status ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 ${
                              searchFilters.progressStatus === status 
                                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                : 'bg-transparent hover:bg-blue-50 text-[var(--portal-text)]'
                            }`}
                            onClick={() => toggleFilter('progressStatus', status)}
                          >
                            {progressStatusLabels[status as string] || status}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[var(--portal-text-secondary)] text-sm">No progress statuses available</p>
                    );
                  })()}
                </TabsContent>
                
                <TabsContent value="bank" className="mt-0">
                  {(() => {
                    const hasBankOption = listings.some(l => l.bank_option);
                    const hasNoBankOption = listings.some(l => l.bank_option === false);
                    return (hasBankOption || hasNoBankOption) ? (
                      <div className="flex flex-wrap gap-2">
                        {hasBankOption && (
                          <Badge
                            variant={searchFilters.bankOption === true ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 ${
                              searchFilters.bankOption === true 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-transparent hover:bg-green-50 text-[var(--portal-text)]'
                            }`}
                            onClick={() => toggleFilter('bankOption', true)}
                          >
                            Available
                          </Badge>
                        )}
                        {hasNoBankOption && (
                          <Badge
                            variant={searchFilters.bankOption === false ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 ${
                              searchFilters.bankOption === false 
                                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                                : 'bg-transparent hover:bg-gray-50 text-[var(--portal-text)]'
                            }`}
                            onClick={() => toggleFilter('bankOption', false)}
                          >
                            Not Available
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-[var(--portal-text-secondary)] text-sm">No bank option information available</p>
                    );
                  })()}
                </TabsContent>
                
                <TabsContent value="prices" className="mt-0">
                  {(() => {
                    const priceRangeIds = new Set<string>();
                    listings.forEach(l => {
                      const range = priceRanges.find(r => l.price >= r.min && l.price < r.max);
                      if (range) priceRangeIds.add(range.id);
                    });
                    return priceRangeIds.size > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {priceRanges.filter(r => priceRangeIds.has(r.id)).map(range => (
                          <Badge
                            key={range.id}
                            variant={(searchFilters.minPrice === range.min && searchFilters.maxPrice === range.max) ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 ${
                              (searchFilters.minPrice === range.min && searchFilters.maxPrice === range.max)
                                ? 'bg-gold-500 hover:bg-gold-600 text-white' 
                                : 'bg-transparent hover:bg-gold-50 text-[var(--portal-text)]'
                            }`}
                            onClick={() => toggleFilter('priceRange', { min: range.min, max: range.max })}
                          >
                            {range.label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[var(--portal-text-secondary)] text-sm">No price ranges available</p>
                    );
                  })()}
                </TabsContent>
              </div>
            </Tabs>
          </div>

        </div>

        {/* Categorized Listings Section */}
        <div className="mt-12">
          {filteredListings.length > 0 ? (
            <CategorizedListings
              listings={filteredListings}
              agentSlug={agent.slug}
              onViewDetails={(listingId) => {
                const listing = filteredListings.find(l => l.id === listingId);
                if (listing) {
                  navigate(`/agent/${agent.slug}/listing/${createSlug(listing.title)}`);
                }
              }}
            />
          ) : (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md mx-auto">
                <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold mb-2">No listings found</h3>
                <p className="text-[var(--portal-text-secondary)] mb-4">
                  Try adjusting your filters to see more properties
                </p>
                <Button onClick={clearAllFilters} variant="outline" className="border-red-200 text-red-500 hover:bg-red-50">
                  Clear all filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentPublicProfile;

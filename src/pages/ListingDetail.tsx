import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { createSlug, formatCurrency, formatDate } from '@/lib/formatters';
import { Loader2, ArrowLeft, MapPin, Banknote, Calendar, ExternalLink, Phone, MessageCircle, Send, Share2, Copy, Check, FileText, Home, DollarSign, Facebook, Twitter, Linkedin, ThumbsUp, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { createListingSlug } from '@/components/public/ListingCard';
import { Listing, Agent } from '@/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const ListingDetail = () => {
  const { agentSlug, listingSlug } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching listing details for agentSlug: ${agentSlug}, listingSlug: ${listingSlug}`);

        // Get listings for this agent, including user_id
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select(`*`)
          .neq('status', 'hidden'); // Only fetch active listings

        if (listingsError) {
          console.error('Supabase error fetching listings:', listingsError);
          throw new Error('Error fetching listings');
        }
        if (!listings || listings.length === 0) {
          console.warn('No listings found.', { listings });
          throw new Error('No listings found');
        }
        console.log(`Successfully fetched ${listings.length} total listings.`);
        // console.log('Fetched listings data (all):', listings); // Too verbose to log all listings

        // Find the agent by slug first
        const { data: agentData, error: agentError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, career, phone_number, avatar_url, slug, status')
          .eq('slug', agentSlug)
          .eq('status', 'active')
          .maybeSingle();
        
        if (agentError) {
          console.error('Supabase error fetching agent by slug:', agentError);
          throw new Error('Error fetching agent profile');
        }
        if (!agentData) {
          console.warn(`Agent with slug ${agentSlug} not found or not approved.`);
          throw new Error('Agent not found');
        }
        console.log('Agent found:', agentData);

        // Filter listings by the found agent's ID
        const agentListings = listings.filter(l => l.user_id === agentData.id);
        if (agentListings.length === 0) {
          console.warn(`No listings found for agent ID ${agentData.id}.`);
          throw new Error('No listings found for this agent');
        }
        console.log(`Found ${agentListings.length} listings for agent ${agentData.id}.`);

        // Find the listing with matching slug from the agent's listings
        const matchingListing = agentListings.find(
          listing => {
            const generatedSlug = createListingSlug(listing.title);
            console.log(`Comparing fetched listing title: "${listing.title}" (generated slug: "${generatedSlug}") with URL slug: "${listingSlug}"`);
            return generatedSlug === listingSlug;
          }
        );

        if (!matchingListing) {
          console.warn(`No matching listing found for listingSlug: ${listingSlug} among agent's listings.`);
          throw new Error('Listing not found');
        }

        setListing(matchingListing);
        setAgent(agentData);
        console.log('Setting listing:', matchingListing);
        console.log('Setting agent:', agentData);

        // Handle agent slug verification and redirects (should be handled by initial agent fetch now)
        // if (agentData.slug && agentData.slug !== agentSlug) {
        //   console.warn(`Agent slug mismatch. Redirecting from ${agentSlug} to ${agentData.slug}`);
        //   navigate(`/${agentData.slug}/listing/${createListingSlug(matchingListing.title)}`, { replace: true });
        //   return;
        // }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Caught error in fetchListing:', err);
        setError(errorMessage);
        // Only navigate if an agentSlug exists to avoid infinite redirects on root
        if (agentSlug) {
          console.log(`Navigating back to agent profile due to error: ${errorMessage}`);
          navigate(`/${agentSlug}`, { replace: true });
        } else {
          console.log('Navigating to /not-found due to error and no agentSlug.');
          navigate('/not-found', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    if (agentSlug && listingSlug) {
      fetchListing();
    } else {
      console.warn('Missing agentSlug or listingSlug. Skipping fetchListing.', { agentSlug, listingSlug });
      setLoading(false);
      setError('Invalid URL for listing details.');
      navigate('/not-found', { replace: true });
    }
  }, [agentSlug, listingSlug, navigate]);

  const handleCopyLink = () => {
    const url = window.location.href;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
      
      document.body.removeChild(textarea);
    }
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareToTwitter = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this listing: ${listing?.title || ''}`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this listing: ${listing?.title || ''}\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(listing?.title || 'Check out this property');
    const summary = encodeURIComponent(listing?.description || '');
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${summary}`, '_blank', 'noopener,noreferrer');
  };

  const shareToTelegram = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this listing: ${listing?.title || ''}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-gold-500 mx-auto mb-4" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[var(--portal-text-secondary)] text-lg"
          >
            Loading property details...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error || !listing || !agent) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)]">
        <div className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Oops!</h2>
            <p className="text-[var(--portal-text-secondary)] mb-6">
              {error || 'This property listing could not be found.'}
            </p>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const pageTitle = `${listing.title} - Property Listing`;
  const pageDescription = listing.description 
    ? listing.description.substring(0, 160) 
    : `View details for this property listed by ${agent.first_name} ${agent.last_name}`;

  const contactOptions = [
    { 
      type: 'phone',
      label: 'Call Agent',
      icon: <Phone className="h-4 w-4 mr-2" />,
      href: `tel:${agent.phone_number}`,
      link: agent.phone_number,
    },
    { 
      type: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className="h-4 w-4 mr-2" />,
      href: listing.whatsapp_link,
      link: listing.whatsapp_link,
    },
    { 
      type: 'telegram',
      label: 'Telegram',
      icon: <Send className="h-4 w-4 mr-2" />,
      href: listing.telegram_link,
      link: listing.telegram_link,
    },
  ].filter(option => option.link);

  const shareUrl = window.location.href;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={listing.description?.slice(0, 155) || `View details for ${listing.title}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={listing.description?.slice(0, 155) || `View details for ${listing.title}`} />
        {listing.main_image_url && (
          <meta property="og:image" content={listing.main_image_url} />
        )}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      {/* MAIN CONTENT GRID (no hero/cover, no heading, no details card) */}
      <main className="container mx-auto px-4 md:px-10 py-12 relative z-10 max-w-7xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-[var(--portal-text-secondary)] hover:text-gold-500 mb-10 transition-colors group text-lg font-medium gap-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Listings
          </motion.button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left: Gallery and Description */}
            <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Gallery */}
              <ModernGallery images={[
                listing.main_image_url,
                ...(Array.isArray(listing.additional_image_urls) ? listing.additional_image_urls : [])
              ].filter(Boolean)} />
            {/* Description */}
            <Card className="bg-white/80 border-gray-200 rounded-2xl shadow-xl backdrop-blur-md mt-4">
                <CardHeader>
                <CardTitle className="text-2xl font-bold text-red-500 flex items-center gap-2">
                    <FileText className="h-6 w-6 mr-2" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-gold dark:prose-invert max-w-none text-lg break-words whitespace-pre-line">
                  {listing.description ? (
                    <p className="whitespace-pre-line leading-relaxed text-[var(--portal-text-secondary)]">{listing.description}</p>
                  ) : (
                    <p className="text-[var(--portal-text-secondary)] italic">No description provided for this listing.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          {/* Right: Property Details and Agent Card */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* Property Details Card */}
            <Card className="bg-white/80 border-gray-200 rounded-2xl shadow-xl backdrop-blur-md sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
                  <Tag className="h-5 w-5 mr-1 text-red-500" /> Property Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {listing.city && (
                    <div className="flex items-center gap-2 font-semibold text-gold-500"><MapPin className="h-5 w-5" />City: <span className="text-[var(--portal-text-secondary)]">{listing.city}</span></div>
                  )}
                  {listing.progress_status && (
                    <div className="flex items-center gap-2 font-semibold text-blue-500"><Home className="h-5 w-5" />Progress: <span className="text-[var(--portal-text-secondary)]">{listing.progress_status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></div>
                  )}
                  {listing.bank_option !== undefined && (
                    <div className="flex items-center gap-2 font-semibold text-green-600"><Banknote className="h-5 w-5" />Bank Option: <span className="text-[var(--portal-text-secondary)]">{listing.bank_option ? 'Available' : 'Not Available'}</span></div>
                  )}
                  {listing.down_payment_percent !== undefined && (
                    <div className="flex items-center gap-2 font-semibold text-gold-500"><DollarSign className="h-5 w-5" />Down Payment: <span className="text-[var(--portal-text-secondary)]">{listing.down_payment_percent}%</span></div>
                  )}
                  <div className="flex items-center gap-2 font-semibold text-gold-500"><Banknote className="h-5 w-5" />Price: <span className="text-[var(--portal-text-secondary)]">{listing.price === null || listing.price === undefined ? 'Call for price' : formatCurrency(listing.price)}</span></div>
                  <div className="flex items-center gap-2 font-semibold text-gold-500"><Calendar className="h-5 w-5" />Listed: <span className="text-[var(--portal-text-secondary)]">{formatDate(listing.created_at)}</span></div>
                </div>
              </CardContent>
            </Card>
            {/* Agent Card */}
            <Card className="bg-white/80 border-gray-200 rounded-2xl shadow-xl backdrop-blur-md mt-4">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
                  <Phone className="h-5 w-5 mr-1 text-red-500" /> Contact Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-black overflow-hidden border-2 border-gold-300 flex items-center justify-center">
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={`${agent.first_name} ${agent.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black text-white text-3xl font-bold">
                        {agent.first_name?.[0]}{agent.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-black">{agent.first_name} {agent.last_name}</h3>
                    {agent.career && (
                      <p className="text-sm text-black">{agent.career}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {agent.phone_number && (
                    <a
                      href={`tel:${agent.phone_number}`}
                      className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-md"
                    >
                      <Phone className="h-5 w-5" />
                      Call {agent.first_name}
                    </a>
                  )}
                  {agent.whatsapp_link && (
                    <a
                      href={agent.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-green-500/90 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold shadow-md"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </a>
                  )}
                  {agent.telegram_link && (
                    <a
                      href={agent.telegram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-blue-500/90 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold shadow-md"
                    >
                      <Send className="h-5 w-5" />
                      Telegram
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

const ModernGallery: React.FC<{ images: string[] }> = ({ images }) => {
  const [current, setCurrent] = React.useState(0);
  const [isZoomed, setIsZoomed] = React.useState(false);
  if (!images.length) return null;
  const goPrev = () => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const goNext = () => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  const showThumbs = images.length > 1;
  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <div className="relative aspect-[4/3] w-full max-h-80 sm:max-h-96 rounded-2xl overflow-hidden shadow-xl border border-gold-100 bg-white/70 backdrop-blur-md flex items-center justify-center group">
        <img
          key={images[current]}
          src={images[current]}
          alt={`Property image ${current + 1}`}
          className="object-contain w-full h-full transition-all duration-500 ease-in-out rounded-2xl cursor-pointer"
          style={{ opacity: 1 }}
          onClick={() => setIsZoomed(true)}
        />
        {/* Zoom button */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2 shadow-lg border border-gray-200 transition-all duration-200 opacity-0 group-hover:opacity-100 z-20"
          aria-label="Zoom image"
          type="button"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-gold-500 hover:text-white text-gold-700 rounded-full p-2 shadow-lg border border-gold-200 transition-colors z-10"
              aria-label="Previous image"
              type="button"
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-gold-500 hover:text-white text-gold-700 rounded-full p-2 shadow-lg border border-gold-200 transition-colors z-10"
              aria-label="Next image"
              type="button"
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>
      {showThumbs && (
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gold-200 scrollbar-track-transparent pb-1">
          {images.slice(0, 5).map((img, idx) => (
            <button
              key={img}
              onClick={() => setCurrent(idx)}
              className={`w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 ${current === idx ? 'border-gold-500 shadow-lg' : 'border-gold-100'} flex-shrink-0 focus:outline-none`}
              style={{ minWidth: 64, minHeight: 48 }}
              aria-label={`Show image ${idx + 1}`}
              type="button"
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            <img
              src={images[current]}
              alt={`Property image ${current + 1} - Full size`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Close button */}
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2 shadow-lg border border-gray-200 transition-all duration-200 z-10"
              aria-label="Close zoom"
              type="button"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Navigation in zoom mode */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-3 shadow-lg border border-gray-200 transition-all duration-200 z-10"
                  aria-label="Previous image"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-3 shadow-lg border border-gray-200 transition-all duration-200 z-10"
                  aria-label="Next image"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm font-medium shadow-lg border border-gray-200">
                {current + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetail;
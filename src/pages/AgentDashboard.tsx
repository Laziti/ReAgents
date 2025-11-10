import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import AgentSidebar from '@/components/agent/AgentSidebar';
import ListingTable from '@/components/agent/ListingTable';
import CreateListingForm from '@/components/agent/CreateListingForm';
import EditListingForm from '@/components/agent/EditListingForm';
import AccountInfo from '@/components/agent/AccountInfo';
import DashboardContent from '@/components/agent/DashboardContent';
import { Loader2, Plus, X, Building, Copy, Share2, Check, Rocket, Globe, Facebook, Twitter, Linkedin, MessageCircle, Send, Eye, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/styles/portal-theme.css';
import { createSlug } from '@/lib/formatters';
import UpgradeSidebar from '@/components/agent/UpgradeSidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { logger } from '@/lib/logger';

const AgentDashboard = () => {
  const { user, userStatus, signOut, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [currentListingId, setCurrentListingId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef(null);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const linkRef = useRef<HTMLInputElement>(null);
  const lastRefreshTime = useRef(0);
  const refreshCooldown = 10000; // 10 seconds cooldown between refreshes
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [isMobileSharePopoverOpen, setIsMobileSharePopoverOpen] = useState(false);

  const fetchListings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Only refresh session if enough time has passed since last refresh
      const now = Date.now();
      if (now - lastRefreshTime.current >= refreshCooldown) {
        try {
          await refreshSession();
          lastRefreshTime.current = now;
        } catch (error) {
          // If we hit rate limit, continue with current session
          if (error?.message?.includes('rate limit')) {
            logger.warn('Rate limit hit for session refresh, continuing with current session');
          } else {
            throw error;
          }
        }
      }
      
      // Force fresh data with no caching (include expires_at and views for agent portal)
      const { data, error } = await supabase
        .from('listings')
        .select('*, expires_at, views')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      logger.error('Error fetching listings:', error);
      // If we hit rate limit, show a user-friendly message
      if (error?.message?.includes('rate limit')) {
        // You might want to show this in the UI
        logger.warn('Please wait a moment before refreshing again');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to get user's public profile URL
  const getPublicProfileUrl = () => {
    if (!profileData) return '';
    
    // Use the slug if available, otherwise create one from name
    const profileSlug = profileData.slug || createSlug(`${profileData.first_name} ${profileData.last_name}`);
    
    // Get base URL without any path segments
    const url = new URL(window.location.href);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Return the complete URL with /agent/ prefix
    return `${baseUrl}/agent/${profileSlug}`;
  };

  // Helper function for clipboard operations
  const copyToClipboard = (text, successCallback) => {
    try {
      // Try modern approach first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(successCallback)
          .catch(err => {
            logger.log('Clipboard API failed, trying fallback', err);
            // Fallback for browsers that don't support the Clipboard API
            fallbackCopyToClipboard(text, successCallback);
          });
      } else {
        logger.log('Using fallback clipboard approach');
        // For non-secure contexts or older browsers
        fallbackCopyToClipboard(text, successCallback);
      }
    } catch (err) {
      logger.error('Copy operation failed completely', err);
    }
  };

  // Fallback clipboard method
  const fallbackCopyToClipboard = (text, successCallback) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Style to prevent scrolling to bottom
    textArea.style.position = 'fixed';
    textArea.style.left = '0';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', 'readonly');
    
    document.body.appendChild(textArea);
    
    // Special handling for iOS devices
    const range = document.createRange();
    range.selectNodeContents(textArea);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    textArea.setSelectionRange(0, 999999);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      successCallback();
    }
  };

  // Copy profile link to clipboard
  const copyProfileLink = () => {
    const link = getPublicProfileUrl();
    copyToClipboard(link, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Copy profile link from header button
  const copyProfileLinkFromHeader = () => {
    const link = getPublicProfileUrl();
    copyToClipboard(link, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareToSocial = (platform: string) => {
    const profileUrl = getPublicProfileUrl();
    const agentName = profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Real Estate Agent';
    const agentDescription = profileData?.career ? `${agentName} is a trusted real estate agent specializing in ${profileData.career}.` : `${agentName} is a trusted real estate agent specializing in finding the perfect properties for clients.`;
    const shareText = `Professional Real Estate Agent: ${agentName}\n\n${agentDescription}\n\nView properties: ${profileUrl}`;
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent('Professional Real Estate Agent')}&summary=${encodeURIComponent(shareText)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      default:
        return;
    }

    window.open(url, '_blank');
    setIsSharePopoverOpen(false);
    setIsMobileSharePopoverOpen(false);
  };

  useEffect(() => {
    // Ensure the user is approved
    if (userStatus && userStatus !== 'approved' && userStatus !== 'active') {
      navigate('/pending');
      return;
    }

    // Add keyboard shortcut for developers (Ctrl+Shift+W)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Fetch user profile and listings
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch user profile first
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          setProfileData(null);
          return;
        }
        // Only update profileData if it's actually different to prevent unnecessary re-renders
        setProfileData(prev => {
          if (JSON.stringify(prev) === JSON.stringify(profileData)) {
            return prev; // No change, return same reference
          }
          return profileData; // Different data, update
        });

        // Only fetch listings if we haven't recently fetched them
        const now = Date.now();
        if (now - lastRefreshTime.current >= refreshCooldown) {
          await fetchListings();
        }
      } catch (error) {
        logger.error('Error fetching data:', error);
        // If we hit rate limit, show a user-friendly message
        if (error?.message?.includes('rate limit')) {
          logger.warn('Please wait a moment before refreshing again');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, userStatus, navigate]);

  // Handle navigation to routes when tabs are clicked
  useEffect(() => {
    if (activeTab === 'create') {
      navigate('/agent/image-selection');
    } else if (activeTab === 'listings') {
      navigate('/agent/listings');
    } else if (activeTab === 'account') {
      navigate('/agent/account');
    } else if (activeTab === 'upgrade') {
      navigate('/agent/upgrade');
    }
    // Note: dashboard tab stays on /dashboard, no navigation needed
  }, [activeTab, navigate]);

  const handleEditListing = (listingId) => {
    setCurrentListingId(listingId);
    setActiveTab('edit');
  };
  
  const handleEditSuccess = () => {
    // Refresh listings
    setActiveTab('listings');
    // Refetch listings to get updated data
    fetchListings();
  };

  // Empty listings state
  const EmptyListingsState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-[var(--portal-bg-hover)] flex items-center justify-center mb-6">
        <Building className="h-10 w-10 text-[var(--portal-text-secondary)]" />
      </div>
      <h3 className="text-xl font-medium text-[var(--portal-text)] mb-2">No Listings Yet</h3>
      <p className="text-[var(--portal-text-secondary)] max-w-md mb-6">
        You haven't created any property listings yet. Create your first listing to showcase it to potential clients.
      </p>
      <Button 
        onClick={() => setActiveTab('create')} 
        className="bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-[var(--portal-button-text)] flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create New Listing
      </Button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--portal-bg)] overflow-hidden md:overflow-hidden">
      <AgentSidebar activeTab={activeTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:overflow-hidden min-h-0">
        {/* Professional Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'listings' && 'My Properties'}
                {activeTab === 'create' && 'Create New Listing'}
                {activeTab === 'edit' && 'Edit Listing'}
                {activeTab === 'account' && 'Account Information'}
                {activeTab === 'upgrade' && 'Upgrade to Pro'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Popover open={isSharePopoverOpen} onOpenChange={setIsSharePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-56 p-2 bg-white border-gray-200 shadow-lg rounded-lg z-[100]"
                  side="bottom"
                  align="end"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="grid gap-2">
                    <Button
                      variant="ghost"
                      className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                      onClick={() => {
                        copyProfileLinkFromHeader();
                        setIsSharePopoverOpen(false);
                      }}
                    >
                      {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Link Copied!' : 'Copy Link'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                      onClick={() => {
                        handleShareToSocial('whatsapp');
                        setIsSharePopoverOpen(false);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2 text-green-500" /> WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                      onClick={() => {
                        handleShareToSocial('telegram');
                        setIsSharePopoverOpen(false);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2 text-blue-500" /> Telegram
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => window.open(`/agent/${profileData?.slug || ''}`, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>

          {/* Mobile Header - Professional Design */}
          <div className="md:hidden">
            {/* Top Bar with User Info and Icons */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full overflow-hidden bg-red-100 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                  {profileData?.avatar_url ? (
                    <img 
                      src={profileData.avatar_url} 
                      alt={profileData.first_name || 'Profile'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-red-600 font-semibold text-sm">
                      {profileData?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  )}
                </div>
                
                {/* User Name and Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900 truncate">
                      {profileData?.first_name && profileData?.last_name
                        ? `${profileData.first_name} ${profileData.last_name}`
                        : user?.email?.split('@')[0] || 'Agent'}
                    </h2>
                    {/* PRO Badge if applicable */}
                    {profileData?.subscription_status === 'pro' && (
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {profileData?.career || 'Real Estate Agent'}
                  </p>
                </div>
              </div>

              {/* Action Icons - In one row */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Popover open={isMobileSharePopoverOpen} onOpenChange={setIsMobileSharePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-56 p-2 bg-white border-gray-200 shadow-lg rounded-lg z-[100]"
                    side="bottom"
                    align="end"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="grid gap-2">
                      <Button
                        variant="ghost"
                        className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                        onClick={() => {
                          copyProfileLinkFromHeader();
                          setIsMobileSharePopoverOpen(false);
                        }}
                      >
                        {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copied ? 'Link Copied!' : 'Copy Link'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                        onClick={() => {
                          handleShareToSocial('whatsapp');
                          setIsMobileSharePopoverOpen(false);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2 text-green-500" /> WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                        onClick={() => {
                          handleShareToSocial('telegram');
                          setIsMobileSharePopoverOpen(false);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2 text-blue-500" /> Telegram
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-600 hover:bg-gray-100"
                  onClick={() => window.open(`/agent/${profileData?.slug || ''}`, '_blank')}
                >
                  <Eye className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-600 hover:bg-gray-100"
                  onClick={() => setActiveTab('account')}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 md:pb-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
                </div>
          ) : (
            <>
              {/* Tab Content */}
              {activeTab === 'dashboard' && (
                <DashboardContent listings={listings} profile={profileData} />
              )}
              
              {activeTab === 'listings' && (
                listings.length > 0 ? (
                  <ListingTable 
                    listings={listings} 
                    onEdit={handleEditListing}
                  />
              ) : (
                  <EmptyListingsState />
                )
              )}
              
              {activeTab === 'create' && (
                <div className="text-center py-12">
                  <p className="text-[var(--portal-text-secondary)] mb-4">Redirecting to create listing...</p>
                </div>
              )}
              
              {activeTab === 'edit' && currentListingId && (
              <EditListingForm 
                listingId={currentListingId}
                onSuccess={handleEditSuccess}
                onCancel={() => setActiveTab('listings')}
              />
              )}
              
              {activeTab === 'account' && (
                <div className="grid grid-cols-1">
                  <AccountInfo listings={listings} profile={profileData} onRefresh={fetchListings} />
                </div>
              )}

              {activeTab === 'upgrade' && <UpgradeSidebar />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
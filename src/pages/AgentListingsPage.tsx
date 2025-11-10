import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AgentSidebar from '@/components/agent/AgentSidebar';
import ListingTable from '@/components/agent/ListingTable';
import EditListingForm from '@/components/agent/EditListingForm';
import { logger } from '@/lib/logger';
import { paginateQuery, getPaginationRange } from '@/lib/pagination';
import '@/styles/portal-theme.css';

const AgentListingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('listings');
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [currentListingId, setCurrentListingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Determine active tab based on current route
  useEffect(() => {
    if (location.pathname.includes('listings')) {
      setActiveTab('listings');
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!user) return;

      try {
        // Apply pagination
        const { from, to } = getPaginationRange(page, pageSize);
        const { data, error } = await supabase
          .from('listings')
          .select('*, expires_at, views')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        setListings(data || []);
      } catch (error) {
        logger.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [user, page]);

  const handleEditListing = (id: string) => {
    setCurrentListingId(id);
  };

  const handleEditSuccess = () => {
    setCurrentListingId(null);
    // Refresh listings
    const fetchListings = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('listings')
        .select('*, expires_at, views')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setListings(data);
      }
    };
    fetchListings();
  };

  const EmptyListingsState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-xl font-semibold text-[var(--portal-text)] mb-2">No listings found</h3>
      <p className="text-[var(--portal-text-secondary)] mb-6">You haven't created any listings yet.</p>
      <button
        onClick={() => navigate('/agent/image-selection')}
        className="px-6 py-3 bg-[var(--portal-accent)] text-white rounded-lg hover:bg-[var(--portal-accent)]/90 transition-colors"
      >
        Create New Listing
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--portal-bg)] overflow-hidden md:overflow-hidden">
      <AgentSidebar activeTab={activeTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 md:pb-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
            </div>
          ) : (
            <>
              {currentListingId ? (
                <EditListingForm 
                  listingId={currentListingId}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setCurrentListingId(null)}
                />
              ) : (
                listings.length > 0 ? (
                  <ListingTable 
                    listings={listings} 
                    onEdit={handleEditListing}
                  />
                ) : (
                  <EmptyListingsState />
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentListingsPage;


import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AgentSidebar from '@/components/agent/AgentSidebar';
import AccountInfo from '@/components/agent/AccountInfo';
import { logger } from '@/lib/logger';
import '@/styles/portal-theme.css';

const AgentAccountPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  // Determine active tab based on current route
  useEffect(() => {
    if (location.pathname.includes('account')) {
      setActiveTab('account');
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('*, expires_at, views')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (listingsError) throw listingsError;
        setListings(listingsData || []);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfileData(profile);
      } catch (error) {
        logger.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
            <div className="grid grid-cols-1">
              <AccountInfo listings={listings} profile={profileData} onRefresh={fetchListings} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentAccountPage;


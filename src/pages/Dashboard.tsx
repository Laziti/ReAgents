import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

const Dashboard: React.FC = () => {
  const { user, userStatus, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching profile:', error);
          setProfile(null);
        } else if (data) {
          setProfile(data);
        } else {
          // Profile doesn't exist yet, AuthContext will create it
          setProfile(null);
        }
      } catch (error) {
        logger.error('Error in fetchProfile:', error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Refresh profile when userStatus changes (after profile is created)
  useEffect(() => {
    if (userStatus === 'active' && !profile) {
      const refreshProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setProfile(data);
          }
        } catch (error) {
          logger.error('Error refreshing profile:', error);
        }
      };

      refreshProfile();
    }
  }, [userStatus, user, profile]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-gold-500" />
          <p className="text-[var(--portal-text-secondary)] animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }


  const getStatusIcon = (status: string) => {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusMessage = (status: string) => {
    return 'Your account is active and ready to use.';
  };

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--portal-text)] mb-2">Dashboard</h1>
          <p className="text-[var(--portal-text-secondary)]">Welcome back, {user.user_metadata?.first_name || 'User'}!</p>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(userStatus || 'unknown')}
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--portal-text-secondary)] mb-4">
                {getStatusMessage(userStatus || 'unknown')}
              </p>
              
              {profile?.slug && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-[var(--portal-text)] mb-2">Your Public Profile</h3>
                    <p className="text-sm text-[var(--portal-text-secondary)] mb-4">
                      Your professional profile is live and ready to share with clients.
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => navigate(`/agent/${profile.slug}`)}
                    className="w-full"
                  >
                    View Public Profile
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Profile Information */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--portal-text-secondary)]">Name</label>
                    <p className="text-[var(--portal-text)]">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--portal-text-secondary)]">Email</label>
                    <p className="text-[var(--portal-text)]">{user.email}</p>
                  </div>
                  {profile.phone_number && (
                    <div>
                      <label className="text-sm font-medium text-[var(--portal-text-secondary)]">Phone</label>
                      <p className="text-[var(--portal-text)]">{profile.phone_number}</p>
                    </div>
                  )}
                  {profile.company && (
                    <div>
                      <label className="text-sm font-medium text-[var(--portal-text-secondary)]">Company</label>
                      <p className="text-[var(--portal-text)]">{profile.company}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

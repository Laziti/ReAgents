import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, Home } from 'lucide-react';

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, userStatus } = useAuth();

  useEffect(() => {
    // If user is not logged in, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // If user is active, redirect to their profile
    if (userStatus === 'active') {
      // Fetch the user's profile to get their slug
      const fetchProfileAndRedirect = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('slug')
          .eq('id', user.id)
          .single();

        if (profile?.slug) {
          navigate(`/agent/${profile.slug}`);
        } else {
          navigate('/dashboard');
        }
      };

      fetchProfileAndRedirect();
    }
  }, [user, userStatus, navigate]);

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-[var(--portal-text)] mb-4">Account Pending Approval</h1>
        <p className="text-[var(--portal-text-secondary)] mb-8">
          Your account is currently pending approval from our administrators. 
          This process usually takes 24-48 hours. You'll be notified via email 
          once your account is approved.
        </p>
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;

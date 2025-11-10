import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Plus, User, List, LogOut, Menu, Building, LayoutDashboard, Crown, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import '@/styles/portal-theme.css';
import UpgradeSidebar from './UpgradeSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Logo from '/LogoBG.svg';


type AgentSidebarProps = {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  highlight?: boolean;
  notification?: boolean;
  notificationContent?: string;
};

const AgentSidebar = ({ activeTab, setActiveTab }: AgentSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  
  // Check if we're on the dashboard page (where tabs work) or standalone pages (where we need navigation)
  const isDashboardPage = location.pathname === '/dashboard';
  
  // Determine active tab based on current route
  const getActiveTabFromRoute = () => {
    if (location.pathname === '/dashboard') {
      return activeTab; // Use passed activeTab for dashboard
    }
    // For standalone pages, determine from route
    if (location.pathname.includes('image-selection') || location.pathname.includes('listing-details')) {
      return 'create';
    }
    if (location.pathname.includes('listings')) {
      return 'listings';
    }
    if (location.pathname.includes('account')) {
      return 'account';
    }
    if (location.pathname.includes('upgrade')) {
      return 'upgrade';
    }
    return activeTab;
  };
  
  const currentActiveTab = getActiveTabFromRoute();
  
  const [profile, setProfile] = React.useState<any>(null);
  const [paymentDueSoon, setPaymentDueSoon] = React.useState<boolean>(false);
  const [daysRemaining, setDaysRemaining] = React.useState<number | null>(null);

  // Returns a string like '1 year, 2 months, 5 days remaining' or '15 days remaining'
  const getTimeRemaining = (profile: any) => {
    if (!profile) return null;
    const endDateRaw = profile.subscription_details?.end_date || profile.subscription_end_date;
    if (!endDateRaw) return null;
    const endDate = new Date(endDateRaw);
    const today = new Date();
    // Use UTC for both
    let y1 = today.getUTCFullYear(), m1 = today.getUTCMonth(), d1 = today.getUTCDate();
    let y2 = endDate.getUTCFullYear(), m2 = endDate.getUTCMonth(), d2 = endDate.getUTCDate();
    let years = y2 - y1;
    let months = m2 - m1;
    let days = d2 - d1;
    if (days < 0) {
      months--;
      // Get days in previous month
      const prevMonth = new Date(y2, m2, 0);
      days += prevMonth.getUTCDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    // If expired
    if (years < 0 || (years === 0 && months === 0 && days < 0)) return 'Expired';
    let parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0 || (years === 0 && months === 0 && days === 0)) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') + ' remaining' : 'Expired';
  };

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && profile) {
        setProfile(profile);
        
        // Check subscription status and end date
        const endDate = profile.subscription_end_date || profile.subscription_details?.end_date;
        if (endDate && profile.subscription_status === 'pro') {
          // Only set paymentDueSoon if the subscription is expiring within 7 days, based on the AccountInfo logic
          const paymentDate = new Date(endDate);
          const today = new Date();
          const utc1 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
          const utc2 = Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), paymentDate.getUTCDate());
          const diffDays = Math.ceil((utc2 - utc1) / (1000 * 60 * 60 * 24));
          setPaymentDueSoon(diffDays >= 0 && diffDays <= 7);
          // daysRemaining will be handled by getTimeRemaining in render
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Navigation handler - always navigate to routes
  // Memoize to prevent unnecessary re-renders
  const handleNavigation = useCallback((tabId: string) => {
    switch (tabId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'listings':
        navigate('/agent/listings');
        break;
      case 'create':
        navigate('/agent/image-selection');
        break;
      case 'account':
        navigate('/agent/account');
        break;
      case 'upgrade':
        navigate('/agent/upgrade');
        break;
      default:
        navigate('/dashboard');
    }
  }, [navigate]);

  // Extract subscription status as a stable value to prevent unnecessary recalculations
  // This ensures menu items only recalculate when subscription status actually changes
  const subscriptionStatus = profile?.subscription_status || null;
  const isProfileLoaded = profile !== null;
  const timeRemaining = useMemo(() => {
    return profile ? getTimeRemaining(profile) : null;
  }, [profile?.subscription_details?.end_date, profile?.subscription_end_date]);

  // Memoize menu items to prevent unnecessary re-renders and flickering
  // Only recalculate when subscription status or payment due status changes
  // Key fix: Use subscriptionStatus as a string dependency, not the entire profile object
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: <LayoutDashboard className="h-5 w-5" />,
        action: () => handleNavigation('dashboard')
      },
      { 
        id: 'listings', 
        label: 'My Listings', 
        icon: <List className="h-5 w-5" />,
        action: () => handleNavigation('listings')
      },
      { 
        id: 'create', 
        label: 'Create New', 
        icon: <Plus className="h-5 w-5" />,
        action: () => handleNavigation('create')
      },
      { 
        id: 'account', 
        label: 'Account Info', 
        icon: <User className="h-5 w-5" />,
        action: () => handleNavigation('account'),
        notification: paymentDueSoon,
        notificationContent: subscriptionStatus === 'pro' && timeRemaining && timeRemaining !== 'Expired'
          ? `Payment due: ${timeRemaining}`
          : subscriptionStatus === 'pro' && timeRemaining === 'Expired'
          ? 'Subscription Expired' : undefined
      }
    ];

    // Only add upgrade menu item if:
    // 1. Profile is loaded (isProfileLoaded) - prevents showing upgrade while loading
    // 2. User is NOT pro (subscriptionStatus !== 'pro') - pro users never see upgrade button
    // This prevents the upgrade button from flickering when clicking menu items
    // For pro users: subscriptionStatus === 'pro', so upgrade will NEVER be added
    // For free users: subscriptionStatus will be null, undefined, or 'free', so upgrade will be added
    const shouldShowUpgrade = isProfileLoaded && subscriptionStatus !== 'pro';
    
    if (shouldShowUpgrade) {
      items.push({ 
        id: 'upgrade', 
        label: 'Upgrade to Pro', 
        icon: <Crown className="h-5 w-5" />,
        action: () => handleNavigation('upgrade'),
        highlight: true
      });
    }

    return items;
  }, [subscriptionStatus, isProfileLoaded, paymentDueSoon, timeRemaining, handleNavigation]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full portal-sidebar">
      <div className="p-5 border-b border-[var(--portal-border)]">
        <div className="p-4 rounded-xl bg-[var(--portal-card-bg)] border border-[var(--portal-border)]">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] flex items-center justify-center font-semibold">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{profile?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}</span>
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate text-[var(--portal-text)]">
                  {profile?.first_name 
                    ? `${profile.first_name} ${profile.last_name}`
                    : user?.email}
                </p>
                {profile?.subscription_status === 'pro' && (
                  <span className="bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] text-xs font-semibold px-2 py-0.5 rounded-full border border-[var(--portal-accent)]/20 whitespace-nowrap">
                    PRO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-[var(--portal-accent)]">Agent</p>
                {profile?.subscription_status === 'pro' && getTimeRemaining(profile) && (
                  <span className="text-xs text-[var(--portal-text-secondary)]">
                    • {getTimeRemaining(profile)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          {menuItems.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentActiveTab === item.id 
                    ? 'bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] font-medium' 
                    : item.highlight
                    ? 'text-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/10'
                    : 'text-[var(--portal-text-secondary)] hover:bg-[var(--portal-bg-hover)]'
                }`}
                onClick={item.action}
              >
                <div className={`p-1.5 rounded-md ${
                  currentActiveTab === item.id 
                    ? 'bg-[var(--portal-accent)] text-white' 
                    : item.highlight
                    ? 'bg-[var(--portal-accent)]/20'
                    : 'bg-[var(--portal-card-bg)]'
                }`}>
                  {item.icon}
                </div>
                <span className="flex-1">{item.label}</span>
                {item.notification && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.notificationContent}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </motion.div>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-5 border-t border-[var(--portal-border)]">
        <Button
          variant="outline"
          className="w-full justify-start text-left border-[var(--portal-accent)] text-white bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)] focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white mb-4"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
        
        <div className="flex items-center justify-center h-28 w-full border-t border-[var(--portal-border)] pt-4">
          <img src={Logo} alt="Agent Portal Logo" className="h-full w-full object-contain" />
        </div>
      </div>
    </div>
  );

  // Mobile bottom navigation - improved for better usability
  // Memoize mobile menu items to prevent flickering
  const mobileMenuItems = useMemo(() => {
    return menuItems.map(item => ({
      ...item,
      label:
        item.id === 'dashboard' ? 'Home' :
        item.id === 'listings' ? 'Listings' :
        item.id === 'create' ? 'Add' :
        item.id === 'account' ? 'Account' :
        item.id === 'upgrade' ? 'Pro' :
        item.label
    }));
  }, [menuItems]);

  const MobileNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--portal-sidebar-bg)] border-t border-[var(--portal-border)] py-2 px-4 md:hidden z-50">
      <div className="flex justify-around items-center">
        {mobileMenuItems.map((item, idx) => (
          <button
            key={item.id}
            className={`flex flex-col items-center p-2 rounded-lg transition-all ${
              currentActiveTab === item.id ? 'text-[var(--portal-accent)]' : 'text-[var(--portal-text-secondary)]'
            }`}
            onClick={item.action}
          >
            <div className={`p-1.5 rounded-lg ${currentActiveTab === item.id ? 'bg-[var(--portal-accent)]/20' : ''} relative`}>
              {item.icon}
              {item.notification && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-[var(--portal-sidebar-bg)]"></span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-72 h-screen flex-shrink-0 overflow-auto portal-sidebar hidden md:block">
        <SidebarContent />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </>
  );
};

export default AgentSidebar;

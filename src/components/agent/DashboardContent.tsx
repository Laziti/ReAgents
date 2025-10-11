import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building,
  TrendingUp,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardContent = ({ listings, profile }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0
  });
  const [listingsByMonth, setListingsByMonth] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    const calculateStats = async () => {
      if (!listings || !user) return;
      
      try {
        setLoading(true);
        
        // Calculate stats from listings
        const activeListings = listings.filter(listing => listing.status === 'active');
        
        // Calculate monthly listings
        const monthly = calculateMonthlyListings(listings);
        
        setStats({
          totalListings: listings.length,
          activeListings: activeListings.length
        });
        
        setListingsByMonth(monthly);
        setLoading(false);
      } catch (error) {
        console.error('Error calculating stats:', error);
        setLoading(false);
      }
    };
    
    calculateStats();
  }, [listings, user]);

  // Function to calculate monthly listings
  const calculateMonthlyListings = (listings) => {
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Initialize data for all months
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthlyData = months.map((month, index) => {
      return {
        month,
        shortMonth: month.substring(0, 3),
        count: 0,
        percentChange: 0
      };
    });
    
    // Count listings by month
    listings.forEach(listing => {
      const createdDate = new Date(listing.created_at);
      if (createdDate.getFullYear() === currentYear) {
        const month = createdDate.getMonth();
        monthlyData[month].count++;
      }
    });
    
    // Calculate percentage changes
    for (let i = 1; i < monthlyData.length; i++) {
      const prevCount = monthlyData[i-1].count;
      const currentCount = monthlyData[i].count;
      
      if (prevCount > 0) {
        monthlyData[i].percentChange = Math.round(((currentCount - prevCount) / prevCount) * 100);
      } else if (currentCount > 0) {
        monthlyData[i].percentChange = 100;
      }
    }
    
    return monthlyData;
  };

  const getMaxListings = () => Math.max(...listingsByMonth.map(m => m.count), 1);
  const getCurrentMonth = () => new Date().getMonth();

  // Helper: Get number of listings created this week
  const getListingsThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0,0,0,0);
    return listings.filter(l => {
      const created = new Date(l.created_at);
      return created >= startOfWeek && created <= now;
    }).length;
  };
  // Helper: Get percentage change vs last week
  const getListingsThisWeekChange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const thisWeek = listings.filter(l => {
      const created = new Date(l.created_at);
      return created >= startOfWeek && created <= now;
    }).length;
    const lastWeek = listings.filter(l => {
      const created = new Date(l.created_at);
      return created >= startOfLastWeek && created <= endOfLastWeek;
    }).length;
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-8 w-40 mb-4" />
              <Skeleton className="h-10 w-28 mb-2" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-8 w-40 mb-4" />
          <Skeleton className="h-[300px] w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message - Hidden on mobile */}
      <div className="bg-[var(--portal-card-bg)] p-6 rounded-xl border border-[var(--portal-border)] shadow-sm hidden md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--portal-text)]">
            Welcome back, {profile?.first_name || user?.email?.split('@')[0] || 'Agent'}!
          </h2>
          <p className="text-[var(--portal-text-secondary)] mt-1">
            Here's an overview of your property listings
          </p>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Listings */}
        <Card className="p-6 border border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--portal-text-secondary)] text-sm font-medium mb-1">Total Listings</p>
              <h3 className="text-3xl font-bold text-[var(--portal-text)]">{stats.totalListings}</h3>
            </div>
            <div className="p-3 bg-[var(--portal-accent)]/10 rounded-lg">
              <Building className="h-6 w-6 text-[var(--portal-accent)]" />
            </div>
          </div>
        </Card>
        
        {/* Active Listings */}
        <Card className="p-6 border border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[var(--portal-text-secondary)] text-sm font-medium mb-1">Active Listings</p>
              <h3 className="text-3xl font-bold text-[var(--portal-text)]">{stats.activeListings}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Monthly Listings Overview */}
      <Card className="p-6 border border-[var(--portal-border)] bg-gradient-to-br from-white to-gray-50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--portal-accent)]/80 to-[var(--portal-accent)] mr-3">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--portal-text)]">
                Monthly Listings Overview
              </h3>
              <p className="text-sm text-[var(--portal-text-secondary)]">
                {new Date().getFullYear()} Performance
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Monthly Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {listingsByMonth.map((data, index) => {
            const isCurrentMonth = index === getCurrentMonth();
            const maxListings = getMaxListings();
            const heightPercent = maxListings > 0 ? (data.count / maxListings) * 100 : 0;
            
            return (
              <motion.div
                key={data.month}
                className={`relative cursor-pointer rounded-lg border ${
                  selectedMonth === index 
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/5' 
                    : isCurrentMonth
                    ? 'border-[var(--portal-accent)]/50 bg-[var(--portal-accent)]/5'
                    : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/30'
                }`}
                onClick={() => setSelectedMonth(selectedMonth === index ? null : index)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-[var(--portal-text)]">
                      {data.shortMonth}
                    </span>
                    {data.percentChange !== 0 && (
                      <div className={`flex items-center text-xs ${
                        data.percentChange > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {data.percentChange > 0 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        <span className="ml-0.5">{Math.abs(data.percentChange)}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold text-[var(--portal-text)] mb-2">
                    {data.count}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1 w-full bg-[var(--portal-border)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[var(--portal-accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${heightPercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {/* Useful analytics below months listing */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 p-5 rounded-xl border border-red-500 bg-white shadow text-center">
            <div className="text-lg font-semibold text-red-600 mb-1">New Listings This Week</div>
            <div className="text-3xl font-bold text-black mb-2">{getListingsThisWeek()}</div>
            <div className="flex items-center justify-center gap-2 text-sm">
              {getListingsThisWeekChange() >= 0 ? (
                <span className="text-green-600 font-semibold">+{getListingsThisWeekChange()}%</span>
              ) : (
                <span className="text-red-600 font-semibold">{getListingsThisWeekChange()}%</span>
              )}
              <span className="text-gray-500">vs last week</span>
            </div>
          </div>
        </div>

        {/* Selected Month Details */}
        <AnimatePresence>
          {selectedMonth !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 p-4 bg-[var(--portal-accent)]/5 rounded-lg border border-[var(--portal-accent)]/20"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-[var(--portal-text)]">
                    {listingsByMonth[selectedMonth].month} {new Date().getFullYear()}
                  </h4>
                  <p className="text-sm text-[var(--portal-text-secondary)]">
                    {listingsByMonth[selectedMonth].count} listing{listingsByMonth[selectedMonth].count !== 1 ? 's' : ''} created
                  </p>
                </div>
                {listingsByMonth[selectedMonth].percentChange !== 0 && (
                  <div className="flex items-center bg-white/50 rounded-lg px-4 py-2">
                    <span className={`text-sm font-semibold ${
                      listingsByMonth[selectedMonth].percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {listingsByMonth[selectedMonth].percentChange >= 0 ? '+' : ''}
                      {listingsByMonth[selectedMonth].percentChange}%
                    </span>
                    <span className="text-[var(--portal-text-secondary)] text-sm ml-2">
                      vs previous month
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Support Contact */}
      <Card className="p-6 border border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[var(--portal-text)] mb-2">
            Need Support?
          </h3>
          <p className="text-[var(--portal-text-secondary)] mb-4">
            If you need help with anything, contact us on Telegram
          </p>
          <a
            href="https://t.me/EthiopianReAgents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            @EthiopianReAgents
          </a>
        </div>
      </Card>
    </div>
  );
};

export default DashboardContent; 
import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Input as FormInput } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import UserEditModal from '@/components/admin/UserEditModal';
import UserDetailsModal from '@/components/admin/UserDetailsModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Crown, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { batchFetchProfiles, batchFetchListingCounts } from '@/lib/query-optimization';
import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber } from '@/lib/sanitize';
import { paginateQuery, getPaginationRange } from '@/lib/pagination';

type ListingLimitType = 'day' | 'week' | 'month' | 'year' | 'unlimited';
type SubscriptionStatus = 'free' | 'pro';

interface ListingLimit {
  type: ListingLimitType;
  value?: number;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  status: 'active' | 'inactive';
  career?: string;
  created_at: string;
  listing_count: number;
  subscription_status: SubscriptionStatus;
  subscription_end?: string;
  listing_limit?: ListingLimit;
  social_links?: Record<string, string>;
}

type LimitFormValues = {
  type: ListingLimitType;
  value?: number;
};

type FilterOptions = {
  status: 'all' | 'active' | 'inactive';
};

interface UserStats {
  freeUsers: number;
  proUsers: number;
  recentUsers: User[];
}

type NewUser = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  subscription_status: 'free' | 'pro';
  subscription_duration: 'monthly' | '6months' | 'yearly';
  listing_limit: {
    type: 'day' | 'week' | 'month' | 'year' | 'unlimited';
    value?: number;
  };
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all' });
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    freeUsers: 0,
    proUsers: 0,
    recentUsers: []
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    subscription_status: 'free',
    subscription_duration: 'monthly',
    listing_limit: {
      type: 'month',
      value: 10
    }
  });
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  const form = useForm<LimitFormValues>({
    defaultValues: {
      type: 'month',
      value: 5
    }
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      logger.log('Fetching profiles...');
      // Use batch fetching for optimization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      logger.log('Profiles data:', profiles);
      logger.log('Profiles error:', profilesError);
      if (profilesError) {
        logger.error('Profiles fetch error:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        logger.warn('No profiles found');
        setUsers([]);
        return;
      }

      logger.log('Fetching auth users data...');
      const { data: authUsersData, error: authUsersError } = await supabase
        .rpc('get_auth_users_data');

      logger.log('Auth users data:', authUsersData);
      logger.log('Auth users error:', authUsersError);
      if (authUsersError) {
        logger.error('Auth users fetch error:', authUsersError);
        throw authUsersError;
      }

      if (!authUsersData || authUsersData.length === 0) {
        logger.warn('No auth users data found');
        setUsers([]);
        return;
      }

      logger.log('Fetching listing counts...');
      // Use batch fetching for optimization
      const userIds = profiles.map(p => p.id);
      const listingCountsMap = await batchFetchListingCounts(supabase, userIds);

      logger.log('Listing counts:', listingCountsMap);

      const usersData = profiles.map(profile => {
        const authUser = authUsersData.find((user: any) => user.id === profile.id);
        const listingCount = listingCountsMap.get(profile.id) || 0;
        
        let listingLimit: ListingLimit | undefined;
        if (profile.listing_limit) {
          let type = profile.listing_limit.type as ListingLimitType;
          // Fix 'monthly' type to 'month' for backward compatibility
          if (type === 'monthly') {
            type = 'month';
          }
          if (type === 'unlimited') {
            listingLimit = { type };
          } else if (type && ['day', 'week', 'month', 'year'].includes(type)) {
            listingLimit = {
              type,
              value: profile.listing_limit.value
            };
          }
        } else if (profile.subscription_details && profile.subscription_details.listings_per_month) {
          // If listing_limit is null but subscription_details has listings_per_month, use that
          listingLimit = {
            type: 'month',
            value: profile.subscription_details.listings_per_month
          };
        }

        const normalizedStatus: 'active' | 'inactive' = profile.status === 'inactive' ? 'inactive' : 'active';

        return {
          id: profile.id,
          email: authUser?.email || 'No email found',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone_number: profile.phone_number || '',
          status: normalizedStatus,
          created_at: profile.created_at || new Date().toISOString(),
          career: profile.career || '',
          listing_count: listingCount,
          listing_limit: listingLimit,
          subscription_status: (profile.subscription_status || 'free') as SubscriptionStatus,
          subscription_end: profile.subscription_end,
          social_links: profile.social_links || {}
        };
      });

      logger.log('Processed users data:', usersData);
      setUsers(usersData);
      // Initial filter - will be updated by applyFilters
      setFilteredUsers(usersData);
    } catch (error) {
      logger.error('Error fetching users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (userList: User[], search: string, filterOptions: FilterOptions) => {
    // Sort by created_at descending (most recent first)
    let filtered = [...userList].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    // Apply status filter
    if (filterOptions.status !== 'all') {
      filtered = filtered.filter(user => user.status === filterOptions.status);
    }
    
    // Apply search
    if (search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        user => 
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower) || 
          user.phone_number?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination
    const { from, to } = getPaginationRange(page, pageSize);
    const paginated = filtered.slice(from, to + 1);
    
    setFilteredUsers(paginated);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters(users, searchTerm, filters);
  }, [searchTerm, filters, page]);

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    try {
      // Delete the profiles entry
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);
        
      if (profileError) throw profileError;
      
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);
        
      if (roleError) throw roleError;
      
      fetchUsers();
    } catch (error: any) {
      // No toast notification
    } finally {
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleLimitSubmit = async (values: LimitFormValues) => {
    if (!selectedUser) return;
    
    try {
      const limitData = values.type === 'unlimited' 
        ? { type: 'unlimited' } 
        : { type: values.type, value: values.value };
      
      const { error } = await supabase
        .from('profiles')
        .update({ listing_limit: limitData })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      fetchUsers();
    } catch (error: any) {
      // No toast notification
    } finally {
      setLimitDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const openLimitDialog = (user: User) => {
    setSelectedUser(user);
    
    // Set form default values based on user's current limit
    if (user.listing_limit) {
      form.reset({
        type: user.listing_limit.type || 'month',
        value: user.listing_limit.value || 10
      });
    } else {
      form.reset({ type: 'month', value: 10 });
    }
    
    setLimitDialogOpen(true);
  };

  const renderLimitBadge = (limit?: ListingLimit): React.ReactNode => {
    if (!limit) return <span className="text-red-600 font-semibold">Default (10/month)</span>;
    if (limit.type === 'unlimited') {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Unlimited</Badge>;
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
        {limit.value}/{limit.type}
      </Badge>
    );
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (user: User) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setFilters(prev => ({ ...prev, status }));
    setFilterMenuOpen(false);
  };

  const clearFilters = () => {
    setFilters({ status: 'all' });
    setSearchTerm('');
  };

  const fetchUserStats = async () => {
    try {
      // Fetch free users count
      const { count: freeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'free')
        .eq('role', 'agent');

      // Fetch pro users count
      const { count: proCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'pro')
        .eq('role', 'agent');

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        freeUsers: freeCount || 0,
        proUsers: proCount || 0,
        recentUsers: recentUsers || []
      });
      setLoading(false);
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Create user using Supabase Functions client
      const { data: userData, error: createError } = await supabase.functions.invoke(
        'create-user',
        {
          body: {
            email: newUser.email,
            password: newUser.password,
            user_metadata: {
              first_name: newUser.first_name,
              last_name: newUser.last_name,
              role: 'agent',
              created_by_admin: true
            }
          }
        }
      );

      if (createError) {
        throw createError;
      }

      if (!userData?.user?.id) {
        throw new Error('No user returned from user creation');
      }
      
      // The Edge Function now handles profile and role creation
      // We just need to update the profile with additional details if needed
      const userId = userData.user.id;

      // Update profile with subscription details and slug if needed
      const updateData: any = {};
      
      // Add subscription details if pro
      if (newUser.subscription_status === 'pro') {
        const now = new Date();
        let subscription_end = null;
        switch (newUser.subscription_duration) {
          case 'monthly':
            subscription_end = new Date(now.setMonth(now.getMonth() + 1));
            break;
          case '6months':
            subscription_end = new Date(now.setMonth(now.getMonth() + 6));
            break;
          case 'yearly':
            subscription_end = new Date(now.setFullYear(now.getFullYear() + 1));
            break;
        }
        
        updateData.subscription_status = 'pro';
        updateData.subscription_end_date = subscription_end?.toISOString();
      }
      
      // Add listing limit if different from default
      if (newUser.listing_limit.type !== 'month' || newUser.listing_limit.value !== 10) {
        updateData.listing_limit = newUser.listing_limit.type === 'unlimited' 
          ? { type: 'unlimited' as const }
          : { 
              type: newUser.listing_limit.type as ListingLimitType, 
              value: newUser.listing_limit.value 
            };
      }
      
      // Generate and add slug
      const baseSlug = `${newUser.first_name}-${newUser.last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug;
      let slugUnique = false;
      let attempt = 1;
      while (!slugUnique) {
        const { data: existing, error: slugError } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug', slug);
        if (slugError) {
          logger.error('Slug check error:', slugError);
          throw slugError;
        }
        if (!existing || existing.length === 0) {
          slugUnique = true;
        } else {
          attempt++;
          slug = `${baseSlug}-${attempt}`;
        }
      }
      updateData.slug = slug;
      
      // Update profile if we have additional data
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
        if (updateError) {
          logger.error('Profile update error:', updateError);
          throw updateError;
        }
      }
      toast.success('User created successfully');
      setCreateDialogOpen(false);
      fetchUsers(); // Refresh user list
      // Reset form
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        subscription_status: 'free',
        subscription_duration: 'monthly', // always use 'monthly' for UI state
        listing_limit: {
          type: 'month',
          value: 5
        }
      });
    } catch (error: any) {
      logger.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const response = await fetch("https://wixmnvdmcnlbiyxnfpfc.functions.supabase.co/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      setShowDeleteSuccess(true);
      setDetailsDialogOpen(false);
    } catch (error: any) {
      toast.error("Error deleting user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="h-screen w-full overflow-hidden">
        <div className="flex h-full w-full">
          <AdminSidebar />
          <SidebarInset className="w-full md:ml-72">
            <div className="bg-white h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b p-2 sm:p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center min-w-0 flex-1">
                  <h1 className="ml-0 md:ml-0 text-base sm:text-lg md:text-xl font-semibold text-black truncate">User Management</h1>
                </div>
              </div>
              <div className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-6">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <SearchInput
                      placeholder="Search users"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white text-sm sm:text-base"
                    />
                  </div>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap flex-shrink-0 w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4">
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Create User</span>
                        <span className="sm:hidden">Create</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                      <DialogHeader>
                        <DialogTitle className="text-black text-lg sm:text-xl">Create New User</DialogTitle>
                        <DialogDescription className="text-black text-sm sm:text-base">
                          Create a new agent account with subscription details.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="first_name" className="text-black text-sm sm:text-base">First Name</Label>
                            <Input
                              id="first_name"
                              value={newUser.first_name}
                              onChange={(e) => setNewUser(prev => ({ ...prev, first_name: sanitizeInput(e.target.value) }))}
                              className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10"
                            />
                          </div>
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="last_name" className="text-black text-sm sm:text-base">Last Name</Label>
                            <Input
                              id="last_name"
                              value={newUser.last_name}
                              onChange={(e) => setNewUser(prev => ({ ...prev, last_name: sanitizeInput(e.target.value) }))}
                              className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="email" className="text-black text-sm sm:text-base">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser(prev => ({ ...prev, email: sanitizeEmail(e.target.value) }))}
                            className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="password" className="text-black text-sm sm:text-base">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="subscription" className="text-black text-sm sm:text-base">Subscription Type</Label>
                            <Select
                              value={newUser.subscription_status}
                              onValueChange={(value: 'free' | 'pro') => setNewUser(prev => ({ ...prev, subscription_status: value }))}
                            >
                              <SelectTrigger className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10">
                                <SelectValue placeholder="Select subscription type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newUser.subscription_status === 'pro' && (
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label htmlFor="duration" className="text-black text-sm sm:text-base">Subscription Duration</Label>
                              <Select
                                value={newUser.subscription_duration}
                                onValueChange={(value: 'monthly' | '6months' | 'yearly') => setNewUser(prev => ({ ...prev, subscription_duration: value }))}
                              >
                                <SelectTrigger className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monthly">1 Month</SelectItem>
                                  <SelectItem value="6months">6 Months</SelectItem>
                                  <SelectItem value="yearly">1 Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label htmlFor="limit_type" className="text-black text-sm sm:text-base">Listing Limit Type</Label>
                            <Select
                              value={newUser.listing_limit.type}
                              onValueChange={(value: 'day' | 'week' | 'month' | 'year' | 'unlimited') => 
                                setNewUser(prev => ({
                                  ...prev,
                                  listing_limit: {
                                    ...prev.listing_limit,
                                    type: value,
                                    value: value === 'unlimited' ? undefined : (prev.listing_limit.value || 10)
                                  }
                                }))
                              }
                            >
                              <SelectTrigger className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10">
                                <SelectValue placeholder="Select limit type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="day">Per Day</SelectItem>
                                <SelectItem value="week">Per Week</SelectItem>
                                <SelectItem value="month">Per Month</SelectItem>
                                <SelectItem value="year">Per Year</SelectItem>
                                <SelectItem value="unlimited">Unlimited</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newUser.listing_limit.type !== 'unlimited' && (
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label htmlFor="limit_value" className="text-black text-sm sm:text-base">Listing Limit Value</Label>
                              <Input
                                id="limit_value"
                                type="number"
                                min="1"
                                value={newUser.listing_limit.value}
                                onChange={(e) => setNewUser(prev => ({
                                  ...prev,
                                  listing_limit: {
                                    ...prev.listing_limit,
                                    value: parseInt(e.target.value) || 10
                                  }
                                }))}
                                className="bg-white text-black focus:border-red-600 text-sm sm:text-base h-9 sm:h-10"
                              />
                            </div>
                          )}
                        </div>
                        <Button 
                          className="w-full mt-3 sm:mt-4 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base h-9 sm:h-10" 
                          onClick={handleCreateUser}
                          disabled={!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name}
                        >
                          Create User
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* User Categories */}
                <div className="grid gap-3 sm:gap-4 md:gap-6">
                  {/* Pro Users */}
                  <Card className="border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
                    <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--portal-accent)]" />
                        <CardTitle className="text-black text-base sm:text-lg md:text-xl">Pro Users</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
                      <div className="rounded-md border overflow-hidden w-full">
                        <div className="table-scroll-container w-full overflow-x-scroll overflow-y-scroll max-h-[300px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px]" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'auto', msOverflowStyle: 'scrollbar' }}>
                          <table className="divide-y divide-gray-200 border-collapse" style={{ minWidth: '800px' }}>
                              <thead className="sticky top-0 bg-white z-20 shadow-sm">
                                <tr>
                                  <th scope="col" className="sticky left-0 bg-white z-30 h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[100px] sm:min-w-[120px] whitespace-nowrap text-xs sm:text-sm border-r border-gray-200">Name</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[150px] sm:min-w-[180px] md:min-w-[200px] whitespace-nowrap text-xs sm:text-sm">Email</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[80px] sm:min-w-[100px] whitespace-nowrap text-xs sm:text-sm">Status</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[120px] sm:min-w-[140px] whitespace-nowrap text-xs sm:text-sm">Listing Limit</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[160px] sm:min-w-[180px] md:min-w-[200px] whitespace-nowrap text-xs sm:text-sm">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                  <tr>
                                    <td colSpan={5} className="sticky left-0 bg-white px-2 sm:px-3 md:px-4 py-4 text-center align-middle text-[var(--portal-text)]">
                                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--portal-accent)]" />
                                    </td>
                                  </tr>
                                ) : filteredUsers.filter(user => user.subscription_status === 'pro').length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="sticky left-0 bg-white px-2 sm:px-3 md:px-4 py-4 text-center text-muted-foreground align-middle text-[var(--portal-text)]">
                                      No pro users found
                                    </td>
                                  </tr>
                                ) : (
                                  filteredUsers
                                    .filter(user => user.subscription_status === 'pro')
                                    .sort((a, b) => {
                                      const dateA = new Date(a.created_at).getTime();
                                      const dateB = new Date(b.created_at).getTime();
                                      return dateB - dateA; // Descending order (newest first)
                                    })
                                    .map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-gray-50 even:bg-white">
                                      <td className="sticky left-0 bg-white z-10 px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)] border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                                        <span className="block text-black text-xs sm:text-sm font-medium">{user.first_name} {user.last_name}</span>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="text-black text-xs sm:text-sm truncate" title={user.email}>{user.email}</div>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <Badge 
                                          variant={user.status === 'active' ? 'outline' : 'secondary'} 
                                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                        >
                                          {user.status}
                                        </Badge>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="whitespace-nowrap text-xs sm:text-sm">{renderLimitBadge(user.listing_limit)}</div>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-white border-[var(--portal-accent)] bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0"
                                            onClick={() => openDetailsDialog(user)}
                                          >
                                            Details
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-white border-[var(--portal-accent)] bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0"
                                            onClick={() => openEditDialog(user)}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                              )}
                              </tbody>
                            </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Free Users */}
                  <Card className="border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
                    <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--portal-accent)]" />
                        <CardTitle className="text-black text-base sm:text-lg md:text-xl">Free Users</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6">
                      <div className="rounded-md border overflow-hidden w-full">
                        <div className="table-scroll-container w-full overflow-x-scroll overflow-y-scroll max-h-[300px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px]" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'auto', msOverflowStyle: 'scrollbar' }}>
                          <table className="divide-y divide-gray-200 border-collapse" style={{ minWidth: '800px' }}>
                              <thead className="sticky top-0 bg-white z-20 shadow-sm">
                                <tr>
                                  <th scope="col" className="sticky left-0 bg-white z-30 h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[100px] sm:min-w-[120px] whitespace-nowrap text-xs sm:text-sm border-r border-gray-200">Name</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[150px] sm:min-w-[180px] md:min-w-[200px] whitespace-nowrap text-xs sm:text-sm">Email</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[80px] sm:min-w-[100px] whitespace-nowrap text-xs sm:text-sm">Status</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[120px] sm:min-w-[140px] whitespace-nowrap text-xs sm:text-sm">Listing Limit</th>
                                  <th scope="col" className="h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left align-middle font-medium text-[var(--portal-label-text)] min-w-[160px] sm:min-w-[180px] md:min-w-[200px] whitespace-nowrap text-xs sm:text-sm">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                  <tr>
                                    <td colSpan={5} className="sticky left-0 bg-white px-2 sm:px-3 md:px-4 py-4 text-center align-middle text-[var(--portal-text)]">
                                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--portal-accent)]" />
                                    </td>
                                  </tr>
                                ) : filteredUsers.filter(user => user.subscription_status === 'free').length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="sticky left-0 bg-white px-2 sm:px-3 md:px-4 py-4 text-center text-muted-foreground align-middle text-[var(--portal-text)]">
                                      No free users found
                                    </td>
                                  </tr>
                                ) : (
                                  filteredUsers
                                    .filter(user => user.subscription_status === 'free')
                                    .sort((a, b) => {
                                      const dateA = new Date(a.created_at).getTime();
                                      const dateB = new Date(b.created_at).getTime();
                                      return dateB - dateA; // Descending order (newest first)
                                    })
                                    .map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-gray-50 even:bg-white">
                                      <td className="sticky left-0 bg-white z-10 px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)] border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                                        <span className="block text-black text-xs sm:text-sm font-medium">{user.first_name} {user.last_name}</span>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="text-black text-xs sm:text-sm truncate" title={user.email}>{user.email}</div>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <Badge 
                                          variant={user.status === 'active' ? 'outline' : 'secondary'} 
                                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                        >
                                          {user.status}
                                        </Badge>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="whitespace-nowrap text-xs sm:text-sm">{renderLimitBadge(user.listing_limit)}</div>
                                      </td>
                                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 align-middle text-[var(--portal-text)]">
                                        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-white border-[var(--portal-accent)] bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0"
                                            onClick={() => openDetailsDialog(user)}
                                          >
                                            Details
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-white border-[var(--portal-accent)] bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white text-[10px] sm:text-xs whitespace-nowrap px-2 sm:px-3 h-7 sm:h-8 flex-shrink-0"
                                            onClick={() => openEditDialog(user)}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                              )}
                              </tbody>
                            </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </SidebarInset>
          {/* User Details Modal */}
          <UserDetailsModal
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            user={selectedUser}
            onDelete={() => selectedUser && handleDeleteUser(selectedUser.id)}
          />
          {/* User Edit Modal */}
          <UserEditModal
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            user={selectedUser}
            onUserUpdated={fetchUsers}
          />
          {/* Success Popup Dialog */}
          <Dialog open={showDeleteSuccess} onOpenChange={(open) => {
            setShowDeleteSuccess(open);
            if (!open) fetchUsers();
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>User Deleted</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-lg">The user has been deleted successfully.</div>
              <DialogFooter>
                <Button onClick={() => {
                  setShowDeleteSuccess(false);
                  fetchUsers();
                }}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminUsersPage;

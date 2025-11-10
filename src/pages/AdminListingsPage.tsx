import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, Filter, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ListingDetailsModal from '@/components/admin/ListingDetailsModal';
import { formatCurrency } from '@/lib/formatters';
import { logger } from '@/lib/logger';
import { paginateQuery, getPaginationRange } from '@/lib/pagination';
import { fetchListingsWithUsers } from '@/lib/query-optimization';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  main_image_url: string | null;
  additional_image_urls: string[] | null;
  phone_number: string | null;
  whatsapp_link: string | null;
  telegram_link: string | null;
  user_id: string | null;
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
}

type FilterOptions = {
  status: 'all' | 'active' | 'hidden' | 'pending';
};

const AdminListingsPage = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all' });
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchListings();
  }, [page, filters.status]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, listings, page]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Use optimized query with batch user fetching
      const { listings: listingsData, users: usersMap } = await fetchListingsWithUsers(
        supabase,
        {
          status: filters.status === 'all' ? undefined : filters.status,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }
      );
      
      setListings(listingsData);
      setUsers(usersMap);
      
    } catch (error: any) {
      logger.error('Error loading listings:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async (userIds: string[]) => {
    try {
      // Get user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Get emails
      const { data: authUsersData, error: authUsersError } = await supabase
        .rpc('get_auth_users_data');
      
      if (authUsersError) throw authUsersError;
      
      // Create a map of user information
      const usersMap: Record<string, User> = {};
      
      profilesData?.forEach(profile => {
        const authUser = authUsersData.find((u: any) => u.id === profile.id);
        
        usersMap[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email
        };
      });
      
      setUsers(usersMap);
    } catch (error) {
      logger.error('Error fetching user info:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(listing => listing.status === filters.status);
    }
    
    // Apply search
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(search) ||
        listing.location?.toLowerCase().includes(search) ||
        (users[listing.user_id || '']?.first_name?.toLowerCase() || '').includes(search) ||
        (users[listing.user_id || '']?.last_name?.toLowerCase() || '').includes(search) ||
        listing.description?.toLowerCase().includes(search)
      );
    }
    
    setFilteredListings(filtered);
  };

  const handleFilterChange = (status: 'all' | 'active' | 'hidden' | 'pending') => {
    setFilters({ status });
    setFilterMenuOpen(false);
  };

  const clearFilters = () => {
    setFilters({ status: 'all' });
    setSearchTerm('');
  };
  
  const getUserName = (userId: string | null) => {
    if (!userId || !users[userId]) return 'Unknown User';
    
    const user = users[userId];
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`;
    }
    
    return user.email || 'Unknown User';
  };
  
  const getStatusBadge = (status: string | null) => {
    let bgColor = 'bg-yellow-100 text-yellow-800';
    
    if (status === 'active') {
      bgColor = 'bg-green-100 text-green-800';
    } else if (status === 'hidden') {
      bgColor = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs ${bgColor} ${status === 'pending' ? 'text-red-600' : 'text-black'}`}>
        {status || 'pending'}
      </span>
    );
  };
  
  const openDetailsModal = (listing: Listing) => {
    setSelectedListing(listing);
    setDetailsModalOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full md:pl-72 bg-white">
        <AdminSidebar />
        <div className="bg-white min-h-screen flex flex-col flex-1">
          <div className="p-6 flex-1 pb-20 md:pb-6">
            <h1 className="text-2xl font-semibold mb-6 text-black">Property Listings</h1>
            
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search listings"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizeInput(e.target.value))}
                  className="pl-10 bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={fetchListings} size="sm" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading
                    </>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
            </div>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="bg-white text-black">All Listings</CardTitle>
                <CardDescription className="text-gray-700">
                  Manage all property listings across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-700">No listings found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Listing</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredListings.map(listing => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <div className="flex items-center">
                              {listing.main_image_url ? (
                                <img 
                                  src={listing.main_image_url} 
                                  alt={listing.title}
                                  className="w-10 h-10 object-cover rounded-md mr-3"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-md mr-3 flex items-center justify-center text-gray-400">
                                  No img
                                </div>
                              )}
                              <span className="truncate max-w-[150px] text-black">{listing.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{listing.price ? formatCurrency(listing.price) : 'N/A'}</TableCell>
                          <TableCell className="truncate max-w-[150px] text-black">{listing.location || 'N/A'}</TableCell>
                          <TableCell className="text-black">{getUserName(listing.user_id)}</TableCell>
                          <TableCell className="text-black">{listing.phone_number || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(listing.status)}</TableCell>
                          <TableCell>{format(new Date(listing.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openDetailsModal(listing)}
                              className="ml-auto flex items-center gap-1 bg-[var(--portal-accent)] text-white hover:bg-[var(--portal-accent)]/90 border-0"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Listing Details Modal */}
          {selectedListing && (
            <ListingDetailsModal
              listing={selectedListing}
              open={detailsModalOpen}
              onOpenChange={setDetailsModalOpen}
              onStatusChange={fetchListings}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminListingsPage;

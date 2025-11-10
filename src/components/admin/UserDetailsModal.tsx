import React, { useEffect, useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  status: 'active' | 'inactive';
  career?: string;
  created_at: string;
  listing_count: number;
  payment_receipt_url?: string;
  subscription_status: string;
  subscription_end?: string;
  listing_limit?: { type: string; value?: number };
}

interface UserDetailsModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
}

interface UserListing {
  id: string;
  title: string;
  progress_status: string;
  created_at: string;
  price?: number;
  location?: string;
  description?: string;
  city?: string;
  main_image_url?: string;
  views?: number;
  favorites?: number;
}

const UserDetailsModal = ({ user, open, onOpenChange, onDelete }: UserDetailsModalProps) => {
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      fetchUserListings();
      fetchUserEmail();
    } else {
      // Reset state when modal closes
      setListings([]);
      setUserEmail(undefined);
    }
  }, [open, user?.id]);

  useEffect(() => {
    // Update email when user changes
    if (user?.email) {
      setUserEmail(user.email);
    } else {
      setUserEmail(undefined);
    }
  }, [user]);

  const fetchUserEmail = async () => {
    if (!user) return;
    
    if (user.email) {
      setUserEmail(user.email);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setUserEmail(profile.email);
      }
    } catch (error) {
      logger.error('Error fetching user email:', error);
    }
  };

  const fetchUserListings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          progress_status,
          created_at,
          price,
          location,
          description,
          city,
          main_image_url
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (listingsError) throw listingsError;

      // Get view counts for each listing
      const listingsWithStats = await Promise.all(
        (listingsData || []).map(async (listing) => {
          // For now, return the listing as is since we don't have views/favorites tables yet
          return {
            ...listing,
            views: 0,
            favorites: 0
          };
        })
      );

      setListings(listingsWithStats);
    } catch (error) {
      logger.error('Error fetching user listings:', error);
      toast.error('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const renderLimitBadge = (limit?: { type: string; value?: number }) => {
    if (!limit) return <span className="text-red-600 font-semibold">Default (10/month)</span>;
    if (limit.type === 'unlimited') {
      return <Badge variant="outline" className="bg-blue-50 text-red-600 border-red-200">Unlimited</Badge>;
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
        {limit.value}/{limit.type}
      </Badge>
    );
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    onDelete?.();
  };

  if (!user) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 bg-white text-black">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>User Details</DialogTitle>
            <div className="mt-4 mb-2 flex w-full">
              <Button
                variant="destructive"
                size="lg"
                className="w-full md:w-auto md:ml-auto"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
              {/* User Profile Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                    <p>{user.first_name} {user.last_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                    <p>{userEmail || 'Loading...'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                    <p>{user.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <Badge 
                      variant={user.status === 'active' ? 'outline' : 'secondary'}
                      className={user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                    >
                      {user.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-muted-foreground w-24">Profession</h4>
                    <p className="truncate">{user.career || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Member Since</h4>
                    <p>{formatDate(user.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Plan</h4>
                    <Badge 
                      variant={user.subscription_status === 'pro' ? 'outline' : 'secondary'}
                      className={user.subscription_status === 'pro' ? 'bg-gold-50 text-gold-700' : 'bg-blue-50 text-blue-700'}
                    >
                      {user.subscription_status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Listing Limit</h4>
                    {renderLimitBadge(user.listing_limit)}
                  </div>
                  {user.subscription_status === 'pro' && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Expires</h4>
                      <p>{formatDate(user.subscription_end || '')}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Total Listings</h4>
                    <p>{user.listing_count}</p>
                  </div>
                </div>
              </div>
            </div>

              {/* Payment Receipt Section */}
            {user.payment_receipt_url && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Payment Receipt</h3>
                  <div className="space-y-4">
                  <a
                    href={user.payment_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    View Receipt <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                    {user.payment_receipt_url.match(/\.(jpg|jpeg|png|gif)$/i) && (
                      <div className="border rounded-lg p-2 bg-background">
                    <img 
                      src={user.payment_receipt_url} 
                      alt="Payment Receipt" 
                          className="max-h-48 mx-auto object-contain"
                    />
                      </div>
                    )}
                  </div>
              </div>
            )}

              {/* Listings Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Recent Listings</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : listings.length > 0 ? (
                  <div className="space-y-4">
                    {listings.map(listing => (
                      <div key={listing.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-black">{listing.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {listing.city ? `${listing.city}${listing.location ? `, ${listing.location}` : ''}` : listing.location || 'No location'}
                            </p>
                          </div>
                          <Badge 
                            variant={listing.progress_status === 'fully_finished' ? 'outline' : 'secondary'}
                            className={
                              listing.progress_status === 'fully_finished' 
                                ? 'bg-green-50 text-green-700' 
                                : 'bg-yellow-50 text-yellow-700'
                            }
                          >
                            {listing.progress_status?.replace('_', ' ') || 'N/A'}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>{' '}
                            {formatCurrency(listing.price)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Listed:</span>{' '}
                            {formatDate(listing.created_at)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Views:</span>{' '}
                            {listing.views || 0}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Favorites:</span>{' '}
                            {listing.favorites || 0}
                          </div>
                        </div>
                        {listing.description && (
                          <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                            {listing.description}
                          </p>
                        )}
                        {listing.main_image_url && (
                          <div className="mt-2">
                            <img 
                              src={listing.main_image_url} 
                              alt={listing.title}
                              className="h-32 w-full object-cover rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    ))}
              </div>
            ) : (
                  <p className="text-gray-700 text-center py-8">No listings found</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user
            account and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default UserDetailsModal;

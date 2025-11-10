import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, Phone, MessageSquare, Info, MapPin, DollarSign, User as UserIcon, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';

interface UserInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  career: string | null;
  email?: string;
}

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
  user?: UserInfo;
}

interface ListingDetailsModalProps {
  listing: Listing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: () => void;
}

const ListingDetailsModal = ({ listing, open, onOpenChange, onStatusChange }: ListingDetailsModalProps) => {
  const [owner, setOwner] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(listing.main_image_url);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (open && listing.user_id) {
      fetchOwnerInfo();
    }
    
    // Set the main image when opening
    if (open && listing.main_image_url) {
      setSelectedImage(listing.main_image_url);
    }
  }, [open, listing]);

  const fetchOwnerInfo = async () => {
    if (!listing.user_id) return;
    
    setLoading(true);
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', listing.user_id)
        .single();
        
      if (profileError) throw profileError;
      
      // Fetch email from auth.users using the RPC function
      const { data: authData, error: authError } = await supabase
        .rpc('get_auth_users_data');
        
      if (authError) throw authError;
      
      const userEmail = authData?.find((u: any) => u.id === listing.user_id)?.email;
      
      setOwner({
        id: profileData.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone_number: profileData.phone_number,
        career: profileData.career,
        email: userEmail
      });
    } catch (error) {
      logger.error('Error fetching owner info:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleListingStatus = async () => {
    if (!listing.id) return;
    
    setUpdating(true);
    try {
      const newStatus = listing.status === 'active' ? 'hidden' : 'active';
      
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listing.id);
        
      if (error) throw error;
      
      // Close the modal
      onOpenChange(false);
      
      // Call the callback to refresh the listings list
      if (onStatusChange) {
        onStatusChange();
      }
      
    } catch (error: any) {
      logger.error('Error updating listing:', error);
    } finally {
      setUpdating(false);
    }
  };

  const deleteListing = async () => {
    if (!listing.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);
      if (error) throw error;
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      if (onStatusChange) onStatusChange();
    } catch (error) {
      logger.error('Error deleting listing:', error);
    } finally {
      setDeleting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-[var(--portal-border)] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-black text-2xl font-bold flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-500" />
            {listing.title}
          </DialogTitle>
        </DialogHeader>
        <div className="h-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Images */}
          <div className="space-y-6">
            {/* Main image display */}
            <div className="bg-gray-100 rounded-xl overflow-hidden h-72 flex items-center justify-center border-2 border-gray-200 shadow-md">
              {selectedImage ? (
                <img 
                  src={selectedImage} 
                  alt={listing.title || 'Listing image'}
                  className="object-contain h-full w-full transition-transform duration-200 hover:scale-105"
                />
              ) : (
                <div className="text-gray-700">No image available</div>
              )}
            </div>
            {/* Thumbnails for all images */}
            <div className="flex overflow-x-auto gap-2 pb-2">
              {listing.main_image_url && (
                <button
                  aria-label="Main image thumbnail"
                  className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors duration-150 focus:ring-2 focus:ring-blue-400 ${
                    selectedImage === listing.main_image_url ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedImage(listing.main_image_url)}
                >
                  <img 
                    src={listing.main_image_url} 
                    alt="Main thumbnail" 
                    className="h-full w-full object-cover"
                  />
                </button>
              )}
              {listing.additional_image_urls?.map((imgUrl, index) => (
                <button
                  key={index}
                  aria-label={`Additional image thumbnail ${index + 1}`}
                  className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors duration-150 focus:ring-2 focus:ring-blue-400 ${
                    selectedImage === imgUrl ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedImage(imgUrl)}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Additional thumbnail ${index + 1}`} 
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
          {/* Right column: Details */}
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-2xl font-semibold text-black">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  {formatCurrency(listing.price)}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  {listing.location || 'No location specified'}
                </div>
              </div>
              <Badge className={`rounded-full px-3 py-1 text-sm font-bold capitalize shadow ${
                listing.status === 'active' ? 'bg-green-100 text-green-700 border border-green-300' : 
                listing.status === 'hidden' ? 'bg-gray-200 text-gray-700 border border-gray-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              }`}>
                {listing.status || 'pending'}
              </Badge>
            </div>
            <hr className="my-2 border-gray-200" />
            <div className="space-y-2">
              <h3 className="font-medium text-black">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {listing.description || 'No description provided'}
              </p>
            </div>
            <hr className="my-2 border-gray-200" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="font-medium text-black">Listed on:</div>
              <div className="text-gray-700">{formatDate(listing.created_at)}</div>
              <div className="font-medium text-black">Last updated:</div>
              <div className="text-gray-700">{formatDate(listing.updated_at)}</div>
            </div>
            <hr className="my-2 border-gray-200" />
            <div className="space-y-2">
              <h3 className="font-medium text-black">Contact Information</h3>
              <div className="flex flex-wrap gap-2">
                {listing.phone_number && (
                  <a 
                    href={`tel:${listing.phone_number}`}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 focus:ring-2 focus:ring-blue-400"
                    aria-label="Call phone number"
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                {listing.whatsapp_link && (
                  <a 
                    href={listing.whatsapp_link}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm hover:bg-green-200 focus:ring-2 focus:ring-green-400"
                    aria-label="WhatsApp link"
                  >
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </a>
                )}
                {listing.telegram_link && (
                  <a 
                    href={listing.telegram_link}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 focus:ring-2 focus:ring-blue-400"
                    aria-label="Telegram link"
                  >
                    <MessageSquare className="h-3 w-3" /> Telegram
                  </a>
                )}
              </div>
            </div>
            <hr className="my-2 border-gray-200" />
            <Card className="bg-white border border-[var(--portal-border)] shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <UserIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="font-medium mb-1">Listed by</h3>
                  {loading ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  ) : owner ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-black">
                        {owner.first_name} {owner.last_name} 
                        {(!owner.first_name && !owner.last_name) && 'Unknown User'}
                      </p>
                      {owner.email && <p className="text-sm text-black">{owner.email}</p>}
                      {owner.phone_number && <p className="text-sm text-black">{owner.phone_number}</p>}
                      {owner.career && <p className="text-sm text-gray-700">{owner.career}</p>}
                    </div>
                  ) : (
                    <p className="text-gray-700">Owner information not available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <DialogFooter className="flex flex-col md:flex-row md:justify-between gap-2 mt-6">
          <div className="flex gap-2">
            <Button
              variant={listing.status === 'active' ? "destructive" : "default"}
              onClick={toggleListingStatus}
              disabled={updating || deleting}
            >
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {listing.status === 'active' ? 'Hide Listing' : 'Show Listing'}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleting || updating}
                    aria-label="Delete Listing"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Listing
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>This action is irreversible. The listing will be permanently deleted.</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onOpenChange(false)} disabled={deleting || updating}>
            Close
          </Button>
        </DialogFooter>
        {/* Custom Delete Confirmation Dialog */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader className="mb-2">
              <DialogTitle className="text-red-600 font-bold text-xl">Delete Listing</DialogTitle>
              <DialogDescription className="text-black mt-2">
                Are you sure you want to delete this listing? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white w-full text-base font-semibold py-3"
                onClick={deleteListing}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
              <Button
                variant="outline"
                className="border-red-600 text-red-600 bg-white hover:bg-red-50 w-full text-base font-semibold py-3"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default ListingDetailsModal;

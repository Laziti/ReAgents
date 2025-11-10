import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ExternalLink, AlertCircle, X, ZoomIn } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';
import { getPaginationRange } from '@/lib/pagination';

// Database response types
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  career: string | null;
}

interface SubscriptionRequest {
  id: string;
  user_id: string;
  plan_id: string;
  receipt_path: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  duration: string;
  listings_per_month: number;
  created_at: string;
  updated_at: string;
}

// Component state type
interface PaymentRequest {
  id: string;
  user_id: string;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  amount: number;
  plan_type: string;
  plan_id?: string;
  listings_per_month?: number;
  duration?: string;
  user_profile?: Profile;
}

// Plan ID to name mapping
const PLAN_NAMES: Record<string, string> = {
  'basic-monthly': 'Basic Monthly',
  'monthly-basic': 'Basic Monthly',
  'pro-monthly': 'Pro Monthly',
  'monthly-premium': 'Pro Monthly',
  'pro-6month': 'Pro 6-Month',
  'semi-annual': 'Pro 6-Month',
};

const PaymentApprovalSidebar = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const { refreshSession } = useAuth();

  useEffect(() => {
    fetchPaymentRequests();
    // Cleanup object URLs when component unmounts
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const getReceiptUrl = async (path: string) => {
    try {
      const { data } = await supabase
        .storage
        .from('receipts')
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      logger.error('Error getting receipt URL:', error);
      return null;
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      // Check current user's role from user_roles table
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        logger.error('Error getting user:', userError);
        return;
      }

      // Get user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (roleError) {
        logger.error('Error fetching user role:', roleError);
        return;
      }

      logger.log('User role from database:', roleData?.role);

      if (!roleData?.role || roleData.role !== 'super_admin') {
        logger.error('User does not have admin privileges. Current role:', roleData?.role);
        return;
      }
      
      // First get subscription requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) {
        logger.error('Error fetching requests:', requestsError);
        throw requestsError;
      }

      logger.log('Raw subscription requests:', requestsData);

      if (!requestsData || requestsData.length === 0) {
        logger.log('No subscription requests found in database');
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get all unique user IDs from the requests
      const userIds = [...new Set(requestsData.map(r => r.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        logger.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of profiles by user ID
      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

      // Transform the requests with receipt URLs and profile data
      const transformedRequests = await Promise.all(requestsData.map(async (request: SubscriptionRequest) => {
        try {
          logger.log('Processing request:', request);
          logger.log('Receipt path:', request.receipt_path);
          
          // Check if receipt_path is a full R2 URL or a Supabase storage path
          let receiptUrl: string;
          
          if (request.receipt_path.startsWith('https://')) {
            // It's a full R2 URL, use it directly
            receiptUrl = request.receipt_path;
            logger.log('Using R2 receipt URL:', receiptUrl);
          } else {
            // It's a Supabase storage path, get public URL
            const { data: urlData } = await supabase
              .storage
              .from('receipts')
              .getPublicUrl(request.receipt_path);

            receiptUrl = urlData.publicUrl;
              logger.log('Using Supabase receipt URL:', receiptUrl);
          }

          // Get plan name from plan_id or create descriptive name
          const planName = PLAN_NAMES[request.plan_id] || 
            `${request.listings_per_month} listings/${request.duration}`;

          return {
            id: request.id,
            user_id: request.user_id,
            receipt_url: receiptUrl,
            status: request.status,
            created_at: request.created_at,
            amount: request.amount,
            plan_type: planName,
            plan_id: request.plan_id,
            listings_per_month: request.listings_per_month,
            duration: request.duration,
            user_profile: profilesMap.get(request.user_id)
          };
        } catch (error) {
          logger.error('Error processing request:', request.id, error);
          return null;
        }
      }));

      // Filter out any null values from failed transformations
      const validRequests = transformedRequests.filter(r => r !== null) as PaymentRequest[];
      
      logger.log('Final transformed requests:', validRequests);
      setRequests(validRequests);
    } catch (error) {
      logger.error('Error in fetchPaymentRequests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    setProcessing(requestId);
    try {
      // First get the subscription request details
        const { data: requestData, error: requestError } = await supabase
          .from('subscription_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError) {
          logger.error('Error fetching request details:', requestError);
          throw requestError;
        }

      // Update subscription_requests status
      const { error: updateStatusError } = await supabase
        .from('subscription_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateStatusError) throw updateStatusError;

      // Calculate subscription start and end date based on duration
      const subscriptionStartDate = new Date();
      subscriptionStartDate.setUTCHours(0, 0, 0, 0);
      const subscriptionEndDate = new Date(subscriptionStartDate);
      const duration = requestData.duration.toLowerCase();
      if (duration.includes('month')) {
        // Extract number of months (e.g., '6 months', '1 month')
        const match = duration.match(/(\d+)/);
        const months = match ? parseInt(match[1], 10) : 1;
        subscriptionEndDate.setUTCMonth(subscriptionEndDate.getUTCMonth() + months);
      } else if (duration.includes('year')) {
        // Extract number of years (e.g., '1 year')
        const match = duration.match(/(\d+)/);
        const years = match ? parseInt(match[1], 10) : 1;
        subscriptionEndDate.setUTCFullYear(subscriptionEndDate.getUTCFullYear() + years);
      } else if (duration.includes('day')) {
        // Extract number of days (e.g., '30 days')
        const match = duration.match(/(\d+)/);
        const days = match ? parseInt(match[1], 10) : 30;
        subscriptionEndDate.setUTCDate(subscriptionEndDate.getUTCDate() + days);
      }

      // Update user's profile with pro status and subscription details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'pro',
          subscription_details: {
            plan_id: requestData.plan_id,
            listings_per_month: requestData.listings_per_month,
            duration: requestData.duration,
            amount: requestData.amount,
            start_date: subscriptionStartDate.toISOString(),
            end_date: subscriptionEndDate.toISOString(),
            subscription_request_id: requestId
          },
          listing_limit: {
            type: 'month',
            value: requestData.listings_per_month
          }
        })
        .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile:', profileError);
          throw profileError;
        }

      // Refresh the requests list
      await fetchPaymentRequests();

      // Refresh the user's session/profile in AuthContext
      await refreshSession();

    } catch (error) {
      logger.error('Error approving payment:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPaymentRequests();
    } catch (error) {
      logger.error('Error rejecting payment:', error);
    } finally {
      setProcessing(null);
    }
  };

  const renderPaymentRequest = (request: PaymentRequest) => (
    <Card key={request.id} className="bg-white border-[var(--portal-border)] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group hover:-translate-y-1">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[var(--portal-accent)]/20 to-[var(--portal-accent)]/10 flex items-center justify-center flex-shrink-0 group-hover:from-[var(--portal-accent)]/30 group-hover:to-[var(--portal-accent)]/20 transition-all duration-300">
                <span className="text-base font-bold text-[var(--portal-accent)]">
                  {request.user_profile?.first_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-[var(--portal-text)] truncate">
                  {request.user_profile?.first_name} {request.user_profile?.last_name}
                </h3>
                <p className="text-xs text-[var(--portal-text-secondary)] truncate">
                  {request.user_profile?.phone_number} • {request.user_profile?.career || 'Agent'}
                </p>
              </div>
            </div>
          </div>
          <Badge 
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ml-2
              ${request.status === 'pending' ? 'bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] border-[var(--portal-accent)]/30' : ''}
              ${request.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : ''}
              ${request.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : ''}
            `}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-[var(--portal-border)]">
          <div>
            <p className="text-xs text-[var(--portal-text-secondary)] mb-0.5">Plan</p>
            <p className="text-xs font-semibold text-[var(--portal-text)] truncate">{request.plan_type}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--portal-text-secondary)] mb-0.5">Amount</p>
            <p className="text-xs font-bold text-[var(--portal-accent)]">{request.amount.toLocaleString()} ETB</p>
          </div>
          {request.listings_per_month && (
            <div>
              <p className="text-xs text-[var(--portal-text-secondary)] mb-0.5">Listings/Month</p>
              <p className="text-xs font-semibold text-[var(--portal-text)]">{request.listings_per_month}</p>
            </div>
          )}
          {request.duration && (
            <div>
              <p className="text-xs text-[var(--portal-text-secondary)] mb-0.5">Duration</p>
              <p className="text-xs font-semibold text-[var(--portal-text)] truncate">{request.duration}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--portal-text-secondary)] mb-3">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}</span>
        </div>

        {request.receipt_url && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedReceiptUrl(request.receipt_url);
                setReceiptModalOpen(true);
              }}
              className="w-full border-[var(--portal-border)] hover:bg-[var(--portal-accent)]/10 hover:border-[var(--portal-accent)] transition-all duration-200 hover:shadow-md"
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
          </div>
        )}

        {request.status === 'pending' && (
          <div className="flex gap-2 pt-3 border-t border-[var(--portal-border)]">
            <Button
              className="flex-1 bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 text-xs py-2"
              onClick={() => handleApprove(request.id, request.user_id)}
              disabled={processing === request.id}
            >
              {processing === request.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors text-xs py-2"
              onClick={() => handleReject(request.id)}
              disabled={processing === request.id}
            >
              {processing === request.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--portal-accent)] mx-auto mb-4" />
          <p className="text-sm text-[var(--portal-text-secondary)]">Loading payment requests...</p>
        </div>
      </div>
    );
  }

  // Apply pagination to filtered requests
  const { from, to } = getPaginationRange(page, pageSize);
  
  const allPendingRequests = requests.filter(r => r.status === 'pending');
  const allApprovedRequests = requests.filter(r => r.status === 'approved');
  const allRejectedRequests = requests.filter(r => r.status === 'rejected');
  
  const pendingRequests = allPendingRequests.slice(from, to + 1);
  const approvedRequests = allApprovedRequests.slice(from, to + 1);
  const rejectedRequests = allRejectedRequests.slice(from, to + 1);

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--portal-accent)]/10 to-[var(--portal-accent)]/5 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-[var(--portal-accent)]" />
      </div>
      <p className="text-lg font-semibold text-[var(--portal-text)] mb-2">No requests found</p>
      <p className="text-sm text-[var(--portal-text-secondary)] text-center max-w-md">{message}</p>
    </div>
  );

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto">
      <Tabs defaultValue="pending" className="w-full">
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-[var(--portal-border)] p-1 rounded-lg shadow-sm">
            <TabsTrigger 
              value="pending" 
              className="flex items-center gap-2 data-[state=active]:bg-[var(--portal-accent)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Pending
              {allPendingRequests.length > 0 && (
                <Badge className="ml-1 bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] border-[var(--portal-accent)]/30 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30">
                  {allPendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="approved" 
              className="flex items-center gap-2 data-[state=active]:bg-[var(--portal-accent)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Approved
              {allApprovedRequests.length > 0 && (
                <Badge className="ml-1 bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] border-[var(--portal-accent)]/30 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30">
                  {allApprovedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="rejected" 
              className="flex items-center gap-2 data-[state=active]:bg-[var(--portal-accent)] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              Rejected
              {allRejectedRequests.length > 0 && (
                <Badge className="ml-1 bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] border-[var(--portal-accent)]/30 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30">
                  {allRejectedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="space-y-6">
          <TabsContent value="pending" className="mt-0">
            {pendingRequests.length === 0 ? (
              <EmptyState message="No pending payment requests at this time. All requests have been processed." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingRequests.map(renderPaymentRequest)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-0">
            {approvedRequests.length === 0 ? (
              <EmptyState message="No approved payment requests found. Approved requests will appear here." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedRequests.map(renderPaymentRequest)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-0">
            {rejectedRequests.length === 0 ? (
              <EmptyState message="No rejected payment requests found. Rejected requests will appear here." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedRequests.map(renderPaymentRequest)}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--portal-text)] flex items-center gap-2">
              <ZoomIn className="h-5 w-5 text-[var(--portal-accent)]" />
              Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-[var(--portal-text-secondary)]">
              Review the payment receipt image
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 relative rounded-lg overflow-hidden border-2 border-[var(--portal-border)] bg-gray-50 p-6 flex items-center justify-center min-h-[400px]">
            {selectedReceiptUrl && (
              <img
                src={selectedReceiptUrl}
                alt="Payment Receipt"
                className="max-w-full max-h-[70vh] rounded-lg shadow-xl object-contain"
              />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setReceiptModalOpen(false)}
              className="bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentApprovalSidebar; 

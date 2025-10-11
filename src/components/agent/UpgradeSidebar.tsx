import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  listingsPerMonth: number;
  features: string[];
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    price: 1000,
    duration: '1 month',
    listingsPerMonth: 10,
    features: ['10 listings per month', 'Basic support', 'Standard features']
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    price: 2000,
    duration: '1 month',
    listingsPerMonth: 50,
    features: ['50 listings per month', 'Priority support', 'Advanced features']
  }
];

const UpgradeSidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Check for pending upgrade requests
  useEffect(() => {
    const checkPendingRequests = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('subscription_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking pending requests:', error);
          return;
        }

        if (data && data.length > 0) {
          setHasPendingRequest(true);
          setPendingRequest(data[0]);
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPendingRequests();
  }, [user]);

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    // Navigate to receipt upload page with plan info
    navigate('/agent/receipt-upload', { state: { plan } });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-[var(--portal-card-bg)] shadow-xl rounded-2xl p-8 max-w-4xl mx-auto border border-[var(--portal-border)]">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      </div>
    );
  }

  // Show pending request page
  if (hasPendingRequest && pendingRequest) {
    return (
      <div className="bg-[var(--portal-card-bg)] shadow-xl rounded-2xl p-8 max-w-4xl mx-auto border border-[var(--portal-border)]">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-[var(--portal-text)]">
            Upgrade Request Pending
          </h2>
          <p className="text-[var(--portal-text-secondary)] mb-6 max-w-md mx-auto">
            Your upgrade request is currently under review. You will be notified once it's approved.
          </p>
          
          <div className="bg-[var(--portal-bg)] rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
            <h3 className="font-semibold text-[var(--portal-text)] mb-2">Request Details</h3>
            <div className="space-y-2 text-sm text-[var(--portal-text-secondary)]">
              <div className="flex justify-between">
                <span>Plan:</span>
                <span className="font-medium">{pendingRequest.plan_id?.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">{pendingRequest.amount} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">{pendingRequest.duration}</span>
              </div>
              <div className="flex justify-between">
                <span>Submitted:</span>
                <span className="font-medium">
                  {new Date(pendingRequest.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--portal-card-bg)] shadow-xl rounded-2xl p-8 max-w-4xl mx-auto border border-[var(--portal-border)]">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-gold-500">
        <Check className="h-8 w-8" />
        Upgrade to Pro
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className="border-2 border-[var(--portal-border)] rounded-xl p-6 hover:border-gold-500 transition-colors cursor-pointer bg-[var(--portal-bg)]"
            onClick={() => handlePlanSelect(plan)}
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-gold-500 mb-2">
                {plan.name}
              </h3>
              <div className="text-3xl font-bold text-[var(--portal-text)] mb-2">
                {plan.price.toLocaleString()} ETB
              </div>
              <div className="text-[var(--portal-text-secondary)] mb-4">
                {plan.duration}
              </div>
              <div className="text-sm text-[var(--portal-text-secondary)] mb-4">
                {plan.listingsPerMonth} listings per month
              </div>
              <ul className="text-sm text-[var(--portal-text-secondary)] space-y-1 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan);
                }}
              >
                Choose Plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-800 space-y-2">
          <li>1. Choose your preferred plan above</li>
          <li>2. Upload your payment receipt</li>
          <li>3. Wait for approval (usually within 24 hours)</li>
          <li>4. Start enjoying your upgraded features!</li>
        </ol>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--portal-text-secondary)]">
          Need help? Contact our support team for assistance.
                  </p>
                </div>
    </div>
  );
};

export default UpgradeSidebar;
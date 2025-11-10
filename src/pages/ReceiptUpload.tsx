import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ArrowLeft, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToR2 } from '@/lib/upload';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { logger } from '@/lib/logger';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  listingsPerMonth: number;
  features: string[];
}

// Plan ID mapping for database
const PLAN_ID_MAP: Record<string, string> = {
  'basic-monthly': 'basic_monthly',
  'pro-monthly': 'pro_monthly',
  'pro-6month': 'pro_semi_annual',
};

const ReceiptUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const plan = location.state?.plan as PricingPlan | undefined;
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Use hook to safely manage object URL
  const receiptPreview = useObjectUrl(receipt);

  // Redirect if no plan is provided
  useEffect(() => {
    if (!plan) {
      navigate('/agent?tab=upgrade');
    }
  }, [plan, navigate]);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceipt(file);
      setError(null);
    }
  };

  const removeReceipt = () => {
    setReceipt(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!receipt) {
      setError('Please select a receipt file');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload receipt to R2
      const receiptUrl = await uploadToR2(receipt, 'receipts');

      // Validate plan exists
      if (!plan) {
        throw new Error('Plan information is missing. Please select a plan first.');
      }

      // Map plan ID for database
      const dbPlanId = PLAN_ID_MAP[plan.id] || plan.id;

      // Create subscription request
      const { error: requestError } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          receipt_path: receiptUrl,
          status: 'pending',
          plan_id: dbPlanId,
          amount: plan.price,
          duration: plan.duration,
          listings_per_month: plan.listingsPerMonth
        });

      if (requestError) {
        throw requestError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      logger.error('Error uploading receipt:', error);
      setError(`Failed to upload receipt: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--portal-text)] mb-2">Receipt Uploaded Successfully!</h2>
          <p className="text-[var(--portal-text-secondary)] mb-6">
            Your payment receipt has been submitted for review. You will be notified once it's approved.
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--portal-text)]">Upload Payment Receipt</h1>
            <p className="text-[var(--portal-text-secondary)]">Upload your payment receipt to upgrade your account</p>
            {plan && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Plan: {plan.name} - {plan.listingsPerMonth} listings/month - {plan.price.toLocaleString()} ETB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-6">
          <div className="space-y-6">
            {/* Bank Account Information */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-emerald-900">Bank Account Details</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white/70 p-3 border border-emerald-100">
                  <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">CBE</p>
                  <p className="text-sm font-medium text-emerald-900">Commercial Bank of Ethiopia</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-base font-bold text-emerald-800">1000550968057</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700 hover:text-emerald-900"
                      onClick={() => navigator.clipboard.writeText('1000550968057')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-white/70 p-3 border border-emerald-100">
                  <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Telebirr</p>
                  <p className="text-sm font-medium text-emerald-900">Account / Phone Number</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-base font-bold text-emerald-800">0900424494</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700 hover:text-emerald-900"
                      onClick={() => navigator.clipboard.writeText('0900424494')}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-emerald-700 mt-3">
                Please transfer the subscription payment to one of the accounts above and upload the receipt for approval.
              </p>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Payment Receipt <span className="text-red-500">*</span>
              </label>
              
              {!receiptPreview ? (
                <div className="border-2 border-dashed border-[var(--portal-border)] rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="receipt-upload"
                      accept="image/*,.pdf"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  <label htmlFor="receipt-upload" className="cursor-pointer block">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--portal-text-secondary)]" />
                    <p className="text-lg font-medium text-[var(--portal-text)] mb-2">
                      Click to upload your receipt
                    </p>
                    <p className="text-sm text-[var(--portal-text-secondary)] mb-4">
                      Take a photo or select from gallery
                    </p>
                    <p className="text-xs text-[var(--portal-text-secondary)]">
                      PNG, JPG, PDF up to 15MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-[var(--portal-border)]">
                    {receiptPreview.endsWith('.pdf') ? (
                      <div className="bg-[var(--portal-bg-hover)] p-8 text-center">
                        <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <span className="text-white font-bold text-lg">PDF</span>
                        </div>
                        <p className="text-[var(--portal-text)] font-medium">{receipt?.name}</p>
                      </div>
                    ) : (
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        className="w-full h-64 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-[var(--portal-bg)] p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-[var(--portal-text)]">{receipt?.name}</p>
                      <p className="text-xs text-[var(--portal-text-secondary)]">
                        {(receipt?.size || 0) / 1024 / 1024 < 1 
                          ? `${((receipt?.size || 0) / 1024).toFixed(1)} KB`
                          : `${((receipt?.size || 0) / 1024 / 1024).toFixed(1)} MB`
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Upload Instructions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Take a clear photo of your payment receipt</li>
                <li>• Ensure all text is readable and not blurry</li>
                <li>• Include the full receipt in the frame</li>
                <li>• Supported formats: PNG, JPG, PDF</li>
              </ul>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!receipt || isSubmitting}
                className="flex-1 bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Receipt'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUpload;

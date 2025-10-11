import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ArrowLeft, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ReceiptUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeReceipt = () => {
    setReceipt(null);
    setReceiptPreview(null);
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
      // Upload receipt to storage
      const fileName = `${user.id}/${Date.now()}-receipt-${receipt.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receipt);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Create subscription request
      const { error: requestError } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: user.id,
          receipt_path: publicUrlData.publicUrl,
          status: 'pending',
          plan_id: 'basic_monthly', // Valid plan ID from database constraint
          amount: 300, // Default amount, can be made dynamic
          duration: '1 month',
          listings_per_month: 20
        });

      if (requestError) {
        throw requestError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading receipt:', error);
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
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-6">
          <div className="space-y-6">
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

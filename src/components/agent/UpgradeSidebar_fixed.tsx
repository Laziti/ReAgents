import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  listingsPerMonth: number;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'monthly-basic',
    name: 'Basic Monthly',
    price: 1000,
    duration: '1 month',
    listingsPerMonth: 10,
  },
  {
    id: 'monthly-pro',
    name: 'Pro Monthly',
    price: 2000,
    duration: '1 month',
    listingsPerMonth: 25,
  },
  {
    id: 'semi-annual',
    name: 'Pro Semi-Annual',
    price: 10000,
    duration: '6 months',
    listingsPerMonth: 25,
  },
  {
    id: 'annual',
    name: 'Pro Annual',
    price: 18000,
    duration: '1 year',
    listingsPerMonth: 25,
  },
];

const PLAN_ID_MAP: Record<string, string> = {
  'monthly-basic': 'basic_monthly',
  'monthly-pro': 'pro_monthly',
  'semi-annual': 'pro_semi_annual',
  'annual': 'pro_annual',
};

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\?*<>|":]/g, '-') // forbidden by most filesystems
    .replace(/[^\x00-\x7F]/g, '-') // non-ASCII
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

const UpgradeSidebar = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'pro' | 'pending' | 'rejected'>('free');
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  // Poll for subscription status changes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const { data: requests, error } = await supabase
        .from('subscription_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!error && requests && requests.length > 0) {
        const status = requests[0].status;
        if (status === 'rejected' && lastStatus !== 'rejected') {
          setSubscriptionStatus('free');
          setRejectionMessage('Your upgrade request was rejected. You can request an upgrade again.');
          setReceipt(null);
          setReceiptPreview(null);
          setError(null);
        } else if (status === 'pending') {
          setSubscriptionStatus('pending');
          setRejectionMessage(null);
        } else if (status === 'approved') {
          setSubscriptionStatus('pro');
          setRejectionMessage(null);
        } else if (status === 'free') {
          setSubscriptionStatus('free');
          setRejectionMessage(null);
        }
        setLastStatus(status);
      }
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [user, lastStatus]);

  // Workaround: Reopen dialog if receipt is selected but dialog is closed (mobile bug)
  useEffect(() => {
    if (receipt && !selectedPlan) {
      setSelectedPlan(null);
    }
  }, [receipt, selectedPlan]);

  // Clean up preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setReceipt(null);
    setReceiptPreview(null);
    setError(null);
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[handleReceiptChange] event:', event);
    const file = event.target.files?.[0];
    if (!file) {
      setError('No file detected. If you tried to select a file and nothing happened, your phone or browser may not support this file type.');
      console.warn('[handleReceiptChange] No file detected:', event);
      return;
    }
    
    // Mobile debugging
    if (window.innerWidth < 768) {
      alert(`📱 Mobile: Receipt file selected!\nName: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)}KB\nType: ${file.type}`);
    }
    
    // Relaxed file type validation for gallery/camera
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = (file.type && file.type.startsWith('image/')) || (!file.type && ext && ['jpg','jpeg','png','gif','webp'].includes(ext));
    const isPdf = file.type === 'application/pdf' || (!file.type && ext === 'pdf');
    console.log('[handleReceiptChange] file:', file, 'isImage:', isImage, 'isPdf:', isPdf);
    
    if (!isImage && !isPdf) {
      setError('Please select an image or PDF file');
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: Invalid file type - ${file.type || 'unknown'}`);
      }
      return;
    }
    
    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      setError('File size must be less than 15MB');
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: File too large - ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      }
      return;
    }
    
    // Mobile debugging - file validation passed
    if (window.innerWidth < 768) {
      alert(`📱 Mobile: File validation passed! Setting receipt...`);
    }
    
    setReceipt(file);
    setError(null);
    
    // Show preview for images
    if (isImage) {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(URL.createObjectURL(file));
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: Image preview created!`);
      }
    } else {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: PDF file - no preview`);
      }
    }
    
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };

  const removeReceipt = () => {
    setReceipt(null);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!receipt || !selectedPlan || !user) {
      setError('Please select a receipt file');
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: Missing required data!\nReceipt: ${!!receipt}\nPlan: ${!!selectedPlan}\nUser: ${!!user}`);
      }
      return;
    }

    if (window.innerWidth < 768) {
      alert(`📱 Mobile: Starting upload process...\nFile: ${receipt.name}\nSize: ${receipt.size} bytes`);
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Debug: log file details
      console.log('[handleSubmit] receipt:', receipt);
      console.log('[handleSubmit] receipt.size:', receipt.size, 'type:', receipt.type);

      // Sanitize filename before upload
      const safeName = sanitizeFilename(receipt.name);
      const fileName = `${user.id}/${Date.now()}-${safeName}`;
      let uploadError = null;
      if (receipt.size > 0) {
        const { error } = await supabase.storage
          .from('receipts')
          .upload(fileName, receipt);
        uploadError = error;
        if (!error) {
          if (window.innerWidth < 768) {
            alert(`📱 Mobile: File uploaded successfully! Now saving to database...`);
          }
          
          // Insert subscription request into DB
          const { error: insertError } = await supabase
            .from('subscription_requests')
            .insert([
              {
                user_id: user.id,
                plan_id: PLAN_ID_MAP[selectedPlan.id],
                receipt_path: fileName,
                amount: selectedPlan.price,
                duration: selectedPlan.duration,
                listings_per_month: selectedPlan.listingsPerMonth,
                status: 'pending',
              },
            ]);
          if (insertError) {
            setError('Failed to submit upgrade request. Please try again.');
            if (window.innerWidth < 768) {
              alert(`📱 Mobile: Database error - ${insertError.message}`);
            }
            setIsSubmitting(false);
            return;
          }
          
          if (window.innerWidth < 768) {
            alert(`📱 Mobile: Success! Upgrade request submitted successfully!`);
          }
          
          setLocalSuccess(true);
          setReceipt(null);
          if (receiptPreview) URL.revokeObjectURL(receiptPreview);
          setReceiptPreview(null);
          setSelectedPlan(null);
          setTimeout(() => setLocalSuccess(false), 4000);
          setIsSubmitting(false);
          return;
        }
      } else {
        uploadError = { message: 'File size is zero, will try FileReader fallback.' };
      }

      // If upload failed or file size is 0, try FileReader fallback
      if (uploadError) {
        console.warn('[handleSubmit] Upload failed or file size is zero, trying FileReader fallback:', uploadError);
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const blob = new Blob([arrayBuffer], { type: receipt.type || 'application/octet-stream' });
            const { error: fallbackError } = await supabase.storage
              .from('receipts')
              .upload(fileName, blob);
            if (fallbackError) {
              console.error('[handleSubmit] Fallback upload failed:', fallbackError);
              setError('Failed to upload receipt (FileReader fallback). Please try a different image or browser.');
              setIsSubmitting(false);
              return;
            }
            // Success
            setLocalSuccess(true);
            setReceipt(null);
            if (receiptPreview) URL.revokeObjectURL(receiptPreview);
            setReceiptPreview(null);
            setSelectedPlan(null);
            setTimeout(() => setLocalSuccess(false), 4000);
          } catch (fallbackErr) {
            console.error('[handleSubmit] FileReader fallback error:', fallbackErr);
            setError('Failed to upload receipt (FileReader fallback). Please try a different image or browser.');
          } finally {
            setIsSubmitting(false);
          }
        };
        fileReader.onerror = (e) => {
          console.error('[handleSubmit] FileReader error:', e);
          setError('Failed to read file for upload.');
          setIsSubmitting(false);
        };
        fileReader.readAsArrayBuffer(receipt);
        return; // Exit, as fallback is async
      }
    } catch (err) {
      setError('Failed to submit upgrade request. Please try again.');
      console.error('[handleSubmit] Error:', err);
      if (window.innerWidth < 768) {
        alert(`📱 Mobile: Upload failed with error - ${err.message || JSON.stringify(err)}`);
      }
      setIsSubmitting(false);
    }
  };

  // Copy handler for payment details
  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 1500);
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 max-w-3xl mx-auto border border-gray-200">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-[var(--portal-accent)]">
        <span className="inline-block w-2 h-6 rounded-full bg-[var(--portal-accent)]"></span>
        <span className="text-[var(--portal-text)]">Upgrade to Pro</span>
      </h2>

      {rejectionMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-center">
          {rejectionMessage}
        </div>
      )}

      {/* Only show package plans if not in pending status */}
      {subscriptionStatus !== 'pending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {pricingPlans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`portal-card cursor-pointer transition-all relative border-2 ${selectedPlan?.id === plan.id ? 'border-[var(--portal-accent)] ring-2 ring-[var(--portal-accent-glow)]' : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]'} flex flex-col min-h-[260px]`}
              onClick={() => handlePlanSelect(plan)}
            >
              {/* Icon for each plan */}
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full bg-[var(--portal-accent-glow)] p-3">
                  {idx === 0 && <svg className="w-6 h-6 text-[var(--portal-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 13v7m0 0H7m5 0h5" /></svg>}
                  {idx === 1 && <svg className="w-6 h-6 text-[var(--portal-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>}
                  {idx === 2 && <svg className="w-6 h-6 text-[var(--portal-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 12l2 2 4-4" /></svg>}
                  {idx === 3 && <svg className="w-6 h-6 text-[var(--portal-accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v20m0-20C6.477 2 2 6.477 2 12m10-10c5.523 0 10 4.477 10 10" /></svg>}
                </div>
                <h3 className="font-bold text-lg text-[var(--portal-text)]">{plan.name}</h3>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="mb-4">
                  <div className="text-2xl font-extrabold text-[var(--portal-accent)] mb-1">{plan.price} ETB</div>
                  <div className="text-sm text-[var(--portal-text-secondary)] mb-2">{plan.duration}</div>
                  <div className="text-[var(--portal-text-secondary)] text-sm">Up to <span className="font-semibold text-[var(--portal-text)]">{plan.listingsPerMonth}</span> listings/month</div>
                </div>
                <Button
                  className={`w-full mt-auto font-semibold py-2 rounded-lg transition-all shadow-sm border-2 bg-[var(--portal-accent)] text-white border-[var(--portal-accent)] hover:bg-[var(--portal-button-hover)]`}
                  onClick={(e) => { e.stopPropagation(); handlePlanSelect(plan); }}
                >
                  {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {localSuccess && (
        <div className="my-8 p-6 bg-green-50 border border-green-300 text-green-800 rounded-xl text-center shadow">
          <div className="flex flex-col items-center justify-center">
            <Check className="h-8 w-8 mb-2 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
            <p>Your upgrade request has been submitted. We'll review your payment receipt and upgrade your account within 24 hours.</p>
          </div>
        </div>
      )}

      {/* Pending State */}
      {subscriptionStatus === 'pending' && (
        <div className="my-8 p-6 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl text-center shadow">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 mb-2 animate-spin text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">Upgrade Request Pending</h3>
            <p>Your upgrade request is pending. Please wait for admin approval.</p>
          </div>
        </div>
      )}

      {/* Upload Receipt Dialog - Only show if not in pending status */}
      {subscriptionStatus !== 'pending' && (
        <Dialog open={!!selectedPlan && !localSuccess} onOpenChange={(open) => { if (!open) { setSelectedPlan(null); removeReceipt(); } }}>
          <DialogContent className="max-w-md w-full sm:max-w-lg p-0 overflow-y-auto max-h-[90vh]">
            <div className="p-0">
              <div className="portal-card rounded-b-none rounded-t-2xl border-b-0">
                <h3 className="font-bold mb-2 text-lg text-[var(--portal-text)]">Upload Payment Receipt</h3>
                <div className="text-[var(--portal-text-secondary)] mb-4">
                  <div>Price: <span className="font-semibold text-[var(--portal-accent)]">{selectedPlan?.price} ETB</span></div>
                  <div>Duration: {selectedPlan?.duration}</div>
                  <div>Listings: {selectedPlan?.listingsPerMonth} per month</div>
                </div>
                {/* Bank Account Info with copy buttons */}
                <div className="mb-4">
                  <div className="bg-[var(--portal-accent-glow)] border border-[var(--portal-accent)] rounded-lg p-4 flex flex-col gap-2">
                    <div className="font-semibold text-[var(--portal-text)] mb-1">Pay to one of the following accounts:</div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--portal-text)]">CBE</span>
                        <span className="font-mono text-[var(--portal-text)] select-all">1000550968057</span>
                        <button
                          type="button"
                          className="ml-2 px-2 py-1 rounded bg-[var(--portal-accent)] text-white text-xs font-semibold hover:bg-[var(--portal-button-hover)] transition min-w-[60px]"
                          onClick={() => handleCopy('cbe', '1000550968057')}
                          title="Copy CBE account number"
                        >{copied.cbe ? 'Copied!' : 'Copy'}</button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--portal-text)]">Awash</span>
                        <span className="font-mono text-[var(--portal-text)] select-all">01320811456000</span>
                        <button
                          type="button"
                          className="ml-2 px-2 py-1 rounded bg-[var(--portal-accent)] text-white text-xs font-semibold hover:bg-[var(--portal-button-hover)] transition min-w-[60px]"
                          onClick={() => handleCopy('awash', '01320811456000')}
                          title="Copy Awash account number"
                        >{copied.awash ? 'Copied!' : 'Copy'}</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--portal-text)] mb-2">
                    Upload Receipt (Image or PDF)
                  </label>
                  <div className="border-2 border-dashed border-[var(--portal-border)] rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="receipt-upload"
                      accept="image/*,.pdf"
                      onChange={handleReceiptChange}
                      className="hidden"
                      capture="environment"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-[var(--portal-accent)]" />
                      <p className="text-sm text-[var(--portal-text-secondary)]">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-[var(--portal-text-secondary)] mt-1">
                        PNG, JPG, PDF up to 15MB
                      </p>
                    </label>
                  </div>
                  {receipt && (
                    <div className="mt-2 flex items-center justify-between bg-[var(--portal-bg)] p-2 rounded">
                      <span className="text-sm text-[var(--portal-text)] truncate">{receipt.name}</span>
                      <button
                        type="button"
                        onClick={removeReceipt}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {receiptPreview && (
                    <div className="mt-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-w-full h-32 object-contain rounded border"
                      />
                    </div>
                  )}
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-center">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedPlan(null); removeReceipt(); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!receipt || isSubmitting}
                    className="flex-1 bg-[var(--portal-accent)] text-white hover:bg-[var(--portal-button-hover)]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <div className="text-center py-6">
            <div className="mx-auto mb-4 bg-green-500/10 w-16 h-16 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
            <p className="text-[var(--portal-text-secondary)]">
              Your upgrade request has been submitted. We'll review your payment receipt and upgrade your account within 24 hours.
            </p>
            <Button
              className="mt-6"
              onClick={() => setShowSuccessDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpgradeSidebar;


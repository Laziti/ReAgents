import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createSlug } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink, Clipboard, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Database } from '@/types/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { uploadToR2 } from '@/lib/upload';
import { logger } from '@/lib/logger';
import { sanitizeInput, sanitizeUrl, sanitizePhoneNumber } from '@/lib/sanitize';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ListingLimitType = NonNullable<Profile['listing_limit']>;
interface AccountInfoProps {
  listings?: any[];
  profile?: Profile;
  onRefresh?: () => Promise<void>;
}

const PLAN_DETAILS = {
  'free': {
    name: 'Free Tier',
    listingsPerMonth: 10,
    price: 0,
  },
  'monthly-basic': {
    name: 'Monthly Basic',
    listingsPerMonth: 30,
    price: 300,
  },
  'monthly-premium': {
    name: 'Monthly Premium',
    listingsPerMonth: 50,
    price: 500,
  },
  'semi-annual': {
    name: 'Semi-Annual',
    listingsPerMonth: 50,
    price: 2500,
  }
};

const AccountInfo = ({ listings = [], profile: initialProfile, onRefresh }: AccountInfoProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [listingLimit, setListingLimit] = useState<ListingLimitType>({
    type: 'month',
    value: 10
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  

  // Returns a string like '1 year, 2 months, 5 days remaining' or '15 days remaining' or 'Expired'
  const getTimeRemaining = (profileData: Profile | null) => {
    if (!profileData) return null;
    const endDateRaw = profileData.subscription_details?.end_date || profileData.subscription_end_date;
    if (!endDateRaw) return null;

    const endDate = new Date(endDateRaw);
    const today = new Date();

    // Use UTC for consistent day calculation across time zones
    const utc1 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const utc2 = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    let years = endDate.getUTCFullYear() - today.getUTCFullYear();
    let months = endDate.getUTCMonth() - today.getUTCMonth();
    let days = endDate.getUTCDate() - today.getUTCDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), 0);
      days += prevMonth.getUTCDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    // If the end date is in the past, consider it expired
    if (utc2 < utc1) return 'Expired';

    let parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);

    // Only add days if there are no years or months, or if days > 0 and it's not exactly the end of a month/year calculation
    // This prevents showing "0 days" when it's exactly 1 month or 1 year remaining.
    if (days > 0 || (years === 0 && months === 0 && days === 0)) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') + ' remaining' : 'Expired';
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching profile:', error);
          setError('Failed to load profile');
          // Do not set profile to null, retain last known profile or show error state properly
          return;
        }

        if (!data) {
          logger.warn('No profile found for user');
          // Auto-create a minimal profile for the user with default listing limit of 10
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ 
              id: user.id, 
              user_id: user.id, 
              first_name: user.user_metadata?.first_name || '', 
              last_name: user.user_metadata?.last_name || '',
              listing_limit: { type: 'month', value: 10 },
              subscription_status: 'free'
            }]);
          if (insertError) {
            logger.error('Error creating profile:', insertError);
            setError('Failed to create profile');
            setLoading(false);
            return;
          }
          // Refetch the profile after creation
          const { data: newProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (fetchError || !newProfile) {
            setError('Failed to load profile after creation');
            setLoading(false);
            return;
          }
          setProfile(newProfile);
          setWhatsappLink(newProfile.whatsapp_link || '');
          setTelegramLink(newProfile.telegram_link || '');
          setPhoneNumber(newProfile.phone_number || '');
          // Set listing limit, using subscription_details if listing_limit is null
          if (newProfile.listing_limit) {
            setListingLimit(newProfile.listing_limit);
          } else if (newProfile.subscription_details?.listings_per_month) {
            setListingLimit({ type: 'month', value: newProfile.subscription_details.listings_per_month });
          } else {
            setListingLimit({ type: 'month', value: 10 });
          }
          setLoading(false);
          return;
        }

        setProfile(data);
        setWhatsappLink(data.whatsapp_link || '');
        setTelegramLink(data.telegram_link || '');
        setPhoneNumber(data.phone_number || '');
        // Set listing limit, using subscription_details if listing_limit is null
        if (data.listing_limit) {
          setListingLimit(data.listing_limit);
        } else if (data.subscription_details?.listings_per_month) {
          setListingLimit({ type: 'month', value: data.subscription_details.listings_per_month });
        } else {
          setListingLimit({ type: 'month', value: 10 });
        }
      } catch (error) {
        logger.error('Error fetching profile:', error);
        setError('An unexpected error occurred');
        // Do not set profile to null, retain last known profile or show error state properly
      } finally {
        setLoading(false);
      }
    };

      fetchProfile();

    // The onRefresh prop should be called by the parent if the parent itself needs to update its state.
    // AccountInfo should not force a refresh on its parent.

  }, [user]); // Depend only on user to trigger re-fetches

  // Effect to update local state when initialProfile prop changes
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setWhatsappLink(initialProfile.whatsapp_link || '');
      setTelegramLink(initialProfile.telegram_link || '');
      setPhoneNumber(initialProfile.phone_number || '');
      // Set listing limit, using subscription_details if listing_limit is null
      if (initialProfile.listing_limit) {
        setListingLimit(initialProfile.listing_limit);
      } else if (initialProfile.subscription_details?.listings_per_month) {
        setListingLimit({ type: 'month', value: initialProfile.subscription_details.listings_per_month });
      } else {
        setListingLimit({ type: 'month', value: 10 });
      }
    }
  }, [initialProfile]);

  const getUsagePercentage = () => {
    // Use the total listings count to match what's displayed
    const count = listings.length;
    return Math.min(Math.round((count / listingLimit.value) * 100), 100);
  };

  const formatLimitType = (type: string) => {
    switch (type) {
      case 'day': return 'daily';
      case 'week': return 'weekly';
      case 'month': return 'monthly';
      case 'year': return 'yearly';
      default: return type;
    }
  };

  const getPublicProfileUrl = () => {
    if (!profile) return '';
    
    // Use the slug if available, otherwise create one from name
    const profileSlug = profile.slug || createSlug(`${profile.first_name || ''} ${profile.last_name || ''}`);
    
    // Get base URL without any path segments
    const url = new URL(window.location.href);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Return the complete URL with /agent/ prefix
    return `${baseUrl}/agent/${profileSlug}`;
  };

  const handleCopyUrl = () => {
    const url = getPublicProfileUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSubscriptionStatus = () => {
    if (!profile) return null;
    
    const timeRemainingString = getTimeRemaining(profile); // Get the descriptive string
    if (timeRemainingString === null) return null;

    if (timeRemainingString === 'Expired') {
      return {
        type: 'expired',
        message: 'Your subscription has expired',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20'
      };
    } 
    
    // Extract days, months, and years from the string for threshold checks
    const getNumberFromString = (str: string, unit: string) => {
      const match = str.match(new RegExp(`(\\d+)\\s${unit}`));
      return match ? parseInt(match[1], 10) : 0;
    };

    const remainingYears = getNumberFromString(timeRemainingString, 'year');
    const remainingMonths = getNumberFromString(timeRemainingString, 'month');
    const remainingDays = getNumberFromString(timeRemainingString, 'day');

    // Calculate total days for comparison (approximate for months/years, precise for days)
    const totalDaysRemaining = remainingYears * 365 + remainingMonths * 30 + remainingDays;

    if (totalDaysRemaining >= 0 && totalDaysRemaining <= 3) {
      return {
        type: 'critical',
        message: `Your subscription expires in ${timeRemainingString}! Please renew now to avoid service interruption.`,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20'
      };
    } else if (totalDaysRemaining > 3 && totalDaysRemaining <= 7) {
      return {
        type: 'warning',
        message: `Your subscription expires in ${timeRemainingString}. Please renew soon.`,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20'
      };
    } else if (totalDaysRemaining > 7 && totalDaysRemaining <= 14) {
      return {
        type: 'info',
        message: `Your subscription will expire in ${timeRemainingString}`,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      };
    }
    
    // Default active status for longer durations
    return {
      type: 'active',
      message: `Your subscription is active. Remaining: ${timeRemainingString}`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    };
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id || !profile?.id) {
      setError('User or profile not found.');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    setUploading(true);
    setError(null);

    try {
      // Upload avatar to R2
      const publicUrl = await uploadToR2(file, 'profile-avatars');

      if (!publicUrl) {
        throw new Error('Failed to get public URL for avatar.');
      }

      // Update the user's profile with the new avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prevProfile => prevProfile ? { ...prevProfile, avatar_url: publicUrl } : null);
      logger.log('Avatar uploaded and profile updated successfully!', publicUrl);

      // Trigger a refresh of parent component if onRefresh is provided
      if (onRefresh) {
        await onRefresh();
      }

    } catch (error: any) {
      logger.error('Error uploading avatar:', error);
      setError(`Failed to upload avatar: ${error.message || JSON.stringify(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user?.id || !profile?.id) {
      setError('User or profile not found.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Sanitize inputs before updating
      const sanitizedWhatsappLink = whatsappLink ? sanitizeUrl(whatsappLink) : null;
      const sanitizedTelegramLink = telegramLink ? sanitizeUrl(telegramLink) : null;
      const sanitizedPhoneNumber = phoneNumber ? sanitizePhoneNumber(phoneNumber) : null;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          whatsapp_link: sanitizedWhatsappLink,
          telegram_link: sanitizedTelegramLink,
          phone_number: sanitizedPhoneNumber,
        })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prevProfile => prevProfile ? {
        ...prevProfile,
        whatsapp_link: sanitizedWhatsappLink,
        telegram_link: sanitizedTelegramLink,
        phone_number: sanitizedPhoneNumber,
      } : null);
      logger.log('Profile contact details updated successfully!');
      setError('Profile updated successfully!'); // Success message
      setTimeout(() => {
        setError(null);
      }, 3000); // Clear message after 3 seconds

      if (onRefresh) {
        await onRefresh();
      }

    } catch (error: any) {
      logger.error('Error saving profile:', error);
      setError(`Failed to save profile: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="bg-[var(--portal-card-bg)] border-[var(--portal-border)] mb-6">
        <CardHeader>
          <CardTitle className="text-gold-500">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-6">
              {profile.subscription_status === 'pro' && (
                <>
                  {/* Subscription Status Alert */}
                  {getSubscriptionStatus() && (
                    <Alert className={`${getSubscriptionStatus()?.bgColor} border-${getSubscriptionStatus()?.borderColor} ${getSubscriptionStatus()?.color}`}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {getSubscriptionStatus()?.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
              
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <label htmlFor="avatar-upload" className="cursor-pointer relative group">
                  <Avatar className="w-24 h-24 border-2 border-gold-500">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-gold-900 text-white w-full h-full flex items-center justify-center text-3xl font-bold">
                        {profile.first_name?.charAt(0) || ''}{profile.last_name?.charAt(0) || ''}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      Change
                    </div>
                  </Avatar>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-black">
                    {profile.first_name} {profile.last_name}
                  </h3>
                    {profile.subscription_status === 'pro' && (
                      <span className="bg-gold-500/10 text-gold-500 text-xs font-semibold px-2 py-1 rounded-full border border-gold-500/20">
                        PRO
                      </span>
                    )}
                  </div>
                  {profile.career && (
                    <p className="text-[var(--portal-text-secondary)] mb-2">
                      {profile.career}
                    </p>
                  )}
                  {profile.phone_number && (
                    <p className="text-[var(--portal-text-secondary)]">
                      Phone: {profile.phone_number}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Subscription Details */}
              <div className="bg-[var(--portal-bg)] border border-[var(--portal-border)] rounded-md p-4 space-y-4">
                <h4 className="font-semibold text-gold-500">Subscription Details</h4>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center py-2 border-b border-[var(--portal-border)]">
                    <span className="text-[var(--portal-text-secondary)]">Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${profile.subscription_status === 'pro' ? 'text-gold-500' : 'text-[var(--portal-text)]'}`}>
                        {profile.subscription_status === 'pro' ? 'PRO' : 'Free Tier'}
                      </span>
                      {profile.subscription_status === 'pro' && getTimeRemaining(profile) && (
                        <span className="text-xs text-[var(--portal-text-secondary)]">
                          ({getTimeRemaining(profile)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[var(--portal-border)]">
                    <span className="text-[var(--portal-text-secondary)]">Plan</span>
                    <span className="font-semibold text-[var(--portal-text)]">
                      {profile.subscription_status === 'pro' && profile.subscription_details?.plan_id
                        ? profile.subscription_details.plan_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        : PLAN_DETAILS['free'].name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[var(--portal-border)]">
                    <span className="text-[var(--portal-text-secondary)]">Monthly Price</span>
                    <span className="font-semibold text-[var(--portal-text)]">
                      {profile.subscription_status === 'pro' && profile.subscription_details?.amount
                        ? `${profile.subscription_details.amount} ETB`
                        : `${PLAN_DETAILS['free'].price} ETB`}
                    </span>
                  </div>
                  {(profile.subscription_details?.end_date || profile.subscription_end_date) && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-[var(--portal-border)]">
                        <span className="text-[var(--portal-text-secondary)]">Next Payment Due</span>
                        <span className="font-semibold text-[var(--portal-text)]">
                          {new Date(profile.subscription_details?.end_date || profile.subscription_end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {profile.subscription_status === 'pro' && (
                        <div className="flex justify-between items-center py-2 border-b border-[var(--portal-border)]">
                          <span className="text-[var(--portal-text-secondary)]">Subscription Period</span>
                          <span className="font-semibold text-[var(--portal-text)]">
                            {profile.subscription_details?.start_date ? new Date(profile.subscription_details.start_date).toLocaleDateString() : ''} - {new Date(profile.subscription_details?.end_date || profile.subscription_end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Listing Limit Section */}
              <div className="bg-[var(--portal-bg)] border border-[var(--portal-border)] rounded-md p-4 space-y-3">
                <h4 className="font-semibold text-gold-500">Listing Allowance</h4>
                <p className="text-[var(--portal-text-secondary)]">
                  Your {formatLimitType(listingLimit.type)} limit: 
                  <span className="font-semibold text-[var(--portal-text)]"> {listingLimit.value} listings</span>
                </p>
                <div className="w-full bg-[var(--portal-bg)] border border-[var(--portal-border)] rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full"
                    style={{ 
                      width: `${getUsagePercentage()}%`,
                      backgroundColor: getUsagePercentage() >= 90 
                        ? '#dc2626' // red-600 - more visible
                        : getUsagePercentage() >= 75 
                          ? '#d97706' // amber-600 - more visible
                          : '#059669' // emerald-600 - green for good usage
                    }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--portal-text-secondary)]">
                    {listings.length} used of {listingLimit.value} listings
                  </span>
                  <span className="text-xs text-[var(--portal-text-secondary)]">
                    {getUsagePercentage()}% used
                  </span>
                </div>
                {getUsagePercentage() >= 75 && (
                  <div 
                    className="text-sm mt-2"
                    style={{
                      color: getUsagePercentage() >= 90 ? '#dc2626' : '#d97706'
                    }}
                  >
                    {getUsagePercentage() >= 90 
                      ? "You're almost at your listing limit! Consider upgrading your plan."
                      : "You're approaching your listing limit."}
                  </div>
                )}
              </div>

              {/* Public Profile URL Section */}
              <div className="bg-[var(--portal-bg)] border border-[var(--portal-border)] rounded-md p-4 space-y-4">
                <h4 className="font-semibold text-gold-500">Public Profile</h4>
                <p className="text-[var(--portal-text-secondary)]">Share your public agent profile with others.</p>
                <div className="flex items-center gap-2">
                  <span className="truncate text-[var(--portal-text)]">{getPublicProfileUrl()}</span>
                  <Button variant="ghost" size="icon" onClick={handleCopyUrl} className="flex-shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                </div>
                <Button variant="outline" className="w-full bg-[var(--portal-button-bg)] text-[var(--portal-button-text)] hover:bg-[var(--portal-button-hover)] border-none" asChild>
                  <Link to={getPublicProfileUrl()} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Public Profile
                  </Link>
                </Button>
              </div>

              {/* Contact Information Section */}
              <div className="bg-[var(--portal-bg)] border border-[var(--portal-border)] rounded-md p-4 space-y-4">
                <h4 className="font-semibold text-gold-500">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="whatsapp-link" className="block text-sm font-medium text-[var(--portal-text-secondary)] mb-1">
                      WhatsApp Link
                    </label>
                    <Input
                      id="whatsapp-link"
                      type="url"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="Enter WhatsApp link"
                      className="bg-[var(--portal-bg-hover)] border-[var(--portal-border)] text-[var(--portal-text)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="telegram-link" className="block text-sm font-medium text-[var(--portal-text-secondary)] mb-1">
                      Telegram Link
                    </label>
                    <Input
                      id="telegram-link"
                      type="url"
                      value={telegramLink}
                      onChange={(e) => setTelegramLink(e.target.value)}
                      placeholder="Enter Telegram link"
                      className="bg-[var(--portal-bg-hover)] border-[var(--portal-border)] text-[var(--portal-text)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone-number" className="block text-sm font-medium text-[var(--portal-text-secondary)] mb-1">
                      Phone Number
                    </label>
                    <Input
                      id="phone-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                      className="bg-[var(--portal-bg-hover)] border-[var(--portal-border)] text-[var(--portal-text)]"
                    />
                  </div>
                </div>
                <Button onClick={handleProfileSave} disabled={isSaving} className="w-full bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-[var(--portal-button-text)] mb-0 sm:mb-24">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Contact Information'
                  )}
                </Button>
                {error && error.includes('successfully!') && (
                  <Alert className="bg-green-500/10 border-green-500/20 text-green-500">
                    <Check className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {error && !error.includes('successfully!') && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ) : (
            !loading && !error && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No profile information available. Please ensure you are logged in.</p>
              </div>
            )
          )}
          {loading && (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
          )}
          {error && !error.includes('successfully!') && ( // Display error only if not a success message
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AccountInfo;

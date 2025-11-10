import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';

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

interface UserEditModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const UserEditModal = ({ user, open, onOpenChange, onUserUpdated }: UserEditModalProps) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
        status: user.status || 'inactive',
      career: user.career || '',
        subscription_status: user.subscription_status || 'free',
        subscription_end: user.subscription_end,
        listing_limit: user.listing_limit || { type: 'month', value: 10 },
        social_links: user.social_links || {}
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !formData) return;

    setLoading(true);
    try {
      // Validate required fields
      if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
        toast.error('First name and last name are required');
        return;
      }

      // Calculate subscription end date if changing to pro
      let subscription_end = formData.subscription_end;
      if (formData.subscription_status === 'pro' && user.subscription_status === 'free') {
        const now = new Date();
        subscription_end = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      } else if (formData.subscription_status === 'free') {
        subscription_end = null;
      }

      // Prepare update data with proper null handling
      const updateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number?.trim() || null,
        status: formData.status || 'inactive',
        career: formData.career?.trim() || null,
        subscription_status: formData.subscription_status || 'free',
        subscription_end,
        listing_limit: formData.listing_limit || { type: 'month', value: 10 },
        social_links: formData.social_links || {}
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('User updated successfully');
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Error updating user:', error);
      toast.error(error.message || 'Error updating user');
    } finally {
      setLoading(false);
    }
  };

  const updateSocialLink = (platform: keyof User['social_links'], value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...(prev.social_links || {}),
        [platform]: value.trim()
      }
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-white text-black">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-black font-semibold">First Name *</Label>
                  <Input
                    id="first_name"
                    className="bg-white text-black"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-black font-semibold">Last Name *</Label>
                  <Input
                    id="last_name"
                    className="bg-white text-black"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-black font-semibold">Phone Number</Label>
                  <Input
                    id="phone"
                    className="bg-white text-black"
                    value={formData.phone_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="career" className="text-black font-semibold">Career/Profession</Label>
                  <Input
                    id="career"
                    className="bg-white text-black"
                    value={formData.career || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, career: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black">Social Links</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="text-black font-semibold">Facebook</Label>
                  <Input
                    id="facebook"
                    className="bg-white text-black"
                    value={formData.social_links?.facebook || ''}
                    onChange={(e) => updateSocialLink('facebook', e.target.value)}
                    placeholder="https://facebook.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-black font-semibold">Twitter</Label>
                  <Input
                    id="twitter"
                    className="bg-white text-black"
                    value={formData.social_links?.twitter || ''}
                    onChange={(e) => updateSocialLink('twitter', e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-black font-semibold">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    className="bg-white text-black"
                    value={formData.social_links?.linkedin || ''}
                    onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-black font-semibold">Instagram</Label>
                  <Input
                    id="instagram"
                    className="bg-white text-black"
                    value={formData.social_links?.instagram || ''}
                    onChange={(e) => updateSocialLink('instagram', e.target.value)}
                    placeholder="https://instagram.com/username"
                  />
                </div>
              </div>
            </div>

            {/* Account Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black">Account Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-black font-semibold">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription" className="text-black font-semibold">Subscription Type *</Label>
                  <Select
                    value={formData.subscription_status}
                    onValueChange={(value: 'free' | 'pro') => setFormData(prev => ({ ...prev, subscription_status: value }))}
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Select subscription type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limit_type" className="text-black font-semibold">Listing Limit Type *</Label>
                  <Select
                    value={formData.listing_limit?.type}
                    onValueChange={(value: 'day' | 'week' | 'month' | 'year' | 'unlimited') => 
                      setFormData(prev => ({
                        ...prev,
                        listing_limit: {
                          type: value,
                          value: value === 'unlimited' ? undefined : (prev.listing_limit?.value || 10)
                        }
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Select limit type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="day">Per Day</SelectItem>
                      <SelectItem value="week">Per Week</SelectItem>
                      <SelectItem value="month">Per Month</SelectItem>
                      <SelectItem value="year">Per Year</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.listing_limit?.type !== 'unlimited' && (
                  <div className="space-y-2">
                    <Label htmlFor="limit_value" className="text-black font-semibold">Listing Limit Value *</Label>
                    <Input
                      id="limit_value"
                      type="number"
                      min="1"
                      className="bg-white text-black"
                      value={formData.listing_limit?.value || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        listing_limit: {
                          ...prev.listing_limit,
                          value: parseInt(e.target.value) || 10
                        }
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex flex-col md:flex-row gap-3">
          <Button
            className="bg-black text-white border-black hover:bg-gray-800 w-full md:w-auto font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto font-semibold"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditModal;

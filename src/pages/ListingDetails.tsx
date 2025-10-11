import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { createListingSlug } from "@/components/public/ListingCard";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const ListingDetails = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [listingPublicUrl, setListingPublicUrl] = useState<string | null>(null);
  
  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [progressStatus, setProgressStatus] = useState('fully_finished');
  const [downPaymentPercent, setDownPaymentPercent] = useState('');
  const [bankOption, setBankOption] = useState(false);
  const [callForPrice, setCallForPrice] = useState(false);

  // Image data from previous page
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);

  useEffect(() => {
    // Get image data from previous page
    if (location.state) {
      setMainImage(location.state.mainImage);
      setAdditionalImages(location.state.additionalImages);
    } else {
      // If no image data, redirect back to image selection
      navigate('/agent/image-selection');
    }
  }, [location.state, navigate]);

  const handleSubmit = async () => {
    if (!user) {
      alert('User not authenticated');
      return;
    }

    if (!mainImage) {
      alert('Main image is required');
      return;
    }

    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    if (!description.trim()) {
      alert('Description is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has a profile, create one if not
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
        throw new Error('Failed to verify user profile');
      }

      if (!existingProfile) {
        // Create a basic profile for the user
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            user_id: user.id,
            first_name: user.user_metadata?.first_name || 'User',
            last_name: user.user_metadata?.last_name || 'User',
            status: 'active',
            listing_limit: { type: 'month', value: 5 },
            subscription_status: 'free',
            social_links: {},
          });

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          throw new Error('Failed to create user profile. Please contact support.');
        }
      }

      // Upload main image
      const mainImageFileName = `${user.id}/${Date.now()}-main-${sanitizeFileName(mainImage.name)}`;
      const { data: mainImageData, error: mainImageError } = await supabase.storage
        .from('listing-images')
        .upload(mainImageFileName, mainImage);
        
      if (mainImageError) {
        throw mainImageError;
      }
      
      const { data: mainImagePublicUrl } = supabase.storage
        .from('listing-images')
        .getPublicUrl(mainImageFileName);

      // Upload additional images
      const additionalImageUrls: string[] = [];
      
      for (let i = 0; i < additionalImages.length; i++) {
        const file = additionalImages[i];
        const fileName = `${user.id}/${Date.now()}-${i}-${sanitizeFileName(file.name)}`;
        
        const { data: additionalImageData, error: additionalImageError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file);
          
        if (additionalImageError) {
          console.error(`Error uploading additional image ${i}:`, additionalImageError);
          continue;
        }
        
        const { data: publicUrl } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);
          
        additionalImageUrls.push(publicUrl.publicUrl);
      }

      // Insert listing into database
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: callForPrice ? null : (price ? Number(price) : null),
          city: city,
          main_image_url: mainImagePublicUrl.publicUrl,
          additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : null,
          progress_status: progressStatus,
          down_payment_percent: downPaymentPercent ? Number(downPaymentPercent) : null,
          bank_option: bankOption,
        })
        .select();

      if (listingError) {
        throw listingError;
      }
      
      console.log('Listing created successfully:', listingData);
      
      // Fetch the agent's profile to get their slug
      const { data: agentProfile, error: agentError } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', user.id)
        .single();

      if (agentError) {
        throw agentError;
      }

      const generatedListingUrl = agentProfile.slug
        ? `/${agentProfile.slug}/listing/${createListingSlug(title)}`
        : null;
      
      setListingPublicUrl(generatedListingUrl);
      setShowSuccessPopup(true);

    } catch (error: any) {
      console.error('Error creating listing:', error);
      alert(`Error creating listing: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccessPopup) {
    return (
      <div className="min-h-screen bg-[var(--portal-bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--portal-text)] mb-2">Listing Created Successfully!</h2>
          <p className="text-[var(--portal-text-secondary)] mb-6">
            Your property listing has been created and is now live.
          </p>
          <Button
            onClick={() => navigate('/agent/dashboard')}
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
            <h1 className="text-2xl font-bold text-[var(--portal-text)]">Property Details</h1>
            <p className="text-[var(--portal-text-secondary)]">Fill in the details for your property listing</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input 
                id="title"
                type="text"
                required
                placeholder="Property title"
                className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={5}
                required
                placeholder="Property description"
                className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Price (ETB)
              </label>
              <div className="flex items-center gap-3">
                <input 
                  id="price"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Price in ETB"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  autoComplete="off"
                  disabled={callForPrice}
                />
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={callForPrice}
                    onChange={e => {
                      setCallForPrice(e.target.checked);
                      if (e.target.checked) {
                        setPrice('');
                      }
                    }}
                    className="h-4 w-4 border-gray-300 rounded"
                  />
                  Call for price
                </label>
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <select 
                id="city"
                required
                className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="Addis Ababa">Addis Ababa</option>
                <option value="Arada">Arada</option>
                <option value="Bole">Bole</option>
                <option value="Gulele">Gulele</option>
                <option value="Kirkos">Kirkos</option>
                <option value="Kolfe Keranio">Kolfe Keranio</option>
                <option value="Lideta">Lideta</option>
                <option value="Nifas Silk-Lafto">Nifas Silk-Lafto</option>
                <option value="Yeka">Yeka</option>
                <option value="Akaki Kality">Akaki Kality</option>
                <option value="Addis Ketema">Addis Ketema</option>
                <option value="Alem Gena">Alem Gena</option>
                <option value="Bole Bulbula">Bole Bulbula</option>
                <option value="Gerji">Gerji</option>
                <option value="Gotera">Gotera</option>
                <option value="Kality">Kality</option>
                <option value="Kotebe">Kotebe</option>
                <option value="Lafto">Lafto</option>
                <option value="Megenagna">Megenagna</option>
                <option value="Merkato">Merkato</option>
                <option value="Saris">Saris</option>
                <option value="Saris Abo">Saris Abo</option>
                <option value="Summit">Summit</option>
                <option value="Tulu Dimtu">Tulu Dimtu</option>
                <option value="Wello Sefer">Wello Sefer</option>
              </select>
            </div>

            {/* Progress Status */}
            <div>
              <label htmlFor="progress_status" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Progress Status <span className="text-red-500">*</span>
              </label>
              <select 
                id="progress_status"
                className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all"
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value)}
              >
                <option value="excavation">Excavation (ቁፋሮ)</option>
                <option value="on_progress">On Progress</option>
                <option value="semi_finished">Semi-finished</option>
                <option value="fully_finished">Fully Finished</option>
              </select>
            </div>

            {/* Down Payment */}
            <div>
              <label htmlFor="down_payment_percent" className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Down Payment (%) <span className="text-red-500">*</span>
              </label>
              <input 
                id="down_payment_percent"
                type="number"
                min="0"
                max="100"
                placeholder="Down payment percentage"
                className="w-full px-4 py-3 rounded-lg bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border border-[var(--portal-input-border)] focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 outline-none transition-all"
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(e.target.value)}
              />
            </div>

            {/* Bank Option */}
            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bank_option"
                  className="h-4 w-4 rounded border-[var(--portal-input-border)] text-gold-500 focus:ring-gold-500"
                  checked={bankOption}
                  onChange={(e) => setBankOption(e.target.checked)}
                />
                <label htmlFor="bank_option" className="text-sm font-medium text-[var(--portal-label-text)]">
                  Bank Option Available
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-[var(--portal-border)]">
              <Button
                variant="outline"
                onClick={() => navigate('/agent/image-selection')}
                className="border-[var(--portal-border)] text-[var(--portal-text-secondary)] hover:bg-[var(--portal-bg-hover)]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Images
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Listing...
                  </>
                ) : (
                  'Create Listing'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetails;

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { uploadToR2, uploadMultipleToR2 } from '@/lib/upload';
import { useObjectUrl, useObjectUrls } from '@/hooks/useObjectUrl';
import { logger } from '@/lib/logger';
import { sanitizeInput, sanitizeUrl, sanitizePhoneNumber, sanitizeHtml } from '@/lib/sanitize';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X, Plus } from 'lucide-react';

const listingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.preprocess((val) => val === '' || val === undefined ? undefined : Number(val), z.number().positive('Price must be a positive number').optional()),
  city: z.enum([
    'Addis Ababa',
    'Arada',
    'Bole',
    'Gulele',
    'Kirkos',
    'Kolfe Keranio',
    'Lideta',
    'Nifas Silk-Lafto',
    'Yeka',
    'Akaki Kality',
    'Addis Ketema',
    'Alem Gena',
    'Bole Bulbula',
    'Gerji',
    'Gotera',
    'Kality',
    'Kotebe',
    'Lafto',
    'Megenagna',
    'Merkato',
    'Saris',
    'Saris Abo',
    'Summit',
    'Tulu Dimtu',
    'Wello Sefer'
  ], {
    required_error: 'Please select a city',
  }),
  phone_number: z.string().optional(),
  whatsapp_link: z.string().optional(),
  telegram_link: z.string().optional(),
  callForPrice: z.boolean().optional(),
  bank_option: z.boolean().optional()
});

type ListingFormValues = z.infer<typeof listingSchema>;

interface EditListingFormProps {
  listingId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const EditListingForm = ({ listingId, onSuccess, onCancel }: EditListingFormProps) => {
  const { user, refreshSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [existingMainImageUrl, setExistingMainImageUrl] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [existingAdditionalImageUrls, setExistingAdditionalImageUrls] = useState<string[]>([]);
  const [editCount, setEditCount] = useState(0);
  
  // Use hooks to safely manage object URLs
  const newMainImagePreview = useObjectUrl(mainImage);
  const newAdditionalImagePreviews = useObjectUrls(additionalImages);
  
  // Use new preview if available, otherwise use existing
  const mainImagePreview = newMainImagePreview || existingMainImageUrl;
  
  // Combine existing and new previews
  const allAdditionalPreviews = [...existingAdditionalImageUrls, ...newAdditionalImagePreviews];
  

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: undefined,
      city: 'Addis Ababa',
      phone_number: '',
      whatsapp_link: '',
      telegram_link: '',
      callForPrice: false,
      bank_option: false
    }
  });

  // Fetch listing data
  useEffect(() => {
    const fetchListing = async () => {
      if (!user || !listingId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (!data) {
          onCancel();
          return;
        }

        if (data.edit_count >= 2) {
          alert('You have reached the maximum number of edits (2) for this listing.');
          onCancel();
          return;
        }

        setEditCount(data.edit_count || 0);
        
        // Populate form fields
        form.reset({
          title: data.title,
          description: data.description || '',
          price: data.price || undefined,
          city: data.city || 'Addis Ababa',
          phone_number: data.phone_number || '',
          whatsapp_link: data.whatsapp_link || '',
          telegram_link: data.telegram_link || '',
          callForPrice: data.price === null,
          bank_option: data.bank_option || false
        });

        // Set existing images
        if (data.main_image_url) {
          setExistingMainImageUrl(data.main_image_url);
        }

        if (data.additional_image_urls && Array.isArray(data.additional_image_urls)) {
          setExistingAdditionalImageUrls(data.additional_image_urls);
        }
      } catch (error: any) {
        logger.error('Error fetching listing:', error);
        onCancel();
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId, user, form, onCancel]);

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMainImage(file);
      setExistingMainImageUrl(null); // Clear existing image URL when new image is selected
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAdditionalImages(prev => [...prev, ...filesArray]);
    }
  };

  const removeMainImage = () => {
    setMainImage(null);
    setExistingMainImageUrl(null);
  };

  const removeAdditionalImage = (index: number) => {
    // Check if this is an existing image or a new one
    const isExistingImage = index < existingAdditionalImageUrls.length;
    
    if (isExistingImage) {
      // Remove from existing images
      setExistingAdditionalImageUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      // Calculate the index in the new images array
      const newImageIndex = index - existingAdditionalImageUrls.length;
      setAdditionalImages(prev => prev.filter((_, i) => i !== newImageIndex));
    }
  };

  const onSubmit = async (values: ListingFormValues) => {
    if (editCount >= 2) {
      alert('You have reached the maximum number of edits (2) for this listing.');
      return;
    }

    if (!user) {
      return;
    }

    if (!mainImagePreview) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Refresh the auth session to get a new token
      await refreshSession();
      
      let mainImageUrl = existingMainImageUrl;
      const additionalImageUrls: string[] = [...existingAdditionalImageUrls];

      // 1. Upload main image to R2 if changed
      if (mainImage) {
        mainImageUrl = await uploadToR2(mainImage, 'listing-images');
      }

      // 2. Upload additional images to R2 if any new ones were added
      if (additionalImages.length > 0) {
        const uploadedUrls = await uploadMultipleToR2(additionalImages, 'listing-images');
        additionalImageUrls.push(...uploadedUrls);
      }

      // Log exact values before update
      logger.log('[EditForm] Form values before update:', values);
      logger.log('[EditForm] Price before update:', values.price);
      logger.log('[EditForm] Price type before update:', typeof values.price);
      
      // Ensure price is a clean number or null if callForPrice
      const exactPrice = values.callForPrice ? null : Number(values.price);
      logger.log('[EditForm] Exact price to store:', exactPrice);
      logger.log('[EditForm] Exact price type:', typeof exactPrice);
      logger.log('[EditForm] Price toString():', exactPrice !== null ? exactPrice.toString() : 'null');
      
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .update({
          title: values.title,
          description: values.description,
          price: exactPrice,
          city: values.city,
          main_image_url: mainImageUrl,
          additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : null,
          phone_number: values.phone_number || null,
          whatsapp_link: values.whatsapp_link || null,
          telegram_link: values.telegram_link || null,
          bank_option: values.bank_option || false,
          edit_count: editCount + 1
        })
        .eq('id', listingId)
        .eq('user_id', user.id)
        .select('id, title, description, price, city, main_image_url, additional_image_urls, phone_number, whatsapp_link, telegram_link, bank_option, updated_at')
        .single();

      if (listingError) throw listingError;
      
      // Log the returned data
      logger.log('[EditForm] Updated listing response:', listing);
      logger.log('[EditForm] Updated price from response:', listing.price);
      logger.log('[EditForm] Updated price type:', typeof listing.price);

      onSuccess();
    } catch (error: any) {
      logger.error('Error updating listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--portal-text)]">Edit Listing</h2>
        <p className="text-sm sm:text-base text-[var(--portal-text-secondary)]">Update your property listing information</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4 text-[var(--portal-text)]">Images</h3>
              
              <div className="space-y-4">
                <div>
                  <FormLabel className="block mb-2 text-[var(--portal-label-text)]">Main Image <span className="text-red-500">*</span></FormLabel>
                  {!mainImagePreview ? (
                    <div className="border border-dashed border-[var(--portal-border)] rounded-lg p-8 text-center">
                      <label className="cursor-pointer block">
                        <Upload className="mx-auto h-8 w-8 text-[var(--portal-text-secondary)] mb-2" />
                        <span className="text-sm text-[var(--portal-text-secondary)]">Click to upload main image</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleMainImageChange}
                          disabled={isSubmitting}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden">
                      <img 
                        src={mainImagePreview} 
                        alt="Main image preview" 
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeMainImage}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div>
                  <FormLabel className="block mb-2 text-[var(--portal-label-text)]">Additional Images</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {allAdditionalPreviews.map((preview, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden">
                        <img 
                          src={preview} 
                          alt={`Additional image ${index + 1}`} 
                          className="w-full h-24 object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeAdditionalImage(index)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {allAdditionalPreviews.length < 5 && (
                      <div className="border border-dashed border-[var(--portal-border)] rounded-lg flex items-center justify-center h-24">
                        <label className="cursor-pointer block w-full h-full flex flex-col items-center justify-center">
                          <Plus className="h-5 w-5 text-[var(--portal-text-secondary)] mb-1" />
                          <span className="text-xs text-[var(--portal-text-secondary)]">Add more</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            multiple 
                            onChange={handleAdditionalImagesChange}
                            disabled={isSubmitting}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-medium mb-4 text-[var(--portal-text)]">Property Details</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">Title <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter property title" 
                        {...field}
                        onChange={(e) => field.onChange(sanitizeInput(e.target.value))}
                        className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">Price <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter property price" 
                        {...field}
                        value={field.value === undefined ? '' : field.value.toString()}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          // Only allow numeric values
                          if (rawValue === '' || /^\d+$/.test(rawValue)) {
                            const value = rawValue === '' ? undefined : parseInt(rawValue, 10);
                            logger.log('[EditForm] Raw input value:', rawValue);
                            logger.log('[EditForm] Parsed value:', value);
                            logger.log('[EditForm] Value type:', typeof value);
                            field.onChange(value);
                          }
                        }}
                        className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">City <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <select {...field} className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)] rounded-md">
                        {/* Add city options here */}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">Description <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter property description" 
                        {...field} 
                        className="min-h-32 bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4 text-[var(--portal-text)]">Contact Information</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact phone" {...field} className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="whatsapp_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--portal-label-text)]">WhatsApp Link</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter WhatsApp link" {...field} className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="telegram_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[var(--portal-label-text)]">Telegram Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Telegram link" {...field} className="bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] border-[var(--portal-input-border)]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <FormField name="callForPrice" control={form.control} render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4" />
                  </FormControl>
                  <FormLabel className="text-red-600 font-semibold cursor-pointer mb-0">Call for Price</FormLabel>
                </FormItem>
              )} />

              <FormField name="bank_option" control={form.control} render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="w-4 h-4" />
                  </FormControl>
                  <FormLabel className="text-[var(--portal-text)] font-semibold cursor-pointer mb-0">Bank Option Available</FormLabel>
                </FormItem>
              )} />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[var(--portal-button-bg)] text-[var(--portal-button-text)] hover:bg-[var(--portal-button-hover)] border-none"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[var(--portal-button-bg)] text-[var(--portal-button-text)] hover:bg-[var(--portal-button-hover)]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Listing
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditListingForm; 
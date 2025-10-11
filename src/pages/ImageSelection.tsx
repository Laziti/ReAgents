import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Plus, ArrowLeft, ArrowRight } from 'lucide-react';

const ImageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAdditionalImages(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setAdditionalImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeMainImage = () => {
    setMainImage(null);
    setMainImagePreview(null);
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleNext = () => {
    if (!mainImage) {
      alert('Please upload a main image for the property');
      return;
    }

    // Pass image data to the next page
    navigate('/agent/listing-details', {
      state: {
        mainImage,
        mainImagePreview,
        additionalImages,
        additionalImagePreviews
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--portal-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/agent/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--portal-text)]">Select Images</h1>
            <p className="text-[var(--portal-text-secondary)]">Upload images for your property listing</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[var(--portal-card-bg)] rounded-lg shadow-lg border border-[var(--portal-border)] p-6">
          <div className="space-y-8">
            {/* Main Image Section */}
            <div>
              <label className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Main Image <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-[var(--portal-border)] rounded-lg bg-[var(--portal-bg)]/40">
                <div className="space-y-1 text-center">
                  {mainImagePreview ? (
                    <div className="relative">
                      <img 
                        src={mainImagePreview} 
                        alt="Property preview" 
                        className="mx-auto h-64 object-cover rounded-md shadow-sm" 
                      />
                      <button
                        type="button"
                        onClick={removeMainImage}
                        className="absolute top-2 right-2 p-1.5 bg-[var(--portal-button-bg)] text-white rounded-full hover:bg-[var(--portal-button-hover)] transition-colors shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-20 w-20 text-[var(--portal-text-secondary)]"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                        <label
                          htmlFor="main-image-upload"
                          className="relative cursor-pointer bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-[var(--portal-button-text)] font-medium rounded-md px-4 py-2 transition-colors focus-within:outline-none inline-flex items-center"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          <span>Upload main image</span>
                          <input
                            id="main-image-upload"
                            name="main-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMainImageChange}
                          />
                        </label>
                        <p className="text-sm text-[var(--portal-text-secondary)]">or drag and drop</p>
                      </div>
                      <p className="text-xs text-[var(--portal-text-secondary)] mt-2">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Images Section */}
            <div>
              <label className="block text-sm font-medium text-[var(--portal-label-text)] mb-2">
                Additional Images (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {additionalImagePreviews.map((preview, index) => (
                  <div key={index} className="relative h-40 border rounded-lg overflow-hidden shadow-sm bg-[var(--portal-bg)]/40">
                    <img 
                      src={preview} 
                      alt={`Additional image ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-[var(--portal-button-bg)] text-white rounded-full hover:bg-[var(--portal-button-hover)] transition-colors shadow-md"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {additionalImages.length < 5 && (
                  <label
                    key={`additional-image-upload-${additionalImages.length}`}
                    htmlFor="additional-image-upload"
                    className="h-40 border-2 border-dashed border-[var(--portal-border)] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--portal-bg-hover)] transition-colors bg-[var(--portal-bg)]/40"
                  >
                    <Plus className="h-8 w-8 text-gold-500" />
                    <span className="text-sm text-[var(--portal-text-secondary)] mt-2 font-medium">Add Image</span>
                    <input
                      id="additional-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAdditionalImagesChange}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-[var(--portal-text-secondary)] mt-3">
                You can upload up to 5 additional images for better property presentation
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-[var(--portal-border)]">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-[var(--portal-border)] text-[var(--portal-text-secondary)] hover:bg-[var(--portal-bg-hover)]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!mainImage}
                className="bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-white"
              >
                Next: Property Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSelection;

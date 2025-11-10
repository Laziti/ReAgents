import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Phone, MessageCircle, ChevronLeft, ChevronRight, MapPin, Calendar, Tag, ImageIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

interface ListingDetailCardProps {
  listing: {
    title: string;
    price?: number;
    location?: string;
    description?: string;
    created_at: string;
    main_image_url?: string;
    additional_image_urls?: string[];
    phone_number?: string;
    whatsapp_link?: string;
    telegram_link?: string;
    status?: string;
  };
  onClose: () => void;
}

const ListingDetailCard = ({ listing, onClose }: ListingDetailCardProps) => {
  // Combine main image and additional images
  const allImages = [
    listing.main_image_url,
    ...(listing.additional_image_urls || [])
  ].filter(Boolean) as string[];
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-3 md:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="bg-[var(--portal-card-bg)] rounded-none sm:rounded-xl md:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl mx-auto flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
          <h3 className="text-xl sm:text-2xl font-bold text-[var(--portal-text)]">Listing Details</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-[var(--portal-highlight)]"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <div className="p-4 sm:p-5 md:p-6 space-y-6 sm:space-y-8">
            {/* Image Gallery Section - Full Width */}
            <div className="w-full">
              {allImages.length > 0 ? (
                <div className="relative w-full aspect-video sm:aspect-[16/10] bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden">
                  <img 
                    src={allImages[currentImageIndex]} 
                    alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-2.5 shadow-lg transition-all z-10 touch-manipulation"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-2.5 shadow-lg transition-all z-10 touch-manipulation"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                      
                      {/* Image Counter */}
                      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
                        {currentImageIndex + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video sm:aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto" />
                    </div>
                    <p className="text-sm sm:text-base text-[var(--portal-text-secondary)]">No image available</p>
                  </div>
                </div>
              )}
              
              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 overflow-x-auto pb-2 scrollbar-hide">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index 
                          ? 'border-red-600 ring-2 ring-red-600/30 scale-105' 
                          : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={image} 
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4 sm:space-y-6">
              {/* Title */}
              <div>
                <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--portal-text)] mb-2 sm:mb-3 leading-tight">
                  {listing.title}
                </h4>
              </div>

              {/* Price and Location Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg sm:rounded-xl border border-red-100">
                <div className="flex-1">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 mb-1">
                    {listing.price ? formatCurrency(listing.price) : 'Price not specified'}
                  </div>
                  {listing.location && (
                    <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{listing.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm sm:text-base font-semibold ${
                    listing.status === 'active' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    <Tag className="h-4 w-4" />
                    {listing.status || 'pending'}
                  </span>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--portal-text-secondary)]">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Created on {format(new Date(listing.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </div>

            {/* Description Section */}
            <div className="w-full">
              <h4 className="text-lg sm:text-xl font-semibold text-[var(--portal-text)] mb-3 sm:mb-4 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-red-600"></div>
                Description
              </h4>
              <div className="p-4 sm:p-5 md:p-6 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                <p 
                  className="text-sm sm:text-base md:text-lg text-[var(--portal-text-secondary)] whitespace-pre-wrap break-words leading-relaxed"
                  style={{ 
                    wordBreak: 'break-word', 
                    overflowWrap: 'break-word',
                  }}
                >
                  {listing.description || 'No description provided'}
                </p>
              </div>
            </div>

            {/* Contact Information Section */}
            {(listing.phone_number || listing.whatsapp_link || listing.telegram_link) && (
              <div className="w-full">
                <h4 className="text-lg sm:text-xl font-semibold text-[var(--portal-text)] mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-red-600"></div>
                  Contact Information
                </h4>
                <div className="space-y-3 sm:space-y-3">
                  {listing.phone_number && (
                    <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                      </div>
                      <span className="text-sm sm:text-base text-[var(--portal-text)] break-all flex-1">
                        {listing.phone_number}
                      </span>
                    </div>
                  )}
                  {listing.whatsapp_link && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3 sm:py-4 px-4 sm:px-5 text-left border-2 hover:border-green-500 hover:bg-green-50 transition-all rounded-lg sm:rounded-xl"
                      onClick={() => window.open(listing.whatsapp_link, '_blank')}
                    >
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium flex-1">Open WhatsApp Chat</span>
                    </Button>
                  )}
                  {listing.telegram_link && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-auto py-3 sm:py-4 px-4 sm:px-5 text-left border-2 hover:border-blue-500 hover:bg-blue-50 transition-all rounded-lg sm:rounded-xl"
                      onClick={() => window.open(listing.telegram_link, '_blank')}
                    >
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <span className="text-sm sm:text-base font-medium flex-1">Open Telegram Chat</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-4 sm:p-5 md:p-6 border-t border-[var(--portal-border)] bg-[var(--portal-card-bg)]">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="min-w-[100px] sm:min-w-[120px] h-10 sm:h-11 text-sm sm:text-base rounded-lg sm:rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailCard; 
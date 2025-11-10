import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Briefcase, Award, Calendar, Building2, BadgeCheck, Share2, MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Check } from 'lucide-react';

interface ListingCategory {
  id: string;
  label: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  location?: string;
  city?: string;
  main_image_url?: string;
  description?: string;
  created_at?: string;
  progress_status?: 'excavation' | 'on_progress' | 'semi_finished' | 'fully_finished';
  bank_option?: boolean;
}

interface AgentProfileHeaderProps {
  firstName: string;
  lastName: string;
  career?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  description?: string;
  experience?: string;
  email?: string;
  location?: string;
  whatsappLink?: string;
  telegramLink?: string;
  listings?: Listing[];
}

const progressStatusLabels: Record<string, string> = {
  excavation: 'Excavation',
  on_progress: 'On Progress',
  semi_finished: 'Semi-finished',
  fully_finished: 'Fully Finished',
};

const priceRanges = [
  { id: 'lt1m', label: '< 1M ETB', min: 0, max: 1_000_000 },
  { id: '1m-3m', label: '1M - 3M ETB', min: 1_000_000, max: 3_000_000 },
  { id: '3m-5m', label: '3M - 5M ETB', min: 3_000_000, max: 5_000_000 },
  { id: '5m-10m', label: '5M - 10M ETB', min: 5_000_000, max: 10_000_000 },
  { id: 'gt10m', label: '> 10M ETB', min: 10_000_000, max: Infinity },
];

const AgentProfileHeader = ({
  firstName,
  lastName,
  career,
  phoneNumber,
  avatarUrl,
  description,
  experience,
  email,
  location,
  whatsappLink,
  telegramLink,
  listings = [],
}: AgentProfileHeaderProps) => {
  // Default description if none provided
  const agentDescription = description || `${firstName} ${lastName} is a trusted real estate agent specializing in finding the perfect properties for clients.`;

  // Extract unique cities
  const cities = Array.from(new Set(listings.map(l => l.city).filter(Boolean)));
  // Extract unique progress statuses
  const progressStatuses = Array.from(new Set(listings.map(l => l.progress_status).filter(Boolean)));
  // Bank options
  const hasBankOption = listings.some(l => l.bank_option);
  const hasNoBankOption = listings.some(l => l.bank_option === false);
  // Price range categories present in listings
  const priceRangeIds = new Set<string>();
  listings.forEach(l => {
    const range = priceRanges.find(r => l.price >= r.min && l.price < r.max);
    if (range) priceRangeIds.add(range.id);
  });

  const isMobile = useIsMobile();
  const [copied, setCopied] = React.useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);

  // Get current profile URL
  const profileUrl = window.location.href;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Professional Real Estate Agent: ${firstName} ${lastName}\n\n${agentDescription}\n\nView properties: ${profileUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  const shareToTelegram = () => {
    const text = encodeURIComponent(`Professional Real Estate Agent: ${firstName} ${lastName}\n\n${agentDescription}\n\nView properties: ${profileUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${text}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Professional Header Card - Design System Based */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative" style={{ boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.1), 0 10px 10px -5px rgba(220, 38, 38, 0.04)' }}>
        {/* Cover Section - Overlays Top Portion */}
        <div className="w-full h-32 sm:h-40 md:h-48 relative overflow-hidden">
          <img 
            src="/Cover-page.png"
            alt="Agent Profile Cover" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        {/* Header Section - Profile Content Overlapping Cover */}
        <div className="px-6 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12 -mt-16 sm:-mt-20 md:-mt-20 lg:-mt-24 relative z-10">
          {/* Profile Section - Mobile First, Desktop Grid */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 sm:gap-8 lg:gap-8 xl:gap-12">
            {/* Profile Picture - Golden Ratio Size (96px mobile, 120px desktop) */}
            <div className="flex-shrink-0 relative z-20 lg:mt-16">
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
              <DialogTrigger asChild>
                  <div className="cursor-pointer group relative">
                  {avatarUrl ? (
                    <div className="relative">
                      <img 
                        src={avatarUrl} 
                        alt={`${firstName} ${lastName}`} 
                          className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-gray-100 shadow-lg transition-transform duration-300 group-hover:scale-105"
                      />
                        {/* Verified Badge - Positioned at golden ratio point */}
                        <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 sm:p-2 shadow-lg border-4 border-white">
                          <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                    </div>
                  ) : (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full border-4 border-gray-100 shadow-lg flex items-center justify-center bg-blue-600 text-white text-2xl sm:text-3xl font-bold transition-transform duration-300 group-hover:scale-105">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 sm:p-2 shadow-lg border-4 border-blue-600">
                          <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-none">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                      className="absolute top-4 right-4 z-50 bg-white hover:bg-gray-50"
                    onClick={() => setIsImageModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={`${firstName} ${lastName}`} 
                      className="w-full h-full max-h-[80vh] object-contain rounded-lg" 
                />
              ) : (
                      <div className="w-full h-96 flex items-center justify-center bg-gray-100 text-blue-600 text-6xl font-bold rounded-lg">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </div>
              )}
            </div>
              </DialogContent>
            </Dialog>
          </div>

            {/* Profile Information - Overlapping Cover on Desktop */}
            <div className="flex-1 w-full text-center lg:text-left relative z-20 lg:mt-16">
              <div className="space-y-4 sm:space-y-5">
                {/* Name & Badge - Overlapping Cover on Desktop */}
                <div className="space-y-3">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-3 sm:gap-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                      {firstName} {lastName}
                    </h1>
                    <Badge className="bg-blue-600 text-white border-none px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-md">
                      Verified Agent
                    </Badge>
                  </div>
              
                    {career && (
                    <div className="flex items-center justify-center lg:justify-start gap-2.5">
                      <Briefcase className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <p className="text-base sm:text-lg lg:text-xl text-slate-700 font-semibold">
                    {career}
                  </p>
                      </div>
                    )}
                </div>

                    {location && (
                  <div className="flex items-center justify-center lg:justify-start gap-2.5">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm sm:text-base text-slate-600 font-medium">
                    {location}
                  </p>
                </div>
              )}

                {/* Description - Below Cover (White Section) */}
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 lg:mt-8">
                    {agentDescription}
                </p>
              </div>
            </div>
          </div>
          </div>
                  
        {/* Contact Section - All Buttons in One Row */}
        <div className="px-6 sm:px-8 lg:px-12 py-6 sm:py-8 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3 sm:space-y-4">
            {/* All Contact Buttons in One Row - Mobile & Desktop */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Call Button */}
              {phoneNumber ? (
              <Button 
                  className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-4 sm:py-5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]"
                onClick={() => window.open(`tel:${phoneNumber}`)}
              >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs">Call</span>
                </Button>
              ) : (
                <div className="w-full py-4 sm:py-5 rounded-xl bg-gray-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">No Call</span>
                </div>
              )}
              
              {/* WhatsApp Button */}
              {whatsappLink ? (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 sm:py-5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]"
                  onClick={() => window.open(whatsappLink, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs">WhatsApp</span>
                      </Button>
              ) : (
                <div className="w-full py-4 sm:py-5 rounded-xl bg-gray-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">No WA</span>
                </div>
              )}
              
              {/* Telegram Button */}
              {telegramLink ? (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 sm:py-5 rounded-xl font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]"
                  onClick={() => window.open(telegramLink, '_blank')}
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[10px] sm:text-xs">Telegram</span>
                </Button>
              ) : (
                <div className="w-full py-4 sm:py-5 rounded-xl bg-gray-200 flex flex-col items-center justify-center gap-1.5 min-h-[52px] sm:min-h-[56px]">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">No TG</span>
                </div>
              )}
            </div>
            
            {/* Share Button - Secondary Action */}
                  <Popover>
                    <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-slate-700 border-2 border-gray-200 hover:border-gray-300 py-4 sm:py-5 rounded-xl font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2.5 min-h-[52px] sm:min-h-[56px]"
                >
                  <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Share Profile</span>
                      </Button>
                    </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-white border-2 border-gray-200 shadow-xl rounded-xl" align="center">
                      <div className="grid gap-2">
                        <Button
                          variant="ghost"
                    className="justify-start text-slate-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg py-3 px-4 h-auto"
                          onClick={copyToClipboard}
                        >
                    <Copy className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left">{copied ? 'Copied!' : 'Copy Link'}</span>
                    {copied && <Check className="h-4 w-4 ml-2 text-green-600 flex-shrink-0" />}
                        </Button>
                        <Button
                          variant="ghost"
                    className="justify-start text-slate-700 hover:bg-green-50 active:bg-green-100 rounded-lg py-3 px-4 h-auto"
                          onClick={shareToWhatsApp}
                        >
                    <MessageCircle className="h-4 w-4 mr-3 text-green-600 flex-shrink-0" />
                    <span className="flex-1 text-left">Share on WhatsApp</span>
                        </Button>
                        <Button
                          variant="ghost"
                    className="justify-start text-slate-700 hover:bg-blue-50 active:bg-blue-100 rounded-lg py-3 px-4 h-auto"
                          onClick={shareToTelegram}
                        >
                    <Send className="h-4 w-4 mr-3 text-blue-600 flex-shrink-0" />
                    <span className="flex-1 text-left">Share on Telegram</span>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AgentProfileHeader;

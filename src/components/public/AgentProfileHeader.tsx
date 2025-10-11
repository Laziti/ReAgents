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
      className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-4 md:mt-8"
    >
      {/* Professional Header with Gradient */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 md:px-8 py-6 md:py-8">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 0),
                             radial-gradient(circle at 75% 75%, white 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
              <DialogTrigger asChild>
                <div className="cursor-pointer group">
                  {avatarUrl ? (
                    <div className="relative">
                      <img 
                        src={avatarUrl} 
                        alt={`${firstName} ${lastName}`} 
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 rounded-full border-2 border-white/30 group-hover:border-white/50 transition-colors duration-300"></div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 shadow-2xl flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700 text-white text-2xl md:text-3xl font-bold group-hover:scale-105 transition-transform duration-300">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-none">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white"
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
                    <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-red-500 text-6xl font-bold rounded-lg">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Profile Information */}
          <div className="flex-1 text-center md:text-left text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
                {firstName} {lastName}
              </h1>
              
              {career && (
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-blue-300" />
                  <p className="text-base text-blue-100 font-medium">
                    {career}
                  </p>
                </div>
              )}

              {location && (
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-green-300" />
                  <p className="text-sm text-green-100">
                    {location}
                  </p>
                </div>
              )}

              {description && (
                <p className="text-gray-200 text-sm md:text-base leading-relaxed max-w-2xl mx-auto md:mx-0">
                  {agentDescription}
                </p>
              )}
            </motion.div>
          </div>

          {/* Contact Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {phoneNumber && (
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                onClick={() => window.open(`tel:${phoneNumber}`)}
              >
                <Phone className="h-5 w-5" />
                Call Now
              </Button>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 bg-white border border-gray-200 shadow-xl rounded-lg">
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Link'}
                    {copied && <Check className="h-4 w-4 ml-auto text-green-500" />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                    onClick={shareToWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                    onClick={shareToTelegram}
                  >
                    <Send className="h-4 w-4 mr-2 text-blue-500" />
                    Telegram
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

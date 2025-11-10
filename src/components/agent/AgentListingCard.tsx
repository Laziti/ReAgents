import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ImageIcon, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentListingCardProps {
  id: string;
  title: string;
  location?: string;
  mainImageUrl?: string;
  agentSlug?: string;
  description?: string;
  createdAt?: string;
  expiresAt?: string;
  views?: number;
  onViewDetails?: () => void;
  progressStatus?: 'excavation' | 'on_progress' | 'semi_finished' | 'fully_finished';
  bankOption?: boolean;
}

export const createListingSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const progressStatusLabels: Record<string, string> = {
  excavation: 'Excavation',
  on_progress: 'On Progress',
  semi_finished: 'Semi-finished',
  fully_finished: 'Fully Finished',
};

const AgentListingCard = ({
  id,
  title,
  location,
  mainImageUrl,
  agentSlug,
  description,
  createdAt,
  expiresAt,
  views,
  onViewDetails,
  progressStatus,
  bankOption
}: AgentListingCardProps) => {
  // Calculate expiration status
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const isExpiringSoon = expiresAt ? {
    isSoon: new Date(expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    daysLeft: Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  } : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onClick={onViewDetails}
      className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col border border-gray-200"
    >
      {/* Image section */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-gray-100">
        {mainImageUrl ? (
          <img 
            src={mainImageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Progress status badge */}
        {progressStatus && (
          <div className="absolute top-3 left-3">
            <span className="bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-md shadow-sm">
              {progressStatusLabels[progressStatus]}
            </span>
          </div>
        )}

        {/* Expiration warning badge */}
        {isExpired && (
          <div className="absolute top-3 right-3">
            <span className="bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-md shadow-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expired
            </span>
          </div>
        )}
        {!isExpired && isExpiringSoon?.isSoon && (
          <div className="absolute top-3 right-3">
            <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-md shadow-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isExpiringSoon.daysLeft} days left
            </span>
          </div>
        )}

        {/* Views badge */}
        {views !== undefined && views > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {views}
            </span>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
          {title}
        </h3>
        
        {/* Location */}
        {location && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}
      </div>
      
      {/* Action button */}
      {onViewDetails && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <Button
            variant="default"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            View Details
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default AgentListingCard;


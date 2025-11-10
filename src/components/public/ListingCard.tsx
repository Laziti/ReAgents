import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ImageIcon, ArrowRight, Home } from 'lucide-react';

interface ListingCardProps {
  id: string;
  title: string;
  location?: string;
  mainImageUrl?: string;
  agentSlug?: string;
  description?: string;
  createdAt?: string;
  price?: number | null;
  onViewDetails?: () => void;
  progressStatus?: 'excavation' | 'on_progress' | 'semi_finished' | 'fully_finished';
  bankOption?: boolean;
}

const progressStatusLabels: Record<string, string> = {
  excavation: 'Excavation',
  on_progress: 'On Progress',
  semi_finished: 'Semi-Finished',
  fully_finished: 'Fully Finished',
};

export const createListingSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const ListingCard = ({
  id,
  title,
  location,
  mainImageUrl,
  agentSlug,
  description,
  createdAt,
  price,
  onViewDetails,
  progressStatus,
  bankOption
}: ListingCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } 
      }}
      onClick={onViewDetails}
      className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col border border-gray-200/60 hover:border-red-300/60 hover:scale-[1.02]"
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Border glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.1)',
        }}
      ></div>
      {/* Decorative background shapes */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-red-100/30 to-red-200/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-blue-100/30 to-blue-200/20 rounded-full blur-xl"></div>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Image section - Clean and minimal */}
      <div className="relative w-full h-56 sm:h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 group-hover:brightness-105 transition-all duration-500">
        {/* Progress Status badge - Red brand with white text */}
        {progressStatus && (
          <div className="absolute top-4 left-4 z-30">
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.1, y: -2 }}
              className="bg-red-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 font-bold text-xs sm:text-sm group-hover:bg-red-700 transition-colors duration-300"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{progressStatusLabels[progressStatus]}</span>
            </motion.div>
          </div>
        )}

        {/* Decorative corner shape - Enhanced on hover */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
        
        {/* Decorative bottom accent - Enhanced */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {mainImageUrl ? (
          <>
            <motion.img 
              src={mainImageUrl} 
              alt={title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
            {/* Enhanced gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Enhanced decorative vignette corners */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="h-16 w-16 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}

        {/* Enhanced hover overlay with arrow */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          {/* Enhanced decorative circles around arrow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="absolute w-24 h-24 border-2 border-white/30 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.8, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            ></motion.div>
            <motion.div 
              className="absolute w-20 h-20 border-2 border-white/40 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            ></motion.div>
          </div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -90 }}
            whileHover={{ scale: 1.1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="bg-white/25 backdrop-blur-md rounded-full p-5 border-2 border-white/40 relative z-10 shadow-2xl"
          >
            <ArrowRight className="h-7 w-7 text-white drop-shadow-lg" />
          </motion.div>
        </motion.div>
      </div>

      {/* Content section - Minimal info */}
      <div className="p-5 flex flex-col flex-grow relative z-10 group-hover:bg-gradient-to-b from-white to-red-50/20 transition-all duration-500">
        {/* Title with enhanced decorative elements */}
        <div className="relative mb-3">
          {/* Enhanced decorative underline shape */}
          <motion.div 
            className="absolute -bottom-1 left-0 h-1.5 bg-gradient-to-r from-red-500 to-red-400 rounded-full"
            initial={{ width: 0, opacity: 0 }}
            whileHover={{ width: "4rem", opacity: 1 }}
            transition={{ duration: 0.4 }}
          ></motion.div>
          
          {/* Enhanced decorative dot */}
          <motion.div 
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 0.3, type: "spring" }}
          ></motion.div>
          
          <h3 className="relative font-bold text-lg sm:text-xl text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors duration-500 drop-shadow-sm group-hover:translate-x-1 transition-transform duration-300">
            <span className="relative z-10">{title}</span>
            {/* Enhanced text shadow effect on hover */}
            <span className="absolute inset-0 text-red-600 opacity-0 group-hover:opacity-25 blur-md transition-opacity duration-500 line-clamp-2">
              {title}
            </span>
          </h3>
        </div>
        
        {/* Location - Enhanced with decorative icon background */}
        {location && (
          <motion.div 
            className="relative flex items-center text-gray-600 text-sm mb-4 pl-1"
            whileHover={{ x: 4 }}
            transition={{ duration: 0.3 }}
          >
            {/* Enhanced decorative background circle */}
            <motion.div 
              className="absolute left-0 w-7 h-7 bg-red-100 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            ></motion.div>
            <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 relative z-10 group-hover:text-red-500 group-hover:scale-110 transition-all duration-300" />
            <span className="line-clamp-1 relative z-10 group-hover:font-medium transition-all duration-300">{location}</span>
          </motion.div>
        )}

        {/* View Details hint with enhanced decorative elements - Red brand button */}
        <div className="mt-auto pt-4 border-t border-gray-100 relative">
          {/* Enhanced decorative line extension on hover */}
          <motion.div 
            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-red-500 to-red-400"
            initial={{ width: 0 }}
            whileHover={{ width: "100%" }}
            transition={{ duration: 0.4 }}
          ></motion.div>
          
          <motion.div 
            className="flex items-center justify-center bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm relative shadow-md overflow-hidden"
            whileHover={{ 
              backgroundColor: "#dc2626",
              scale: 1.02,
              boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.4)"
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <span className="relative z-10">View Details</span>
            <motion.div
              className="relative z-10 ml-2"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </motion.div>
            
            {/* Enhanced decorative arrow trail */}
            <motion.div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/40"
              initial={{ width: 0, opacity: 0 }}
              whileHover={{ width: "5rem", opacity: 1 }}
              transition={{ duration: 0.4 }}
            ></motion.div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced shine effect on hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
      ></motion.div>
      
      {/* Additional hover glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 30px rgba(239, 68, 68, 0.1)',
        }}
      ></div>
    </motion.div>
  );
};

export default ListingCard;

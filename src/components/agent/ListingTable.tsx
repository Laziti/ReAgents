import React, { useState } from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit, Eye } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import ListingDetailCard from './ListingDetailCard';
import AgentListingCard from '@/components/agent/AgentListingCard';

interface Listing {
  id: string;
  title: string;
  price?: number;
  location?: string;
  created_at: string;
  main_image_url?: string;
  additional_image_urls?: string[];
  edit_count?: number;
  description?: string;
  phone_number?: string;
  whatsapp_link?: string;
  telegram_link?: string;
  status?: string;
  expires_at?: string;
  views?: number;
  progress_status?: 'excavation' | 'on_progress' | 'semi_finished' | 'fully_finished';
}

interface ListingTableProps {
  listings: Listing[];
  onEdit: (id: string) => void;
}

const ListingTable = ({ listings, onEdit }: ListingTableProps) => {
  const navigate = useNavigate();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  return (
    <>
      <div className="bg-[var(--portal-card-bg)] rounded-md shadow border border-[var(--portal-border)]">
        {listings.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-[var(--portal-text)] mb-2">No listings found</h3>
            <p className="text-[var(--portal-text-secondary)] mb-4">You haven't created any listings yet.</p>
            <Button onClick={() => navigate('/agent/image-selection')}>Create Your First Listing</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
            {listings.map((listing) => (
              <div key={listing.id} className="relative block">
                {/* Edit Button (top right corner) */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  <button
                    type="button"
                    className={`bg-white/80 hover:bg-white shadow rounded-full p-2 transition-colors border border-[var(--portal-border)] ${((listing.edit_count ?? 0) >= 2) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={((listing.edit_count ?? 0) >= 2) ? 'No edits left' : 'Edit Listing'}
                    onClick={() => onEdit(listing.id)}
                    disabled={(listing.edit_count ?? 0) >= 2}
                  >
                    <Edit className="h-5 w-5 text-[var(--portal-accent)]" />
                  </button>
                  <span className={`mt-1 text-xs px-2 py-0.5 rounded-full border ${((listing.edit_count ?? 0) >= 2) ? 'bg-red-100 text-red-600 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                    {`Edits left: ${2 - (listing.edit_count ?? 0)}`}
                  </span>
                </div>
                <AgentListingCard
                  id={listing.id}
                  title={listing.title}
                  location={listing.location}
                  mainImageUrl={listing.main_image_url}
                  description={listing.description}
                  createdAt={listing.created_at}
                  expiresAt={listing.expires_at}
                  views={listing.views}
                  progressStatus={listing.progress_status}
                  bankOption={listing.bank_option}
                  onViewDetails={() => setSelectedListing(listing)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Popup */}
      {selectedListing && (
        <ListingDetailCard
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  );
};

export default ListingTable;

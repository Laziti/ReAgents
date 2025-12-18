import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Share2, Eye, LogOut, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { formatCareerLabel } from '@/lib/formatters';

interface AgentMobileHeaderProps {
  profile?: any;
}

const AgentMobileHeader: React.FC<AgentMobileHeaderProps> = ({ profile: profileProp }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any | null>(profileProp ?? null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profileProp) {
      setProfile(profileProp);
      return;
    }

    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [profileProp, user]);

  const profileName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email?.split('@')[0] || 'Agent';

  const profileInitial =
    profile?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A';

  const profileUrl = profile?.slug
    ? `${window.location.origin}/agent/${profile.slug}`
    : window.location.href;

  const copyProfileLink = () => {
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const shareToSocial = (platform: 'whatsapp' | 'telegram') => {
    const shareText = `Professional Real Estate Agent: ${profileName}\n\nView properties: ${profileUrl}`;

    if (platform === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    } else if (platform === 'telegram') {
      const url = `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(
        shareText,
      )}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="md:hidden">
      {/* Top Bar with User Info and Icons */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full overflow-hidden bg-red-100 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.first_name || 'Profile'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-red-600 font-semibold text-sm">{profileInitial}</span>
            )}
          </div>

          {/* User Name and Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 truncate">{profileName}</h2>
              {/* PRO Badge if applicable */}
              {profile?.subscription_status === 'pro' && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                  PRO
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {formatCareerLabel(profile?.career) || 'Agent'}
            </p>
          </div>
        </div>

        {/* Action Icons - In one row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Popover open={isShareOpen} onOpenChange={setIsShareOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-9 w-9 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-2 bg-white border-gray-200 shadow-lg rounded-lg z-[100]"
              side="bottom"
              align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="grid gap-2">
                <Button
                  variant="ghost"
                  className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                  onClick={() => {
                    copyProfileLink();
                    setIsShareOpen(false);
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Link Copied!' : 'Copy Link'}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                  onClick={() => {
                    shareToSocial('whatsapp');
                    setIsShareOpen(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-green-500" /> WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-gray-700 hover:bg-gray-50 w-full"
                  onClick={() => {
                    shareToSocial('telegram');
                    setIsShareOpen(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-2 text-blue-500" /> Telegram
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-600 hover:bg-gray-100"
            onClick={() => window.open(`/agent/${profile?.slug || ''}`, '_blank')}
          >
            <Eye className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-600 hover:bg-gray-100"
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/1c18bccf-ed41-47c5-9276-d3dce12ba107', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: 'debug-session',
                  runId: 'logout-debug',
                  hypothesisId: 'L3',
                  location: 'src/components/agent/AgentMobileHeader.tsx:126',
                  message: 'Mobile header logout icon clicked',
                  data: {},
                  timestamp: Date.now(),
                }),
              }).catch(() => {});
              // #endregion

              signOut();
            }}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentMobileHeader;



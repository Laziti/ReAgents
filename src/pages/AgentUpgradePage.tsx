import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AgentSidebar from '@/components/agent/AgentSidebar';
import UpgradeSidebar from '@/components/agent/UpgradeSidebar';
import '@/styles/portal-theme.css';

const AgentUpgradePage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('upgrade');

  // Determine active tab based on current route
  useEffect(() => {
    if (location.pathname.includes('upgrade')) {
      setActiveTab('upgrade');
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[var(--portal-bg)] overflow-hidden md:overflow-hidden">
      <AgentSidebar activeTab={activeTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 md:pb-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          <UpgradeSidebar />
        </div>
      </div>
    </div>
  );
};

export default AgentUpgradePage;


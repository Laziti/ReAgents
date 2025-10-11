import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, FileCheck, List, LogOut, CreditCard, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import '@/styles/portal-theme.css';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Logo from '/LogoBG.svg';
import LogoIcon from '/LogoIcon.svg';

const menuItems = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />, 
    label: 'Dashboard',
    path: '/admin',
  },
  {
    id: 'users',
    icon: <Users className="h-5 w-5" />, 
    label: 'User Management',
    path: '/admin/users',
  },
  {
    id: 'payments',
    icon: <CreditCard className="h-5 w-5" />, 
    label: 'Payment Approvals',
    path: '/admin/payments',
  },
  {
    id: 'listings',
    icon: <List className="h-5 w-5" />, 
    label: 'Listings',
    path: '/admin/listings',
  },
];

const AdminSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();

  // Sidebar content for desktop and sheet
  const SidebarContent = () => (
    <div className="flex flex-col h-full portal-sidebar">
      <div className="p-5 border-b border-[var(--portal-border)]">
        <div className="p-4 rounded-xl bg-[var(--portal-card-bg)] border border-[var(--portal-border)]">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-[var(--portal-accent)]/20 text-[var(--portal-accent)] flex items-center justify-center font-semibold">
              <img src={LogoIcon} alt="Admin Avatar" className="h-full w-full object-contain" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate text-black">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-black">Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <NavLink
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--portal-accent)]/20 text-black font-medium'
                      : 'text-gray-700 hover:bg-[var(--portal-bg-hover)]'
                  }`
                }
              >
                <div className={`p-1.5 rounded-md ${
                  location.pathname === item.path
                    ? 'bg-[var(--portal-accent)] text-white'
                    : 'bg-[var(--portal-card-bg)]'
                }`}>
                  {item.icon}
                </div>
                <span className="flex-1 text-black">{item.label}</span>
              </NavLink>
            </motion.div>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-5 border-t border-[var(--portal-border)]">
        <Button
          variant="outline"
          className="w-full justify-start text-left border-[var(--portal-accent)] text-white bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)] focus:bg-[var(--portal-accent)] focus:text-white active:bg-[var(--portal-accent)] active:text-white mb-4"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
        <div className="flex items-center justify-center h-28 w-full border-t border-[var(--portal-border)] pt-4">
          <img src={Logo} alt="Admin Portal Logo" className="h-full w-full object-contain" />
        </div>
      </div>
    </div>
  );

  // Mobile bottom navigation
  const mobileMenuItems = [
    { id: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Home', path: '/admin' },
    { id: 'users', icon: <Users className="h-5 w-5" />, label: 'Users', path: '/admin/users' },
    { id: 'payments', icon: <CreditCard className="h-5 w-5" />, label: 'Pay', path: '/admin/payments' },
    { id: 'listings', icon: <List className="h-5 w-5" />, label: 'Props', path: '/admin/listings' },
  ];
  const MobileNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--portal-sidebar-bg)] border-t border-[var(--portal-border)] py-2 px-4 md:hidden z-50">
      <div className="flex justify-around items-center">
        {mobileMenuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-all ${
                isActive ? 'text-[var(--portal-accent)]' : 'text-[var(--portal-text-secondary)]'
              }`
            }
          >
            <div className={`p-1.5 rounded-lg ${location.pathname === item.path ? 'bg-[var(--portal-accent)]/20' : ''}`}>
              {item.icon}
            </div>
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={signOut}
          className="flex flex-col items-center p-2 rounded-lg transition-all text-white bg-[var(--portal-accent)] focus:bg-[var(--portal-accent)] active:bg-[var(--portal-accent)]"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs mt-1 font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-72 fixed left-0 top-0 h-screen flex-shrink-0 portal-sidebar hidden md:block z-40">
        <SidebarContent />
      </div>
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </>
  );
};

export default AdminSidebar;

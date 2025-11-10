import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import PaymentApprovalSidebar from '@/components/admin/PaymentApprovalSidebar';

const AdminPaymentsPage = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full md:pl-72 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <SidebarInset>
            <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen flex flex-col">
              <div className="flex items-center border-b border-[var(--portal-border)] bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <SidebarTrigger />
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-[var(--portal-text)]">Payment Approvals</h1>
                  <p className="text-sm text-[var(--portal-text-secondary)] mt-1">Review and manage subscription payment requests</p>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-auto">
                <PaymentApprovalSidebar />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPaymentsPage; 
import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';
import AgentDashboard from './pages/AgentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import NotFound from './pages/NotFound';
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import AdminListingsPage from "./pages/AdminListingsPage";
import AgentPublicProfile from "./pages/AgentPublicProfile";
import ListingDetail from "./pages/ListingDetail";
import ReceiptUpload from "./pages/ReceiptUpload";
import ImageSelection from "./pages/ImageSelection";
import ListingDetails from "./pages/ListingDetails";
import AgentListingsPage from "./pages/AgentListingsPage";
import AgentAccountPage from "./pages/AgentAccountPage";
import AgentUpgradePage from "./pages/AgentUpgradePage";
import ErrorBoundary from "./components/ErrorBoundary";
import './styles/portal-theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Public Pages */}
      <Route path="/not-found" element={<NotFound />} />
      
      {/* Public Agent Profile Routes - These must come before protected routes */}
      <Route path="/agent/:agentSlug" element={<AgentPublicProfile />} />
      <Route path="/agent/:agentSlug/listing/:listingSlug" element={<ListingDetail />} />
      
      {/* Protected Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/listings" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminListingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/payments" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminPaymentsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Agent Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/receipt-upload" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <ReceiptUpload />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/image-selection" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <ImageSelection />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/listing-details" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <ListingDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/listings" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentListingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/account" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentAccountPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent/upgrade" 
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentUpgradePage />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

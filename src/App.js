import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Toast from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import { publicAPI } from './services/api';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import ModifierGroups from './pages/ModifierGroups';
import Modifiers from './pages/Modifiers';
import Kitchen from './pages/Kitchen';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import CustomerMenu from './pages/CustomerMenu';
import OrderTracking from './pages/OrderTracking';
import SalesReport from './pages/SalesReport';
import StoreSettings from './pages/StoreSettings';
import WhatsAppSettings from './pages/WhatsAppSettings';
import Discounts from './pages/Discounts';
import HotDeals from './pages/HotDeals';
import StaffManagement from './pages/StaffManagement';
import CustomerPointsManagement from './pages/CustomerPointsManagement';
import VoucherRewards from './pages/VoucherRewards';
import PopupBanners from './pages/PopupBanners';
import POSCounter from './pages/POSCounter';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MaintenancePage from './pages/MaintenancePage';

// Component to check maintenance mode for customer routes
const MaintenanceCheck = ({ children }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await publicAPI.getStoreSettings();
        setIsMaintenanceMode(response.data.settings.maintenance_mode === true || response.data.settings.maintenance_mode === 'true');
        setMaintenanceMessage(response.data.settings.maintenance_message || '');
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
        // On error, allow access (fail open)
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (isMaintenanceMode) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  return children;
};

// Component for role-based redirect on default route
const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, go to customer menu
  if (!user) {
    return <Navigate to="/menu" replace />;
  }

  // If user is kasir, redirect to POS
  if (user.role === 'kasir') {
    return <Navigate to="/admin/pos" replace />;
  }

  // If user is admin or other roles, redirect to dashboard
  return <Navigate to="/admin/dashboard" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
        <CustomerAuthProvider>
          <AuthProvider>
            <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<MaintenanceCheck><CustomerMenu /></MaintenanceCheck>} />
          <Route path="/track" element={<MaintenanceCheck><OrderTracking /></MaintenanceCheck>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/modifier-groups"
            element={
              <ProtectedRoute>
                <ModifierGroups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/modifiers"
            element={
              <ProtectedRoute>
                <Modifiers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kitchen"
            element={
              <ProtectedRoute>
                <Kitchen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/sales-report" element={<SalesReport />} />
          <Route
            path="/admin/store-settings"
            element={
              <ProtectedRoute>
                <StoreSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/whatsapp-settings"
            element={
              <ProtectedRoute>
                <WhatsAppSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discounts"
            element={
              <ProtectedRoute>
                <Discounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hot-deals"
            element={
              <ProtectedRoute>
                <HotDeals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/popup-banners"
            element={
              <ProtectedRoute>
                <PopupBanners />
              </ProtectedRoute>
            }
          />
          
          {/* Kasir Routes */}
          <Route
            path="/admin/pos"
            element={
              <ProtectedRoute>
                <POSCounter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir/pos"
            element={
              <ProtectedRoute>
                <Kitchen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir/kitchen"
            element={
              <ProtectedRoute>
                <Kitchen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customer-points"
            element={
              <ProtectedRoute>
                <CustomerPointsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/voucher-rewards"
            element={
              <ProtectedRoute>
                <VoucherRewards />
              </ProtectedRoute>
            }
          />

          {/* Default Route - Role-based redirect */}
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
        <Toast />
      </Router>
    </AuthProvider>
  </CustomerAuthProvider>
  </GoogleOAuthProvider>
  </ErrorBoundary>
  );
}

export default App;
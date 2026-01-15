import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
import POSCounter from './pages/POSCounter';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<CustomerMenu />} />
          <Route path="/track" element={<OrderTracking />} />
          
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

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          theme="light"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
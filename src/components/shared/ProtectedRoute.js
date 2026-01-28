import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ProtectedRoute = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!user || loading) {
        setVerifying(false);
        return;
      }

      try {
        const staffKey = localStorage.getItem('staff_key');
        if (!staffKey) {
          logout();
          setIsValid(false);
          setVerifying(false);
          return;
        }

        // Verify staff key masih valid di backend
        await api.post('/staff/auth/verify', {}, {
          headers: { 'x-staff-key': staffKey }
        });
        
        setIsValid(true);
      } catch (error) {
        console.error('❌ Staff key verification failed:', error.response?.data?.message);
        // Staff key tidak valid, logout user
        logout();
        setIsValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyAuth();
  }, [user, loading, logout]);

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memverifikasi autentikasi...</p>
        </div>
      </div>
    );
  }

  if (!user || !isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
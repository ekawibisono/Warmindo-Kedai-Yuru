import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { publicAPI } from '../services/api';

// Customer Authentication Context
const CustomerAuthContext = createContext();

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (customerData, token) => {
    setCustomer(customerData);
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_data', JSON.stringify(customerData));
  };

  const updateCustomer = (customerData) => {
    // Update customer data without changing token
    setCustomer(customerData);
    localStorage.setItem('customer_data', JSON.stringify(customerData));
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_data');
  };

  const getToken = () => {
    return localStorage.getItem('customer_token');
  };

  const refreshCustomer = useCallback(async (silentRefresh = false) => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      if (!silentRefresh) {
        logout();
      }
      return null;
    }

    try {
      const response = await publicAPI.getCustomerProfile();
      const updatedCustomer = response.data?.customer || response.data;

      if (updatedCustomer) {
        setCustomer(updatedCustomer);
        localStorage.setItem('customer_data', JSON.stringify(updatedCustomer));
        return updatedCustomer;
      }

      // If no customer data returned but no error, get from current state
      const currentCustomer = JSON.parse(localStorage.getItem('customer_data') || 'null');
      return currentCustomer;
    } catch (error) {
      // Handle 401 errors properly
      if (error.response?.status === 401) {
        // Always logout on 401 to clear invalid state
        logout();
        return null;
      }
      
      // For other errors, don't logout but return null
      return null;
    }
  }, []); // Remove customer dependency to avoid circular updates

  const validateToken = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
    const customerData = localStorage.getItem('customer_data');
    
    if (!token || !customerData) {
      return false;
    }

    try {
      // Direct API call to avoid dependency issues
      const response = await publicAPI.getCustomerProfile();
      return !!response.data;
    } catch (error) {
      // Clear invalid token
      if (error.response?.status === 401) {
        logout();
      }
      return false;
    }
  }, []);

  // Load customer from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('customer_token');
      const customerData = localStorage.getItem('customer_data');
      
      if (token && customerData) {
        try {
          const parsedCustomer = JSON.parse(customerData);
          setCustomer(parsedCustomer);
        } catch (error) {
          // Clear invalid data
          localStorage.removeItem('customer_token');
          localStorage.removeItem('customer_data');
        }
      }
      
      setLoading(false);
    };

    // Listen for auth failures from API interceptor
    const handleAuthFailure = () => {
      setCustomer(null);
    };

    window.addEventListener('customer-auth-failed', handleAuthFailure);
    initializeAuth();

    return () => {
      window.removeEventListener('customer-auth-failed', handleAuthFailure);
    };
  }, []); // Remove refreshCustomer dependency

  const value = {
    customer,
    loading,
    login,
    updateCustomer,
    logout,
    getToken,
    refreshCustomer,
    validateToken,
    isAuthenticated: !!customer
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Load customer from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerData = localStorage.getItem('customer_data');
    
    if (token && customerData) {
      try {
        setCustomer(JSON.parse(customerData));
      } catch (error) {
        console.error('Failed to parse customer data:', error);
        // Clear invalid data
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
      }
    }
    
    setLoading(false);
  }, []);

  const login = (customerData, token) => {
    setCustomer(customerData);
    localStorage.setItem('customer_token', token);
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

  const value = {
    customer,
    loading,
    login,
    logout,
    getToken,
    isAuthenticated: !!customer
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
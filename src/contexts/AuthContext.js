import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';  // tambah import

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('staff_user');
      const staffKey = localStorage.getItem('staff_key');
      
      if (storedUser && staffKey) {
        try {
          // Verify staff key masih valid
          await api.post('/staff/auth/verify', {}, {
            headers: { 'x-staff-key': staffKey }
          });
          setUser(JSON.parse(storedUser));
        } catch (error) {
          // Staff key tidak valid lagi, hapus session
          localStorage.removeItem('staff_user');
          localStorage.removeItem('staff_key');
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (staffKey) => {
    try {
      // Bersihkan localStorage dulu untuk mencegah data lama
      localStorage.removeItem('staff_user');
      localStorage.removeItem('staff_key');
      setUser(null);

      // Verify ke backend dan dapatkan info staff
      const response = await api.post('/staff/auth/verify', {}, {
        headers: { 'x-staff-key': staffKey }
      });
      
      // Simpan info staff dari backend hanya jika verifikasi berhasil
      const staffInfo = response.data.staff;
      const userData = {
        id: staffInfo.id,
        username: staffInfo.username,
        full_name: staffInfo.full_name,
        role: staffInfo.role,
        staffKey,
        loginTime: new Date().toISOString(),
      };
      
      localStorage.setItem('staff_user', JSON.stringify(userData));
      localStorage.setItem('staff_key', staffKey);
      setUser(userData);
      
      console.log('✅ Login berhasil:', userData.username);
      return true;
    } catch (error) {
      // 401 atau error lainnya = staff key tidak valid
      console.error('❌ Login gagal:', error.response?.data?.message || error.message);
      
      // Pastikan localStorage dan state dibersihkan jika login gagal
      localStorage.removeItem('staff_user');
      localStorage.removeItem('staff_key');
      setUser(null);
      
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('staff_user');
    localStorage.removeItem('staff_key');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    staffKey: localStorage.getItem('staff_key'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
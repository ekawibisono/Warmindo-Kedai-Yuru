import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';  // tambah import
import { notify } from '../components/common/Toast'; // Add toast import

const AuthContext = createContext();

// Konstanta untuk timeout (10 menit = 600000ms)
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 menit
const WARNING_TIMEOUT = 9 * 60 * 1000; // 9 menit (warning 1 menit sebelum logout)

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
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // Refs untuk timeout management
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Handle auto logout
  const handleAutoLogout = useCallback(() => {
    setShowTimeoutWarning(false);
    localStorage.removeItem('staff_user');
    localStorage.removeItem('staff_key');
    setUser(null);
    
    // Show notification
    notify.info('Sesi telah berakhir. Silakan login kembali.');
  }, []);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Set warning timer (1 menit sebelum logout)
    warningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, WARNING_TIMEOUT);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, SESSION_TIMEOUT);
  }, [user, handleAutoLogout]);

  // Activity event listeners
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      // Throttle: hanya reset jika sudah 1 menit dari aktivitas terakhir
      const now = Date.now();
      if (now - lastActivityRef.current > 60000) { // 1 menit
        resetActivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start activity timer setelah login
    resetActivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetActivityTimer]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('staff_user');
      const staffKey = localStorage.getItem('staff_key');
      
      if (storedUser && staffKey) {
        try {
          const userData = JSON.parse(storedUser);
          
          // Check if session is expired (lebih dari 24 jam)
          const loginTime = new Date(userData.loginTime).getTime();
          const now = Date.now();
          const sessionAge = now - loginTime;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 jam
          
          if (sessionAge > maxSessionAge) {
            throw new Error('Session expired');
          }

          // Verify staff key masih valid
          await api.post('/staff/auth/verify', {}, {
            headers: { 'x-staff-key': staffKey }
          });
          
          setUser(userData);
        } catch (error) {
          // Staff key tidak valid lagi atau session expired, hapus session
          console.log('Session invalid or expired:', error.message);
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
      // Clear any existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      
      // Bersihkan localStorage dulu untuk mencegah data lama
      localStorage.removeItem('staff_user');
      localStorage.removeItem('staff_key');
      setUser(null);
      setShowTimeoutWarning(false);

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
      setShowTimeoutWarning(false);
      
      return false;
    }
  };

  const logout = () => {
    // Clear timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    localStorage.removeItem('staff_user');
    localStorage.removeItem('staff_key');
    setUser(null);
    setShowTimeoutWarning(false);
  };

  // Extend session (dipanggil saat user tetap aktif pada warning)
  const extendSession = useCallback(() => {
    setShowTimeoutWarning(false);
    resetActivityTimer();
  }, [resetActivityTimer]);

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    staffKey: localStorage.getItem('staff_key'),
    showTimeoutWarning,
    extendSession,
    handleAutoLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Sesi Akan Berakhir
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Sesi Anda akan berakhir dalam 1 menit karena tidak ada aktivitas. 
              Klik "Lanjutkan" untuk memperpanjang sesi.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleAutoLogout}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Logout Sekarang
              </button>
              <button
                onClick={extendSession}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Lanjutkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
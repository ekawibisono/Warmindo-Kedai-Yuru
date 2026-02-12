import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';  // tambah import
import { notify } from '../components/common/Toast'; // Add toast import

const AuthContext = createContext();

// Konstanta untuk timeout - TESTING: 1 menit
// const SESSION_TIMEOUT = 60 * 1000; // 1 menit (untuk testing)
// const WARNING_TIMEOUT = 50 * 1000; // 50 detik (warning 10 detik sebelum logout)
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 menit
const WARNING_TIMEOUT = 9 * 60 * 1000; // 9 menit

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
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center z-50">
          {/* Nyan Cat */}
          <div className="mb-8 animate-bounce">
            <img 
              src="https://raw.githubusercontent.com/gist/aviaryan/3f7c37d7af78e5bfcb4c7efa590f9cae/raw/8957088c2e31dba6d72ce86c615cb3c7bb7f0b0c/nyan-cat.gif" 
              alt="Nyan Cat"
              className="w-48 h-auto"
            />
          </div>
          
          {/* Warning Message */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 border border-white border-opacity-20">
            <h3 className="text-3xl font-bold text-white text-center mb-4">
              ⏰ Sesi Akan Berakhir
            </h3>
            <p className="text-white text-opacity-90 text-center mb-8 text-lg">
              Sesi Anda akan berakhir dalam 1 menit karena tidak ada aktivitas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAutoLogout}
                className="flex-1 px-6 py-3 text-sm font-medium text-white bg-red-600 bg-opacity-80 backdrop-blur rounded-lg hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
              >
                🚪 Logout Sekarang
              </button>
              <button
                onClick={extendSession}
                className="flex-1 px-6 py-3 text-sm font-medium text-white bg-green-600 bg-opacity-80 backdrop-blur rounded-lg hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
              >
                ✅ Lanjutkan Sesi
              </button>
            </div>
          </div>
          
          {/* Starfield effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full animate-pulse"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 2 + 's',
                  animationDuration: Math.random() * 3 + 2 + 's'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
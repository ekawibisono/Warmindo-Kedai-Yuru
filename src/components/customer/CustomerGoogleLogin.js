import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';

const CustomerGoogleLogin = ({ onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useCustomerAuth();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');

      try {
        console.log('🔐 Getting user info from Google...');
        
        // Get user info from Google with the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        const userInfo = await userInfoResponse.json();
        
        console.log('📝 User info:', userInfo);
        
        // Send to backend with user info
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/auth/customer/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          })
        });

        const data = await response.json();

        if (data.success) {
          // Save customer session using context
          login(data.customer, data.token);
          
          console.log('✅ Customer login successful:', data.customer.name);
          
          if (onSuccess) {
            onSuccess(data.customer);
          }
        } else {
          setError(data.error || 'Login gagal');
        }

      } catch (error) {
        console.error('❌ Google login error:', error);
        setError('Gagal terhubung ke server. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Login dengan Google dibatalkan atau gagal');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-2xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                🍜 Kedai Yuru
              </h2>
              <p className="text-orange-100 text-sm">Selamat datang kembali!</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-200 transition-colors p-1 rounded-full hover:bg-white/20"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Benefits */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Masuk untuk pengalaman yang lebih baik
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-green-500">📝</span>
                    <span className="text-green-700 font-medium">Riwayat pesanan</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-blue-500">⚡</span>
                    <span className="text-blue-700 font-medium">Checkout cepat</span>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-purple-500">🎁</span>
                    <span className="text-purple-700 font-medium">Reward & promo</span>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-orange-500">🔔</span>
                    <span className="text-orange-700 font-medium">Notifikasi real-time</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Google Login Button */}
            <div className="space-y-4">
              <div className={`w-full transition-all duration-300 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Custom Google Button with Full Control */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300 hover:shadow-lg disabled:opacity-50 group"
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="group-hover:scale-105 transition-transform duration-300">
                    Lanjutkan dengan Google
                  </span>
                </button>
              </div>

              {loading && (
                <div className="text-center py-2 animate-in fade-in duration-300">
                  <div className="inline-flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                    <p className="text-sm text-gray-600 font-medium">Sedang memproses login...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Guest Option */}
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400 font-medium">atau</span>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:shadow-md disabled:opacity-50 group"
                disabled={loading}
              >
                <span className="inline-flex items-center justify-center space-x-2">
                  <span className="text-lg group-hover:scale-110 transition-transform duration-300">🚶‍♂️</span>
                  <span>Lanjutkan sebagai Tamu</span>
                </span>
              </button>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Dengan masuk, Anda menyetujui{' '}
                <a href="/terms" className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors">
                  Syarat & Ketentuan
                </a>{' '}
                dan{' '}
                <a href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors">
                  Kebijakan Privasi
                </a>{' '}
                kami.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerGoogleLogin;
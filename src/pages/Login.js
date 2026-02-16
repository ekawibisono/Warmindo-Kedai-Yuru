import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [staffKey, setStaffKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(staffKey);
      
      if (success) {
        // Redirect berdasarkan role - gunakan "/" untuk trigger RoleBasedRedirect
        navigate('/');
      } else {
        setError('Staff key tidak valid');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg className="h-12 w-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white">
            POS System
          </h2>
          <p className="mt-2 text-sm text-primary-100">
            Masukkan Staff Key untuk melanjutkan
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="staffKey" className="block text-sm font-medium text-gray-700 mb-2">
                Staff Key
              </label>
              <input
                id="staffKey"
                type="password"
                required
                value={staffKey}
                onChange={(e) => setStaffKey(e.target.value)}
                className="input-field font-mono"
                placeholder="Masukkan staff key"
                autoComplete="off"
              />
              <p className="mt-2 text-xs text-gray-500">
                Staff key adalah kunci akses rahasia untuk staff
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-700">💡 Tips:</p>
              <ul className="list-disc ml-5 space-y-1 text-xs">
                <li>Staff key didapat dari administrator</li>
                <li>Simpan staff key dengan aman</li>
                <li>Jangan share staff key ke orang lain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
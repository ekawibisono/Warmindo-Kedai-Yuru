import React, { useState } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { publicAPI } from '../../services/api';
import { notify } from '../common/Toast';

const CustomerProfileModal = ({ isOpen, onClose }) => {
  const { customer, refreshCustomer } = useCustomerAuth();
  const [fullName, setFullName] = useState(customer?.full_name || customer?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric'
    });
  };

  const updateProfile = async () => {
    if (!fullName.trim()) {
      notify.error('Nama lengkap tidak boleh kosong');
      return;
    }

    if (fullName.trim().length < 2) {
      notify.error('Nama lengkap minimal 2 karakter');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = { full_name: fullName.trim() };
      
      // Only include phone if it's provided and different from current
      if (phoneNumber.trim() && phoneNumber.trim() !== customer?.phone) {
        updateData.phone = phoneNumber.trim();
      }

      await publicAPI.updateProfile(updateData);
      notify.success('Profil berhasil diperbarui');
      await refreshCustomer();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      notify.error(error.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Edit Profile</span>
              </h2>
              <p className="text-blue-100 text-sm mt-1">Perbarui informasi akun Anda</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 p-1.5 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Info */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 mb-6 border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src={customer?.avatar || '/default-avatar.png'} 
                  alt="Avatar"
                  className="w-14 h-14 rounded-full border-3 border-white shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">{customer?.full_name || customer?.name}</p>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customer?.email}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {customer?.total_orders || 0} pesanan
                  </span>
                  <span className="text-xs text-gray-500">
                    Member sejak {formatMemberSince(customer?.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Nama Lengkap</span>
              </label>
              
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Nomor Telepon</span>
                <span className="text-xs text-gray-500">(opsional)</span>
              </label>
              
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan nomor telepon"
              />
            </div>
            
            {/* Format Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Format yang diterima:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  08123456789 (format Indonesia)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  62812345789 (format internasional)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  +62812345789 (format lengkap)
                </li>
              </ul>
            </div>

            {/* Current Phone */}
            {customer?.phone && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Nomor saat ini:</h4>
                <p className="text-sm text-gray-900 font-mono">{customer.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={updateProfile}
              disabled={isUpdating || !fullName.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileModal;
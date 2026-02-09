import { useState } from 'react';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { publicAPI } from '../services/api';
import { notify } from '../components/common/Toast';

export const useCustomer = () => {
  const { customer, logout, login, refreshCustomer } = useCustomerAuth();
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const updatePhoneNumber = async (phoneNumber) => {
    if (!phoneNumber?.trim()) {
      notify.error('Nomor telepon tidak boleh kosong');
      return false;
    }

    setIsUpdatingPhone(true);
    try {
      await publicAPI.updateProfile({ phone: phoneNumber });
      notify.success('Nomor telepon berhasil diperbarui');
      await refreshCustomer();
      return true;
    } catch (error) {
      notify.error(error.response?.data?.error || 'Gagal memperbarui nomor telepon');
      return false;
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      notify.success('Berhasil keluar dari akun');
    } catch (error) {
      notify.error('Gagal keluar dari akun');
    }
  };

  const handleLogin = async (googleCredential) => {
    try {
      await login(googleCredential);
      notify.success('Berhasil masuk ke akun');
      return true;
    } catch (error) {
      notify.error(error.response?.data?.error || 'Gagal masuk ke akun');
      return false;
    }
  };

  const formatMemberSince = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric'
    });
  };

  return {
    customer,
    isUpdatingPhone,
    updatePhoneNumber,
    handleLogout,
    handleLogin,
    formatMemberSince,
    refreshCustomer
  };
};
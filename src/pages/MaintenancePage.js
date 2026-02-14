import React, { useState, useEffect } from 'react';

const MaintenancePage = ({ message }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 0 : prev + 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleWhatsAppClick = () => {
    const waNumber = process.env.REACT_APP_WHATSAPP_NUMBER;
    const message = encodeURIComponent('Halo Kak, Saya Ingin Order Makanan');
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-orange-50 flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="max-w-md sm:max-w-3xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-2">
          <div>
            <h2 className="text-xs sm:text-sm text-gray-500 mb-1">Kedai Yuru</h2>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Status Layanan</h1>
          </div>
          <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            <span className="text-xs sm:text-sm font-semibold">Maintenance</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {/* Content */}
          <div className="p-6 sm:p-8 md:p-12">
            {/* Icon and Title Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 text-center sm:text-left">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {/* Title and Description */}
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                  Website sedang dalam perbaikan
                </h2>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {message || 'Mohon Maaf Kami Sedang Dalam Perawatan Website Utama Agar Lebih Optimal.'}
                </p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-purple-200">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Estimasi: Secepatnya</span>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-orange-200">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">Optimasi performa</span>
              </div>
            </div>

            {/* Progress Section */}
            <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Proses maintenance</span>
                <span className="text-xs sm:text-sm text-gray-500">Sedang berjalan...</span>
              </div>
              
              {/* Animated Progress Bar */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-3 sm:mb-4">
                <div 
                  className="absolute h-full bg-gradient-to-r from-purple-500 via-purple-600 to-orange-500 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 text-center">
                Jika butuh order cepat, kamu tetap bisa pesan lewat WhatsApp.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-0">
              <button
                onClick={handleWhatsAppClick}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 sm:hover:scale-105"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm sm:text-base">Order via WhatsApp</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 sm:py-4 px-6 rounded-xl transition-all duration-200 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm sm:text-base">Coba lagi</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 sm:px-8 py-3 sm:py-4 text-center border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-500">
              © 2026 Kedai Yuru. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;

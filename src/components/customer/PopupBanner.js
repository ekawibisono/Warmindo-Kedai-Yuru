import React, { useEffect, useState } from 'react';

const PopupBanner = ({ banner, onClose }) => {
  const [countdown, setCountdown] = useState(banner.display_duration);

  useEffect(() => {
    // Auto close jika display_duration > 0
    if (banner.display_duration > 0) {
      // Set countdown awal
      setCountdown(banner.display_duration);

      // Timer untuk auto close
      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, banner.display_duration * 1000);

      // Countdown interval (update setiap detik)
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(autoCloseTimer);
        clearInterval(countdownInterval);
      };
    }
  }, [banner.display_duration, onClose]);

  const handleButtonClick = () => {
    if (banner.button_action === 'redirect' && banner.redirect_url) {
      window.open(banner.redirect_url, '_blank');
      onClose();
    } else {
      // Jika bukan redirect, button berfungsi sebagai "Lihat Menu" atau action utama
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    // Close modal jika klik di backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden transform transition-all duration-300 scale-95 hover:scale-100">
        {/* Close Button with Countdown */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white bg-opacity-90 text-gray-700 rounded-full p-2 hover:bg-opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg group"
          title={banner.display_duration > 0 ? `Auto close in ${countdown}s` : 'Tutup'}
        >
          {/* Countdown Circle Progress (hanya tampil jika ada timer) */}
          {banner.display_duration > 0 && countdown > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="2"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray={`${(countdown / banner.display_duration) * 100} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
          )}
          
          {/* Icon dan Countdown Text */}
          <div className="relative flex items-center justify-center">
            {banner.display_duration > 0 && countdown > 0 ? (
              <span className="text-xs font-bold text-blue-600">{countdown}</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </button>

        {/* Banner Content */}
        <div className="overflow-y-auto max-h-[95vh]">
          {/* Title - Moved to top */}
          {banner.title && (
            <div className="p-6 pb-0">
              <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
                {banner.title}
              </h2>
            </div>
          )}

          {/* Image */}
          {banner.image_url && (
            <div className="relative w-full px-6 py-4">
              <img
                src={banner.image_url}
                alt={banner.title || 'Welcome Banner'}
                className="w-full h-auto max-h-80 object-contain bg-gray-50 rounded-xl"
                loading="eager"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 pt-2 space-y-4">
            {/* Description */}
            {banner.description && (
              <div className="text-center">
                <p className="text-gray-600 leading-relaxed">
                  {banner.description}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleButtonClick}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                {(banner.button_text && banner.button_text !== 'Tutup') 
                  ? banner.button_text 
                  : (banner.button_action === 'redirect' ? 'Kunjungi' : 'Lihat Menu')
                }
                {banner.button_action === 'redirect' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupBanner;
import React from 'react';
import { toast, ToastContainer } from 'react-toastify';

// Detect if device is mobile/tablet with more accurate detection
const isMobile = () => {
    // Check viewport width and also touch capability
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Mobile: width <= 768px OR touch device with width <= 1024px
    return width <= 768 || (isTouchDevice && width <= 1024);
};

// Detect tablet specifically (touch device between 769-1024px)
const isTablet = () => {
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isTouchDevice && width > 768 && width <= 1024;
};

// Get responsive position based on device
const getPosition = () => {
    if (isMobile()) {
        return "top-center"; // Mobile: center top for better visibility
    } else if (isTablet()) {
        return "top-center"; // Tablet: traditional top-right but with mobile styling
    }
    return "top-center"; // Desktop: traditional top-right
};

// Get responsive options based on device
const getResponsiveOptions = () => {
    const isMobileDevice = isMobile();
    const isTabletDevice = isTablet();
    
    return {
        position: getPosition(),
        autoClose: isMobileDevice ? 4000 : (isTabletDevice ? 3500 : 3000),
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: !isMobileDevice, // Disable hover on mobile, enable on tablet/desktop
        draggable: !isMobileDevice, // Disable drag on mobile, enable on tablet/desktop
        progress: undefined,
        limit: isMobileDevice ? 3 : (isTabletDevice ? 4 : 5), // Fewer toasts on smaller screens
        style: isMobileDevice ? {
            fontSize: '14px',
            padding: '16px',
            margin: '8px 16px', // Side margins on mobile
            borderRadius: '12px',
            maxWidth: 'calc(100vw - 32px)', // Responsive width
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        } : isTabletDevice ? {
            fontSize: '14px',
            padding: '14px 16px',
            borderRadius: '10px',
            maxWidth: '320px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
        } : {
            borderRadius: '8px',
            fontSize: '14px'
        },
        bodyClassName: isMobileDevice ? 'mobile-toast-body' : (isTabletDevice ? 'tablet-toast-body' : ''),
        toastClassName: isMobileDevice ? 'mobile-toast' : (isTabletDevice ? 'tablet-toast' : '')
    };
};

const notify = {
    success: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        toast.success(message, { ...responsiveOptions, ...options });
    },

    error: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        toast.error(message, { ...responsiveOptions, ...options });
    },

    info: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        toast.info(message, { ...responsiveOptions, ...options });
    },

    warning: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        toast.warning(message, { ...responsiveOptions, ...options });
    },

    loading: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast.loading(message, { ...responsiveOptions, ...options });
    },

    promise: (promise, messages, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast.promise(
            promise,
            {
                pending: messages.pending || 'Memproses...',
                success: messages.success || 'Berhasil!',
                error: messages.error || 'Gagal!',
            },
            { ...responsiveOptions, ...options }
        );
    },

    update: (toastId, options) => {
        toast.update(toastId, options);
    },

    dismiss: (toastId) => {
        toast.dismiss(toastId);
    },

    dismissAll: () => {
        toast.dismiss();
    },

    // New method to get current responsive settings
    getSettings: () => getResponsiveOptions(),
    
    // Method to manually refresh settings (useful for orientation changes)
    refresh: () => {
        // Dismiss all current toasts and let new ones use updated settings
        toast.dismiss();
    }
};

// Optional: Add window resize listener for better responsive handling
if (typeof window !== 'undefined') {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only refresh if crossing mobile/desktop breakpoint
            const wasMobile = window.innerWidth <= 768;
            setTimeout(() => {
                const isMobileNow = window.innerWidth <= 768;
                if (wasMobile !== isMobileNow) {
                    // Device type changed, refresh toast settings
                    notify.refresh();
                }
            }, 100);
        }, 250);
    });
    
    // Handle orientation change on mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            notify.refresh();
        }, 500);
    });
}

// Toast React Component
const Toast = () => {
    const responsiveOptions = getResponsiveOptions();
    return <ToastContainer {...responsiveOptions} />;
};

export { notify };
export default Toast;
import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

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
        duration: isMobileDevice ? 4000 : (isTabletDevice ? 3500 : 3000),
        style: isMobileDevice ? {
            fontSize: '14px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: 'calc(100vw - 32px)', // Responsive width
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            margin: '8px'
        } : isTabletDevice ? {
            fontSize: '14px',
            padding: '14px 16px',
            borderRadius: '10px',
            maxWidth: '320px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
        } : {
            borderRadius: '8px',
            fontSize: '14px',
            padding: '16px'
        }
    };
};

const notify = {
    success: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast.success(message, { 
            ...responsiveOptions, 
            style: {
                ...responsiveOptions.style,
                background: '#FFFFFF',
                color: 'black'
            },
            ...options 
        });
    },

    error: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast.error(message, { 
            ...responsiveOptions, 
            style: {
                ...responsiveOptions.style,
                background: '#FFFFFF',
                color: 'black'
            },
            ...options 
        });
    },

    info: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast(message, { 
            ...responsiveOptions, 
            icon: 'ℹ️',
            style: {
                ...responsiveOptions.style,
                background: '#FFFFFF',
                color: 'black'
            },
            ...options 
        });
    },

    warning: (message, options = {}) => {
        const responsiveOptions = getResponsiveOptions();
        return toast(message, { 
            ...responsiveOptions, 
            icon: '⚠️',
            style: {
                ...responsiveOptions.style,
                background: '#FFFFFF',
                color: 'black'
            },
            ...options 
        });
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
                loading: messages.pending || 'Memproses...',
                success: messages.success || 'Berhasil!',
                error: messages.error || 'Gagal!',
            },
            { ...responsiveOptions, ...options }
        );
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
    const isMobileDevice = isMobile();
    return (
        <Toaster
            position={getPosition()}
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{
                margin: isMobileDevice ? '8px' : '16px',
            }}
            toastOptions={{
                duration: isMobileDevice ? 4000 : 3000,
                style: {
                    fontSize: isMobileDevice ? '14px' : '16px',
                    maxWidth: isMobileDevice ? 'calc(100vw - 32px)' : '400px',
                    borderRadius: '8px',
                },
            }}
        />
    );
};

export { notify };
export default Toast;
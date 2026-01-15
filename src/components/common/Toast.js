import { toast } from 'react-toastify';

const defaultOptions = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: false,
    progress: undefined,
};

const notify = {
    success: (message, options = {}) => {
        toast.success(message, { ...defaultOptions, ...options });
    },

    error: (message, options = {}) => {
        toast.error(message, { ...defaultOptions, ...options });
    },

    info: (message, options = {}) => {
        toast.info(message, { ...defaultOptions, ...options });
    },

    warning: (message, options = {}) => {
        toast.warning(message, { ...defaultOptions, ...options });
    },

    loading: (message, options = {}) => {
        return toast.loading(message, { ...defaultOptions, ...options });
    },

    promise: (promise, messages, options = {}) => {
        return toast.promise(
            promise,
            {
                pending: messages.pending || 'Memproses...',
                success: messages.success || 'Berhasil!',
                error: messages.error || 'Gagal!',
            },
            { ...defaultOptions, ...options }
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
};

export default notify;
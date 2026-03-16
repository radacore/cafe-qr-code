import { toast } from 'sonner';

type ToastType = 'default' | 'info' | 'success' | 'warning' | 'error';

type ToastPayload = {
    title: string;
    description?: string;
    type?: ToastType;
};

export const toastManager = {
    add({ title, description, type = 'default' }: ToastPayload) {
        if (type === 'success') {
            return toast.success(title, { description });
        }

        if (type === 'error') {
            return toast.error(title, { description });
        }

        if (type === 'warning') {
            return toast.warning(title, { description });
        }

        if (type === 'info') {
            return toast.info(title, { description });
        }

        return toast(title, { description });
    },
};

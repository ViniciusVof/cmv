import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface NotificationStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function notifyInfo(message: string, durationMs = 3500) {
  useNotificationStore.getState().addToast({ type: 'info', message, durationMs });
}

export function notifySuccess(message: string, durationMs = 3500) {
  useNotificationStore.getState().addToast({ type: 'success', message, durationMs });
}

export function notifyError(message: string, durationMs = 5000) {
  useNotificationStore.getState().addToast({ type: 'error', message, durationMs });
}



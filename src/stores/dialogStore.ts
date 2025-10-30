import { create } from 'zustand';

interface ConfirmOptions {
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends ConfirmOptions {
  visible: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogStore extends DialogState {
  openConfirm: (opts: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (value: boolean) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  visible: false,
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  openConfirm: ({ message, confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
    return new Promise<boolean>((resolve) => {
      set({ visible: true, message, confirmText, cancelText, resolve });
    });
  },
  closeConfirm: (value) => {
    const { resolve } = get();
    resolve?.(value);
    set({ visible: false, resolve: undefined });
  },
}));

export function confirmAsync(message: string, confirmText?: string, cancelText?: string) {
  return useDialogStore.getState().openConfirm({ message, confirmText, cancelText });
}



import { useDialogStore } from '../stores/dialogStore';

export function ConfirmDialog() {
  const { visible, message, confirmText, cancelText, closeConfirm } = useDialogStore();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => closeConfirm(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 animate-slide-up">
        <div className="text-gray-800 text-base whitespace-pre-line">{message}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => closeConfirm(false)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => closeConfirm(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}



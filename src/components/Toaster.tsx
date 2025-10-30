import { useEffect } from 'react';
import { useNotificationStore } from '../stores/notificationStore';

function toastStyles(type: 'info' | 'success' | 'error' | 'warning') {
  switch (type) {
    case 'success':
      return 'bg-green-600 text-white shadow-lg';
    case 'error':
      return 'bg-red-600 text-white shadow-lg';
    case 'warning':
      return 'bg-amber-500 text-white shadow-lg';
    default:
      return 'bg-gray-800 text-white shadow-lg';
  }
}

export function Toaster() {
  const { toasts, removeToast } = useNotificationStore();

  useEffect(() => {
    const timers = toasts.map((t) => {
      if (!t.durationMs) return undefined;
      const tm = setTimeout(() => removeToast(t.id), t.durationMs);
      return () => clearTimeout(tm);
    });
    return () => {
      timers.forEach((cleanup) => cleanup && cleanup());
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 inset-0 pointer-events-none">
      <div className="absolute bottom-4 right-4 flex flex-col gap-3 w-full max-w-sm px-4 md:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${toastStyles(t.type)} pointer-events-auto rounded-lg px-4 py-3 flex items-start gap-3 animate-slide-up`}
            role="status"
          >
            <div className="flex-1 text-sm">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-white/80 hover:text-white"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple CSS animation utility class (Tailwind plugin not required)
// Add this to global CSS if desired; here we inline via Tailwind arbitrary values is not available,
// so consumers should ensure index.css has the keyframes below.


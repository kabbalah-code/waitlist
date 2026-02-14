'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-6 py-4 rounded-lg shadow-lg border-2 backdrop-blur-sm
              animate-in slide-in-from-right duration-300
              ${
                toast.type === 'success'
                  ? 'bg-green-900/90 border-green-500/50 text-green-100'
                  : toast.type === 'error'
                  ? 'bg-red-900/90 border-red-500/50 text-red-100'
                  : 'bg-[#FF9500]/90 border-[#FF9500] text-black'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <span className="text-xl">✓</span>}
              {toast.type === 'error' && <span className="text-xl">✕</span>}
              {toast.type === 'info' && <span className="text-xl">ℹ</span>}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

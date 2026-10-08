import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Hàm hiển thị Toast phản hồi tức thì cho thao tác người dùng (CRUD)
  const showToast = useCallback((type, message, duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toastIcons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
  };

  const toastStyles = {
    success: 'bg-white dark:bg-slate-800 border-emerald-500/40 text-slate-800 dark:text-white shadow-emerald-500/10',
    error: 'bg-white dark:bg-slate-800 border-rose-500/40 text-slate-800 dark:text-white shadow-rose-500/10',
    warning: 'bg-white dark:bg-slate-800 border-amber-500/40 text-slate-800 dark:text-white shadow-amber-500/10',
    info: 'bg-white dark:bg-slate-800 border-blue-500/40 text-slate-800 dark:text-white shadow-blue-500/10'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* CONTAINER CHỨA CÁC TOAST NỔI GÓC PHẢI MÀN HÌNH */}
      <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slideInRight ${
              toastStyles[toast.type] || toastStyles.info
            }`}
          >
            <div className="flex items-start space-x-3 mr-2">
              {toastIcons[toast.type] || toastIcons.info}
              <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-lg transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

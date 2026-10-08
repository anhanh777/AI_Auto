import React from 'react';
import { AlertTriangle, Trash2, KeyRound, Info, X, Loader2 } from 'lucide-react';

/**
 * Reusable Confirmation Modal thay thế hoàn toàn native window.confirm()
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  type = 'danger', // 'danger' | 'warning' | 'info'
  loading = false
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-rose-600" />,
      bgIcon: 'bg-rose-50 dark:bg-rose-950/50',
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      bgIcon: 'bg-amber-50 dark:bg-amber-950/50',
      btnConfirm: 'bg-[#f05a28] hover:bg-[#d94e20] text-white shadow-orange-600/20'
    },
    info: {
      icon: <KeyRound className="w-6 h-6 text-blue-600" />,
      bgIcon: 'bg-blue-50 dark:bg-blue-950/50',
      btnConfirm: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
    }
  };

  const current = typeConfig[type] || typeConfig.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-scaleUp">
        {/* Nút X đóng */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-start space-x-4">
          {/* Icon Badge */}
          <div className={`w-12 h-12 rounded-2xl ${current.bgIcon} flex items-center justify-center shrink-0`}>
            {current.icon}
          </div>

          <div className="flex-1 pt-0.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
              {title}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${current.btnConfirm}`}
          >
            {loading && <Loader2 className="animate-spin" size={14} />}
            <span>{loading ? 'Đang xử lý...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

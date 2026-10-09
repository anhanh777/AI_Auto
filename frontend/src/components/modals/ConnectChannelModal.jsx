import React, { useState } from 'react';
import {
  X,
  Facebook,
  Bot,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { channelService } from '../../services/channel.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const ConnectChannelModal = ({ isOpen, onClose, businessId, onChannelCreated }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    page_name: '',
    page_id: '',
    platform: 'facebook',
    operating_mode: 'AI_AUTO',
    access_token: '',
    avatar_url: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.page_name || !form.page_id) {
      showToast('warning', 'Vui lòng điền đầy đủ Tên Fanpage và Page ID Facebook');
      return;
    }

    try {
      setLoading(true);
      const res = await channelService.createChannel({
        ...form,
        platform: 'facebook',
        business_id: businessId
      });
      if (res.success) {
        showToast('success', 'Kết nối Fanpage Facebook mới thành công!');
        if (onChannelCreated) onChannelCreated(res.data);
        onClose();
        setForm({
          page_name: '',
          page_id: '',
          platform: 'facebook',
          operating_mode: 'AI_AUTO',
          access_token: '',
          avatar_url: ''
        });
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi kết nối Fanpage';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X size={20} />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold mb-2">
            <Facebook size={14} />
            <span>Kênh Fanpage Facebook</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Kết Nối Fanpage Facebook Mới
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tích hợp Fanpage Facebook để AI Bot tiếp nhận tin nhắn Messenger và chốt đơn tự động
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên Fanpage */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Fanpage Facebook *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Soulmade Official - Thời trang cao cấp"
              value={form.page_name}
              onChange={(e) => setForm({ ...form, page_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* ID Kênh / Page ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Facebook Page ID *
              </label>
              <input
                type="text"
                required
                placeholder="VD: 1048291048 hoặc soulmade.page"
                value={form.page_id}
                onChange={(e) => setForm({ ...form, page_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* Chế độ vận hành */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chế độ vận hành AI
              </label>
              <select
                value={form.operating_mode}
                onChange={(e) => setForm({ ...form, operating_mode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="AI_AUTO">🤖 AI Tự Động 24/7</option>
                <option value="HYBRID">⚡ Chế độ Lai (Hybrid)</option>
                <option value="MANUAL">👤 Thủ công (Nhân viên)</option>
              </select>
            </div>
          </div>

          {/* Access Token (Tùy chọn) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Page Access Token (Tùy chọn)
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="EAAG... (Nhập token xác thực Webhook Graph API)"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !form.page_name || !form.page_id}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {loading ? <span>Đang kết nối...</span> : <span>Xác nhận kết nối</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectChannelModal;

import React, { useState, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { generateBusinessCode } from '../../utils/slug.utils.js';
import {
  X,
  LogIn,
  PlusCircle,
  ArrowLeft,
  Store,
  KeyRound,
  Building2,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';

const JoinOrCreateBusinessModal = ({ isOpen, onClose, defaultStep = 'select' }) => {
  const { createBusiness, joinBusiness } = useBusiness();
  const { showToast } = useToast();
  const [step, setStep] = useState(defaultStep); // 'select' | 'join' | 'create'
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [joinCode, setJoinCode] = useState('');
  const [bizForm, setBizForm] = useState({
    business_name: '',
    code: '',
    industry: 'Bán lẻ - Thời trang & Phụ kiện',
    phone: '',
    email: '',
    logo_url: ''
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('select');
    setJoinCode('');
    setBizForm({
      business_name: '',
      code: '',
      industry: 'Bán lẻ - Thời trang & Phụ kiện',
      phone: '',
      email: '',
      logo_url: ''
    });
    onClose();
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/i)) {
      showToast('error', 'Chỉ chấp nhận các định dạng tệp: JPEG, PNG, GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Kích thước tệp tối đa: 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBizForm((prev) => ({ ...prev, logo_url: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      setLoading(true);
      await joinBusiness(joinCode.trim().toUpperCase());
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!bizForm.business_name || !bizForm.code) return;
    try {
      setLoading(true);
      await createBusiness(bizForm);
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Nút đóng */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* ================= STEP 1: LỰA CHỌN (2 OPTIONS) ================= */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center sm:text-left pr-8">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold mb-2">
                <Sparkles size={14} />
                <span>Không gian làm việc Multi-Business</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Tham gia hoặc tạo Business
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lựa chọn phương thức để truy cập không gian kinh doanh và kênh bán hàng
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Tham gia Business */}
              <button
                type="button"
                onClick={() => setStep('join')}
                className="group text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition duration-200 shadow-sm">
                    <LogIn size={24} />
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    Tham gia Business
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Gia nhập vào cửa hàng đã có sẵn bằng Mã định danh do Quản trị viên cấp.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Nhập mã Code</span>
                  <span>→</span>
                </div>
              </button>

              {/* Option 2: Tạo Business mới */}
              <button
                type="button"
                onClick={() => setStep('create')}
                className="group text-left p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 transition duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/50 text-[#f05a28] flex items-center justify-center mb-4 group-hover:scale-110 transition duration-200 shadow-sm">
                    <PlusCircle size={24} />
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-[#f05a28] transition">
                    Tạo Business mới
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Khởi tạo cửa hàng mới để quản lý sản phẩm, kênh chat, AI Agent và nhân sự.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-[#f05a28]">
                  <span>Khởi tạo ngay</span>
                  <span>→</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A: THAM GIA BẰNG CODE ================= */}
        {step === 'join' && (
          <div className="space-y-5">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Tham Gia Doanh Nghiệp
                </h2>
                <p className="text-xs text-slate-400">Nhập mã code được cấp để đồng bộ quyền truy cập</p>
              </div>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã định danh Business (Code) *
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: SOULMADE_01 hoặc AISALES_CN2"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  💡 Mã Business do Chủ sở hữu cửa hàng cung cấp trong phần cài đặt doanh nghiệp.
                </p>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading || !joinCode.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                >
                  {loading ? <span>Đang xác thực...</span> : <span>Tham gia ngay</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 2B: TẠO BUSINESS MỚI ================= */}
        {step === 'create' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Tạo Doanh Nghiệp Mới
                </h2>
                <p className="text-xs text-slate-400">Khởi tạo không gian bán hàng và AI Agent chuyên biệt</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Tên Doanh Nghiệp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên cửa hàng / Doanh nghiệp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Soulmade Premium, Tokyo Sneaker..."
                  value={bizForm.business_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBizForm((prev) => ({
                      ...prev,
                      business_name: val,
                      code: generateBusinessCode(val)
                    }));
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>

              {/* Mã Code + Ngành Hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã định danh (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder="VD: SOULMADE_02"
                    value={bizForm.code}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-600 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none"
                    title="Mã định danh được tự động tạo từ tên doanh nghiệp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngành hàng
                  </label>
                  <input
                    type="text"
                    placeholder="Bán lẻ - Thời trang & Phụ kiện"
                    value={bizForm.industry}
                    onChange={(e) => setBizForm({ ...bizForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
              </div>

              {/* Hotline + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hotline / SĐT
                  </label>
                  <input
                    type="text"
                    placeholder="0901234567"
                    value={bizForm.phone}
                    onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    placeholder="contact@brand.vn"
                    value={bizForm.email}
                    onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                  />
                </div>
              </div>

              {/* UPLOAD LOGO DROPZONE (Theo mẫu ảnh thiết kế) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Logo
                </label>

                {bizForm.logo_url ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={bizForm.logo_url}
                        alt="Logo preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          Đã chọn ảnh Logo
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Sẵn sàng khởi tạo
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBizForm({ ...bizForm, logo_url: '' })}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title="Gỡ ảnh này"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl py-5 px-4 text-center cursor-pointer transition ${
                      isDragging
                        ? 'border-[#f05a28] bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-[#f05a28] dark:hover:border-[#f05a28] bg-slate-50/40 dark:bg-slate-900/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-11 h-11 rounded-full bg-orange-100/70 dark:bg-orange-950/50 text-[#f05a28] flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <UploadCloud size={20} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-[#f05a28] font-bold hover:underline">Chọn ảnh từ máy</span> hoặc Kéo và thả
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Kích thước tệp tối đa: 5MB</p>
                    <p className="text-[10px] text-slate-400">Các định dạng tệp được chấp nhận: JPEG, PNG, GIF</p>
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading || !bizForm.business_name || !bizForm.code}
                  className="px-5 py-2.5 bg-[#f05a28] hover:bg-[#d94a1d] text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Đang khởi tạo...' : 'Tạo Business'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinOrCreateBusinessModal;

import React, { useState, useEffect, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { businessService } from '../../services/business.service.js';
import {
  Building2,
  Save,
  UploadCloud,
  Trash2,
  Store,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const BusinessSettingsPage = () => {
  const { activeBusiness, fetchBusinesses, switchBusiness } = useBusiness();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    code: '',
    industry: 'Bán lẻ - Thời trang & Phụ kiện',
    hotline: '',
    email: '',
    address: '',
    logo_url: ''
  });

  // Tải dữ liệu ban đầu từ activeBusiness
  useEffect(() => {
    if (activeBusiness) {
      setFormData({
        business_name: activeBusiness.business_name || activeBusiness.name || '',
        code: activeBusiness.code || '',
        industry: activeBusiness.industry || 'Bán lẻ - Thời trang & Phụ kiện',
        hotline: activeBusiness.hotline || activeBusiness.phone || '',
        email: activeBusiness.email || '',
        address: activeBusiness.address || '',
        logo_url: activeBusiness.logo_url || ''
      });
    }
  }, [activeBusiness]);

  // Xử lý upload ảnh Logo (FileReader)
  const processFile = (file) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/i)) {
      showToast('error', 'Chỉ chấp nhận các định dạng tệp: JPEG, PNG, GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Kích thước tệp tối đa là 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({ ...prev, logo_url: e.target.result }));
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

  // Lưu thông tin Doanh nghiệp
  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeBusiness?._id) {
      showToast('error', 'Vui lòng chọn Doanh nghiệp trước khi chỉnh sửa');
      return;
    }

    if (!formData.business_name.trim()) {
      showToast('error', 'Tên cửa hàng / Doanh nghiệp là bắt buộc');
      return;
    }

    try {
      setSaving(true);
      const res = await businessService.updateBusiness(activeBusiness._id, {
        business_name: formData.business_name.trim(),
        industry: formData.industry.trim(),
        hotline: formData.hotline.trim(),
        phone: formData.hotline.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        logo_url: formData.logo_url
      });

      if (res?.success || res?.data) {
        showToast('success', 'Cập nhật thông tin Doanh nghiệp thành công!');
        if (fetchBusinesses) {
          await fetchBusinesses();
        }
        if (res.data && switchBusiness) {
          switchBusiness(res.data);
        }
      }
    } catch (err) {
      showToast('error', err?.message || err?.response?.data?.message || 'Lỗi khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  if (!activeBusiness) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
        <Building2 size={40} className="mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa chọn Doanh nghiệp nào
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Vui lòng chọn một Doanh nghiệp từ danh sách để xem và chỉnh sửa thông tin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-[#f05a28] flex items-center justify-center shrink-0 shadow-sm">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Thông tin Doanh nghiệp
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý nhận diện thương hiệu, thông tin liên hệ và địa chỉ của Doanh nghiệp
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. KHỐI NHẬN DIỆN THƯƠNG HIỆU & LOGO */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Store size={16} className="text-[#f05a28]" />
              <span>1. Nhận diện thương hiệu & Logo</span>
            </h2>
          </div>

          <div className="space-y-4">
            {/* Tên cửa hàng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên cửa hàng / Doanh nghiệp *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Soulmade Premium..."
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
              />
            </div>

            {/* Mã Code + Ngành hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã định danh (Code) *
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.code}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400 cursor-not-allowed select-none focus:outline-none"
                  title="Mã định danh duy nhất không được phép thay đổi sau khi tạo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ngành hàng kinh doanh
                </label>
                <input
                  type="text"
                  placeholder="Bán lẻ - Thời trang & Phụ kiện"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>
            </div>

            {/* Ảnh đại diện / Logo Doanh nghiệp (Thiết kế đúng chuẩn theo ảnh mẫu) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Ảnh đại diện
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition ${
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

                {/* Khối bên trái: Preview Ảnh đại diện + Khối bên phải: Nút tải & Chú thích */}
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm cursor-pointer group"
                  >
                    {formData.logo_url ? (
                      <img
                        src={formData.logo_url}
                        alt={formData.business_name || 'Logo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <Store size={30} className="text-slate-300 dark:text-slate-600 group-hover:text-[#f05a28] transition" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                    >
                      <UploadCloud size={17} className="text-[#f05a28] shrink-0" />
                      <span className="text-[#f05a28] font-bold hover:underline">Chọn ảnh từ máy</span>
                      <span className="text-slate-400">hoặc Kéo và thả</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Kích thước tệp tối đa: 5MB
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Các định dạng tệp được chấp nhận: JPEG, PNG, GIF
                    </p>
                  </div>
                </div>

                {/* Nút gỡ ảnh nếu đã có Logo */}
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => ({ ...prev, logo_url: '' }));
                    }}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer shrink-0"
                    title="Gỡ ảnh này"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. KHỐI THÔNG TIN LIÊN HỆ & ĐỊA CHỈ */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Phone size={16} className="text-[#f05a28]" />
              <span>2. Thông tin liên hệ & Trụ sở</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hotline / SĐT liên hệ
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="0901234567"
                  value={formData.hotline}
                  onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email liên hệ chính
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="contact@brand.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ trụ sở / Kho hàng chính
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={3}
                placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#f05a28] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* NÚT LƯU THAY ĐỔI CUỐI TRANG */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? 'Đang lưu thay đổi...' : 'Lưu thông tin Doanh nghiệp'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessSettingsPage;

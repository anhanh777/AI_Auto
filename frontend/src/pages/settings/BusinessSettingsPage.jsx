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
      {/* HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm">
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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-xl text-xs font-bold shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {saving ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
        </button>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cột Logo */}
            <div className="md:col-span-1 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Logo Doanh nghiệp
              </label>

              {formData.logo_url ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center text-center space-y-3">
                  <img
                    src={formData.logo_url}
                    alt={formData.business_name}
                    className="w-24 h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Đổi ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo_url: '' })}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      title="Gỡ ảnh này"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
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
                  className={`border-2 border-dashed rounded-2xl py-6 px-4 text-center cursor-pointer transition ${
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
                  <div className="w-12 h-12 rounded-full bg-orange-100/70 dark:bg-orange-950/50 text-[#f05a28] flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <UploadCloud size={22} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-[#f05a28] font-bold hover:underline">Chọn ảnh từ máy</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">hoặc Kéo và thả vào đây</p>
                  <p className="text-[10px] text-slate-400">JPEG, PNG, GIF (Max 5MB)</p>
                </div>
              )}
            </div>

            {/* Cột Tên, Code, Ngành hàng */}
            <div className="md:col-span-2 space-y-4">
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

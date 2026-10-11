import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  KeyRound,
  Camera,
  Mail,
  Phone,
  Store,
  Calendar,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { authService } from '../../services/auth.service.js';
import { uploadService } from '../../services/upload.service.js';

const ProfileModal = ({ isOpen, onClose, defaultTab = 'profile' }) => {
  const { user, updateCurrentUser } = useAuth();
  const { activeBusiness } = useBusiness();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const avatarInputRef = useRef(null);

  // Profile Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Sync state when user or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || user.phone_number || '',
        avatar: user.avatar || user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
      });
      setActiveTab(defaultTab);
      setPasswordMsg({ type: '', text: '' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
  }, [isOpen, user, defaultTab]);

  if (!isOpen) return null;

  // Handle Avatar Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Dung lượng ảnh tối đa là 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadService.uploadSingle(file, 'avatars');
      if (res.success && res.data?.url) {
        setFormData((prev) => ({ ...prev, avatar: res.data.url }));
        showToast('success', 'Tải ảnh đại diện lên thành công!');
      } else {
        throw new Error(res.message || 'Không thể tải ảnh lên');
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!formData.full_name || formData.full_name.trim().length < 2) {
      showToast('error', 'Họ và tên là bắt buộc (tối thiểu 2 ký tự)');
      return;
    }

    if (formData.phone) {
      const cleanPhone = formData.phone.trim().replace(/\s+/g, '');
      const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        showToast('error', 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số, ví dụ: 0901234567)');
        return;
      }
    }

    if (formData.email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.email.trim())) {
        showToast('error', 'Địa chỉ email không đúng định dạng');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim().replace(/\s+/g, ''),
        avatar: formData.avatar
      });

      if (res.success) {
        updateCurrentUser(res.data);
        showToast('success', 'Cập nhật hồ sơ cá nhân thành công!');
        onClose();
      } else {
        throw new Error(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!passwordForm.oldPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
      return;
    }

    if (passwordForm.newPassword === passwordForm.oldPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      if (res.success) {
        showToast('success', 'Đổi mật khẩu thành công!');
        setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        throw new Error(res.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Lỗi khi đổi mật khẩu' });
      showToast('error', err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setSavingPassword(false);
    }
  };

  const isAdmin = user?.role_id?.name === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* HEADER MODAL */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f05a48] to-orange-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Tài Khoản & Hồ Sơ Cá Nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quản lý thông tin định danh và bảo mật tài khoản của bạn
              </p>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User size={15} />
              <span>Thông tin cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound size={15} />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: THÔNG TIN CÁ NHÂN ================= */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            {/* AVATAR + VAI TRÒ */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="relative group shrink-0">
                <img
                  src={formData.avatar}
                  alt={formData.full_name || 'Avatar'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer disabled:opacity-100"
                  title="Thay đổi ảnh đại diện"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <>
                      <Camera size={18} />
                      <span className="text-[10px] font-bold mt-1">Đổi ảnh</span>
                    </>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {formData.full_name || user?.username}
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center space-x-1 ${
                      isAdmin
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-[#f05a48] border border-rose-200 dark:border-rose-900/40'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40'
                    }`}
                  >
                    <ShieldCheck size={12} />
                    <span>{isAdmin ? '👑 Quản trị viên' : 'Thành viên'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Tên đăng nhập: <strong className="text-slate-800 dark:text-slate-200">@{user?.username}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-xs font-bold text-[#f05a48] hover:text-[#d94838] transition cursor-pointer inline-flex items-center space-x-1 pt-1"
                >
                  <Camera size={13} />
                  <span>{uploadingAvatar ? 'Đang tải ảnh...' : 'Tải lên ảnh mới từ máy tính'}</span>
                </button>
              </div>
            </div>

            {/* FORM INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Họ và tên */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Họ và tên đầy đủ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                  />
                </div>
              </div>
            </div>

            {/* THÔNG TIN HỆ THỐNG READ-ONLY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Store size={16} />
                </div>
                <div className="overflow-hidden text-xs">
                  <p className="text-[11px] text-slate-400">Doanh nghiệp hiện tại</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {activeBusiness?.business_name || 'Chưa vào cửa hàng'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div className="overflow-hidden text-xs">
                  <p className="text-[11px] text-slate-400">Ngày tham gia hệ thống</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'Mặc định'}
                  </p>
                </div>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={savingProfile || uploadingAvatar}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#f05a48] hover:bg-[#d94838] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 2: ĐỔI MẬT KHẨU ================= */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {passwordMsg.text && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            {/* Mật khẩu hiện tại */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showOldPass ? 'text' : 'password'}
                  required
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  placeholder="Nhập mật khẩu đang dùng"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showOldPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật khẩu mới (từ 6 ký tự) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Cập nhật mật khẩu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  MessageCircle,
  Instagram,
  Facebook,
  Phone,
  Mail,
  ShoppingBag,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Kiểm tra định dạng số điện thoại Việt Nam
  const isValidVietnamesePhone = (phone) => {
    if (!phone) return false;
    const clean = phone.trim().replace(/\s+/g, '');
    return /^(0[3|5|7|8|9])[0-9]{8}$/.test(clean);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Kiểm tra họ và tên
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2) {
      setErrorMsg('Vui lòng nhập Họ và tên đầy đủ (tối thiểu 2 ký tự)');
      return;
    }

    // 2. Kiểm tra tên đăng nhập
    if (!formData.username.trim() || formData.username.trim().length < 3) {
      setErrorMsg('Tên đăng nhập phải từ 3 ký tự trở lên');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      setErrorMsg('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
      return;
    }

    // 3. Kiểm tra email
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setErrorMsg('Địa chỉ email không đúng định dạng');
      return;
    }

    // 4. Kiểm tra số điện thoại
    if (!formData.phone.trim() || !isValidVietnamesePhone(formData.phone)) {
      setErrorMsg('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)');
      return;
    }

    // 5. Kiểm tra mật khẩu
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Mật khẩu bảo mật phải từ 6 ký tự trở lên');
      return;
    }

    // 6. Kiểm tra xác nhận mật khẩu
    if (formData.password !== formData.confirm_password) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim().replace(/\s+/g, ''),
        password: formData.password
      });

      showToast('success', 'Đăng ký tài khoản thành công! Chào mừng bạn gia nhập hệ thống.');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-900 transition-colors font-sans">
      {/* ================= CỘT TRÁI: SHOWCASE MẠNG LƯỚI ĐA KÊNH & AI ================= */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 items-center justify-center p-12 overflow-hidden border-r border-slate-200 dark:border-slate-800">
        {/* Logo góc trên trái */}
        <div className="absolute top-8 left-8 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
            <Sparkles size={18} />
          </div>
          <span className="font-extrabold text-xl text-slate-800 dark:text-white tracking-tight">
            AISales<span className="text-blue-600">.ai</span>
          </span>
        </div>

        {/* Khối Đồ thị mạng lưới đa kênh bao quanh Logo trung tâm */}
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-dashed border-blue-200 dark:border-blue-900/40 animate-spin-slow pointer-events-none"></div>

          {/* Node Facebook */}
          <div className="absolute top-10 left-12 w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-blue-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Facebook className="w-9 h-9 text-[#1877f2]" />
          </div>

          {/* Node Instagram */}
          <div className="absolute top-16 right-10 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-pink-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Instagram className="w-8 h-8 text-[#e4405f]" />
          </div>

          {/* Node Messenger */}
          <div className="absolute top-36 right-0 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-blue-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <MessageCircle className="w-8 h-8 text-[#0084ff]" />
          </div>

          {/* Node Hotline Phone */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-amber-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Phone className="w-6 h-6 text-amber-500" />
          </div>

          {/* Node Email */}
          <div className="absolute bottom-28 left-6 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Mail className="w-7 h-7 text-indigo-500" />
          </div>

          {/* Node E-commerce Web / Store */}
          <div className="absolute bottom-10 right-16 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-emerald-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <ShoppingBag className="w-7 h-7 text-emerald-500" />
          </div>

          {/* TRUNG TÂM: LOGO CHÍNH */}
          <div className="text-center z-10 p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                AISales<span className="text-blue-600">.ai</span>
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-rose-500 tracking-wide uppercase mt-1">
              <span>Multi-Tenant</span>
              <span>•</span>
              <span>RAG Knowledge</span>
              <span>•</span>
              <span>AI Chatbot</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CỘT PHẢI: FORM ĐĂNG KÝ ================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto my-auto">
          {/* Tiêu đề Chào mừng */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tạo tài khoản mới
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              Khởi tạo tài khoản Quản trị để quản lý bán hàng và kích hoạt AI Agent
            </p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center space-x-3 text-red-600 dark:text-red-400 text-xs sm:text-sm animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORM ĐĂNG KÝ */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Trần Mỹ Anh"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Tên đăng nhập & Số điện thoại (2 cột) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tên đăng nhập *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck size={17} />
                  </div>
                  <input
                    type="text"
                    required
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="myanh_01"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={17} />
                  </div>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Email liên hệ */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Email liên hệ *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Mật khẩu & Xác nhận mật khẩu (2 cột) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Xác nhận lại *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck size={17} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Nút Đăng ký chính */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition duration-200 flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-70 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Đăng ký tài khoản ngay</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Điều hướng sang Đăng nhập */}
          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Đã có tài khoản? </span>
            <Link
              to="/login"
              className="font-bold text-[#1877f2] hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>

        {/* Footer liên kết dưới cùng */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 space-y-1">
          <p className="text-slate-400">Hệ thống Tự Động Hóa Bán Hàng Online Đa Kênh & AI Consultant</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

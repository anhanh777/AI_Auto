import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
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
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-900 transition-colors font-sans">
      {/* ================= CỘT TRÁI: SHOWCASE MẠNG LƯỚI ĐA KÊNH & AI (THEO PHONG CÁCH SMAX.AI) ================= */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 items-center justify-center p-12 overflow-hidden border-r border-slate-200 dark:border-slate-800">
        {/* Logo góc trên trái */}
        <div className="absolute top-8 left-8 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
            <Sparkles size={18} />
          </div>
          <span className="font-extrabold text-xl text-slate-800 dark:text-white tracking-tight">
            AISales<span className="text-blue-600">.ai</span>
          </span>
        </div>

        {/* Khối Đồ thị mạng lưới đa kênh bao quanh Logo trung tâm */}
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
          {/* Vòng tròn quỹ đạo liên kết */}
          <div className="absolute inset-0 rounded-full border border-dashed border-blue-200 dark:border-blue-900/40 animate-spin-slow pointer-events-none"></div>

          {/* 1. Node Facebook */}
          <div className="absolute top-10 left-12 w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-blue-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Facebook className="w-9 h-9 text-[#1877f2]" />
          </div>

          {/* 2. Node Instagram */}
          <div className="absolute top-16 right-10 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-pink-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Instagram className="w-8 h-8 text-[#e4405f]" />
          </div>

          {/* 3. Node Messenger */}
          <div className="absolute top-36 right-0 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-blue-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <MessageCircle className="w-8 h-8 text-[#0084ff]" />
          </div>

          {/* 4. Node Hotline Phone */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-amber-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Phone className="w-6 h-6 text-amber-500" />
          </div>

          {/* 5. Node Email */}
          <div className="absolute bottom-28 left-6 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <Mail className="w-7 h-7 text-indigo-500" />
          </div>

          {/* 6. Node E-commerce Web / Store */}
          <div className="absolute bottom-10 right-16 w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-emerald-100 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition duration-300">
            <ShoppingBag className="w-7 h-7 text-emerald-500" />
          </div>

          {/* TRUNG TÂM: LOGO CHÍNH & KHẨU HIỆU CÔNG NGHỆ */}
          <div className="text-center z-10 p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                AISales<span className="text-blue-600">.ai</span>
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs font-bold text-rose-500 tracking-wide uppercase mt-1">
              <span>Live Chat</span>
              <span>•</span>
              <span>Chatbot</span>
              <span>•</span>
              <span>Automation</span>
              <span>•</span>
              <span>AI Platforms</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CỘT PHẢI: FORM ĐĂNG NHẬP CHUYÊN NGHIỆP ================= */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full mx-auto my-auto">
          {/* Tiêu đề Chào mừng */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Chào mừng bạn tới AISales.ai
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Đăng nhập tài khoản của bạn ngay bây giờ
            </p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center space-x-3 text-red-600 dark:text-red-400 text-sm animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORM ĐĂNG NHẬP */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập (admin / staff01)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nút Đăng nhập chính */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </form>

          {/* Gợi ý tài khoản kiểm thử */}
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Tài khoản kiểm thử mẫu:</span>
            </p>
            <p>• Admin: <code className="text-blue-600 font-mono font-bold">admin</code> / <code className="text-blue-600 font-mono">admin123</code></p>
            <p>• Nhân viên: <code className="text-blue-600 font-mono font-bold">staff01</code> / <code className="text-blue-600 font-mono">staff123</code></p>
          </div>
        </div>

        {/* Footer liên kết dưới cùng */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-center space-x-4 font-medium text-rose-500">
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
            <a href="#" className="hover:underline">Chính sách bảo mật</a>
            <a href="#" className="hover:underline">Hỗ trợ</a>
          </div>
          <p className="text-slate-400">Ngôn ngữ: Tiếng Việt (VI) • Hệ thống Tự Động Hóa Bán Hàng Online</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import {
  X,
  Facebook,
  Bot,
  Sparkles,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  Info,
  Radio,
  Settings,
  AlertCircle,
  UserCheck,
  PlusCircle,
  LogOut
} from 'lucide-react';
import { channelService } from '../../services/channel.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  loginWithFacebook,
  getDirectFacebookPages,
  getFacebookUserProfile
} from '../../utils/facebookSdk.js';

const ConnectChannelModal = ({ isOpen, onClose, businessId, onChannelCreated }) => {
  const { showToast } = useToast();

  // Tab: 'oauth' (Đăng nhập Facebook) | 'manual' (Thủ công)
  const [activeTab, setActiveTab] = useState('oauth');

  // OAuth States
  const [loggingIn, setLoggingIn] = useState(false);
  const [fbUser, setFbUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [connectingPageId, setConnectingPageId] = useState(null);
  const [operatingModes, setOperatingModes] = useState({});

  // Manual Form State
  const [manualLoading, setManualLoading] = useState(false);
  const [manualForm, setManualForm] = useState({
    page_name: '',
    page_id: '',
    platform: 'facebook',
    operating_mode: 'AI_AUTO',
    access_token: '',
    avatar_url: ''
  });

  if (!isOpen) return null;

  // 1. Xử lý Đăng nhập Facebook OAuth
  const handleFacebookLogin = async () => {
    try {
      setLoggingIn(true);
      const authResult = await loginWithFacebook();
      if (authResult.success && authResult.accessToken) {
        setFbUser({
          userID: authResult.userID,
          accessToken: authResult.accessToken
        });
        showToast('success', 'Đăng nhập Facebook thành công! Đang tải danh sách Fanpage...');
        await loadFacebookPages(authResult.accessToken);
      }
    } catch (err) {
      console.error('Facebook login error:', err);
      showToast('error', err.message || 'Lỗi đăng nhập Facebook');
    } finally {
      setLoggingIn(false);
    }
  };

  // 2. Lấy danh sách Fanpage từ Meta (kết hợp cả backend và trực tiếp SDK)
  const loadFacebookPages = async (userAccessToken) => {
    try {
      setLoadingPages(true);

      // Lấy thông tin tài khoản Facebook người dùng
      const userProfile = await getFacebookUserProfile();
      if (userProfile) {
        setFbUser((prev) => ({ ...prev, ...userProfile }));
      }

      let loadedPages = [];

      // Bước 1: Thử lấy qua backend API
      try {
        const res = await channelService.getFacebookPages(userAccessToken);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          loadedPages = res.data;
        }
      } catch (backendErr) {
        console.warn('Backend page query warning, trying direct SDK:', backendErr.message);
      }

      // Bước 2: Dự phòng gọi trực tiếp qua Facebook JavaScript SDK
      if (loadedPages.length === 0) {
        const directPages = await getDirectFacebookPages();
        if (directPages && directPages.length > 0) {
          loadedPages = directPages;
        }
      }

      setPages(loadedPages);

      // Khởi tạo operating_mode mặc định
      const initialModes = {};
      loadedPages.forEach((p) => {
        initialModes[p.page_id] = 'AI_AUTO';
      });
      setOperatingModes(initialModes);

      if (loadedPages.length > 0) {
        showToast('success', `Đã tìm thấy ${loadedPages.length} Fanpage từ tài khoản của bạn.`);
      } else {
        showToast('info', 'Chưa có Fanpage nào được cấp quyền. Vui lòng bấm chọn lại quyền Fanpage.');
      }
    } catch (err) {
      console.error('Lỗi khi tải Fanpage:', err);
      showToast('error', err.message || 'Không thể lấy danh sách Fanpage từ Meta');
    } finally {
      setLoadingPages(false);
    }
  };

  // 3. Kết nối 1 Fanpage cụ thể vào Business
  const handleConnectPage = async (page) => {
    try {
      setConnectingPageId(page.page_id);
      const mode = operatingModes[page.page_id] || 'AI_AUTO';

      const payload = {
        business_id: businessId,
        page_id: page.page_id,
        page_name: page.page_name,
        access_token: page.access_token,
        user_access_token: fbUser?.accessToken || '',
        avatar_url: page.avatar_url,
        operating_mode: mode
      };

      const res = await channelService.connectFacebookPage(payload);
      if (res.success) {
        showToast('success', `Đã kết nối Fanpage "${page.page_name}" vào cửa hàng thành công!`);
        if (onChannelCreated) onChannelCreated(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Lỗi khi kết nối Fanpage:', err);
      const msg = err.response?.data?.message || err.message || 'Kết nối Fanpage thất bại';
      showToast('error', msg);
    } finally {
      setConnectingPageId(null);
    }
  };

  // 4. Kết nối Thủ công
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.page_name || !manualForm.page_id) {
      showToast('warning', 'Vui lòng điền đầy đủ Tên Fanpage và Page ID Facebook');
      return;
    }

    try {
      setManualLoading(true);
      const res = await channelService.createChannel({
        ...manualForm,
        platform: 'facebook',
        business_id: businessId
      });
      if (res.success) {
        showToast('success', 'Kết nối Fanpage mới thành công!');
        if (onChannelCreated) onChannelCreated(res.data);
        onClose();
        setManualForm({
          page_name: '',
          page_id: '',
          platform: 'facebook',
          operating_mode: 'AI_AUTO',
          access_token: '',
          avatar_url: ''
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi kết nối Fanpage';
      showToast('error', msg);
    } finally {
      setManualLoading(false);
    }
  };

  const handleLogoutFb = () => {
    setFbUser(null);
    setPages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 relative text-slate-800 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header Modal */}
        <div className="mb-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#1877F2] rounded-full text-xs font-bold mb-2">
            <Facebook size={14} />
            <span>Kênh Bán Hàng Fanpage</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Kết Nối Fanpage Facebook
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tích hợp Fanpage để AI Bot tự động trả lời Messenger, tư vấn khách và chốt đơn 24/7
          </p>
        </div>

        {/* Tabs chọn phương thức kết nối */}
        <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'oauth'
                ? 'bg-white dark:bg-slate-800 text-[#1877F2] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Facebook size={14} />
            <span>Đăng nhập Meta Facebook (Tự động)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <KeyRound size={14} />
            <span>Nhập thủ công</span>
          </button>
        </div>

        {/* Nội dung Tab */}
        <div className="overflow-y-auto flex-1 pr-1">
          {activeTab === 'oauth' ? (
            <div className="space-y-4">
              {/* TRƯỜNG HỢP 1: Chưa đăng nhập Facebook */}
              {!fbUser ? (
                <div className="p-6 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#1877F2]/25">
                    <Facebook size={32} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Xác thực quyền với Meta Facebook
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Đăng nhập tài khoản Facebook của bạn để hệ thống tự động tải về danh sách toàn bộ các Fanpage bạn đang quản trị.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={loggingIn || loadingPages}
                      onClick={handleFacebookLogin}
                      className="w-full sm:w-auto px-6 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1877F2]/25 transition flex items-center justify-center space-x-2 mx-auto cursor-pointer disabled:opacity-60"
                    >
                      {loggingIn || loadingPages ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Đang kết nối Facebook...</span>
                        </>
                      ) : (
                        <>
                          <Facebook size={18} />
                          <span>Tiếp tục với Facebook</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-blue-100/80 dark:border-blue-900/30 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Quản lý tin nhắn
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Tự động Webhook
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Bảo mật OAuth 2.0
                    </span>
                  </div>
                </div>
              ) : (
                /* TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP FACEBOOK */
                <div className="space-y-4">
                  {/* Thanh thông tin tài khoản Facebook đã đăng nhập */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {fbUser.avatar ? (
                        <img
                          src={fbUser.avatar}
                          alt={fbUser.name || 'Facebook User'}
                          className="w-8 h-8 rounded-full border border-blue-200 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs">
                          f
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{fbUser.name || 'Tài khoản Facebook'}</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded font-semibold">
                            Đã xác thực
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          ID: {fbUser.id || fbUser.userID || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogoutFb}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      title="Đăng xuất tài khoản Facebook"
                    >
                      <LogOut size={13} />
                      <span>Đổi tài khoản</span>
                    </button>
                  </div>

                  {/* Vùng hiển thị trạng thái danh sách Fanpages */}
                  {loadingPages ? (
                    <div className="p-10 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center">
                      <RefreshCw size={24} className="animate-spin text-[#1877F2]" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Đang lấy danh sách Fanpage từ Meta Graph API...
                      </p>
                      <p className="text-[11px]">Vui lòng đợi trong giây lát</p>
                    </div>
                  ) : pages.length === 0 ? (
                    /* Khi đã đăng nhập nhưng chưa có/chưa cấp quyền Fanpage */
                    <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Chưa tìm thấy Fanpage nào được cấp quyền
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                          Facebook chưa chia sẻ danh sách Fanpage. Điều này xảy ra khi bạn chưa tích chọn Fanpage trong cửa sổ phân quyền của Facebook hoặc tài khoản chưa có Fanpage.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleFacebookLogin}
                          className="px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm w-full sm:w-auto"
                        >
                          <RefreshCw size={13} />
                          <span>Cấp lại quyền & Tích chọn Fanpage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => loadFacebookPages(fbUser.accessToken)}
                          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer w-full sm:w-auto"
                        >
                          <RefreshCw size={13} />
                          <span>Tải lại</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/30 text-[11px] text-slate-400">
                        <span>Chưa có Fanpage? </span>
                        <a
                          href="https://www.facebook.com/pages/create/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1877F2] underline font-semibold inline-flex items-center gap-0.5"
                        >
                          Tạo Fanpage mới trên Facebook <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* Khi đã có danh sách Fanpages */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Chọn Fanpage để kết nối ({pages.length} trang tìm thấy):
                        </span>
                        <button
                          type="button"
                          onClick={() => loadFacebookPages(fbUser.accessToken)}
                          className="text-[11px] text-[#1877F2] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <RefreshCw size={11} />
                          <span>Làm mới</span>
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                        {pages.map((p) => {
                          const isConnecting = connectingPageId === p.page_id;

                          return (
                            <div
                              key={p.page_id}
                              className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#1877F2]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              {/* Info Page */}
                              <div className="flex items-center space-x-3">
                                <img
                                  src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                  alt={p.page_name}
                                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                                />
                                <div>
                                  <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                                    {p.page_name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Page ID: {p.page_id} {p.category && `• ${p.category}`}
                                  </p>
                                </div>
                              </div>

                              {/* Mode & Action */}
                              <div className="flex items-center space-x-2 self-end sm:self-center">
                                <select
                                  value={operatingModes[p.page_id] || 'AI_AUTO'}
                                  onChange={(e) =>
                                    setOperatingModes({
                                      ...operatingModes,
                                      [p.page_id]: e.target.value
                                    })
                                  }
                                  className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                                >
                                  <option value="AI_AUTO">🤖 AI Tự Động 24/7</option>
                                  <option value="HYBRID">⚡ Lai (Hybrid)</option>
                                  <option value="MANUAL">👤 Thủ công</option>
                                </select>

                                <button
                                  type="button"
                                  disabled={isConnecting}
                                  onClick={() => handleConnectPage(p)}
                                  className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg text-xs font-bold shadow transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                >
                                  {isConnecting ? (
                                    <>
                                      <RefreshCw size={12} className="animate-spin" />
                                      <span>Đang kết nối...</span>
                                    </>
                                  ) : (
                                    <span>Kết nối</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TAB THỦ CÔNG */
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Fanpage Facebook *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cửa hàng Thời Trang Nam"
                  value={manualForm.page_name}
                  onChange={(e) => setManualForm({ ...manualForm, page_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1877F2] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Facebook Page ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 1048291048"
                    value={manualForm.page_id}
                    onChange={(e) => setManualForm({ ...manualForm, page_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1877F2] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chế độ vận hành AI
                  </label>
                  <select
                    value={manualForm.operating_mode}
                    onChange={(e) => setManualForm({ ...manualForm, operating_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1877F2] focus:outline-none"
                  >
                    <option value="AI_AUTO">🤖 AI Tự Động 24/7</option>
                    <option value="HYBRID">⚡ Lai (Hybrid)</option>
                    <option value="MANUAL">👤 Thủ công (Nhân viên)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Page Access Token (Tùy chọn)
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder="EAAG... (Nhập token xác thực Webhook)"
                    value={manualForm.access_token}
                    onChange={(e) => setManualForm({ ...manualForm, access_token: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1877F2] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={manualLoading || !manualForm.page_name || !manualForm.page_id}
                  className="px-5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {manualLoading ? 'Đang kết nối...' : 'Xác nhận kết nối'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectChannelModal;

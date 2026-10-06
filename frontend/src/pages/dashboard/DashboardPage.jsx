import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  Building2,
  Plus,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Store,
  X
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [businesses, setBusinesses] = useState([
    {
      id: 1,
      name: 'Soulmade - Chạm cảm xúc, nâng tầm phong cách',
      category: 'Bán lẻ - Thời trang nam nữ',
      avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150',
      channelsCount: 3,
      owner: user?.full_name || 'Admin',
      ownerAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      statusNotice: '✨ AI Bot đang tự động tư vấn và bóc tách đơn hàng trực tiếp qua Facebook & Web',
      statusType: 'active'
    },
    {
      id: 2,
      name: 'AI Sales Fashion Store (Chi nhánh 2)',
      category: 'Thời trang công sở cao cấp',
      avatar: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=150',
      channelsCount: 1,
      owner: user?.full_name || 'Admin',
      ownerAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      statusNotice: '🔔 Kênh Facebook Messenger đã kết nối sẵn sàng tiếp nhận khách hàng mới',
      statusType: 'info'
    }
  ]);

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. THANH CÔNG CỤ & TIÊU ĐỀ (RESPONSIVE) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Danh sách Business
          </h1>
          <span className="text-slate-400 font-semibold text-base sm:text-lg">
            ({filteredBusinesses.length})
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
            />
          </div>

          {/* Nút Thêm Business */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#f05a28] hover:bg-[#d94a1d] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Thêm doanh nghiệp mới</span>
          </button>
        </div>
      </div>

      {/* 2. DANH SÁCH CARDS DOANH NGHIỆP (CHUẨN FORM & NỀN TRẮNG SÁNG NHƯ ẢNH) */}
      <div className="space-y-3.5">
        {filteredBusinesses.map((biz) => (
          <div
            key={biz.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 p-4 sm:p-6 shadow-sm hover:shadow transition duration-200 space-y-3.5"
          >
            {/* Hàng trên: Logo + Tên + Channels + Owner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Bên trái: Avatar + Tên Shop */}
              <div className="flex items-center space-x-3.5">
                <img
                  src={biz.avatar}
                  alt={biz.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 transition cursor-pointer">
                    {biz.name}
                  </h2>
                  <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-0.5">
                    {biz.category}
                  </p>
                </div>
              </div>

              {/* Bên phải: Channels + Owner + Nút vào Chat */}
              <div className="flex items-center justify-between md:justify-end space-x-4 sm:space-x-8 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700 shrink-0">
                {/* Channels */}
                <div className="text-center">
                  <span className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-white">{biz.channelsCount}</span>
                  <p className="text-[11px] text-slate-400 font-medium">Channels</p>
                </div>

                {/* Owner */}
                <div className="text-center flex flex-col items-center">
                  <img
                    src={biz.ownerAvatar}
                    alt={biz.owner}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                    Owner by {biz.owner}
                  </p>
                </div>

                {/* Nút vào Chat */}
                <button
                  onClick={() => navigate('/livechat')}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-300 dark:hover:text-white border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <MessageSquare size={14} />
                  <span>Vào Chat</span>
                </button>
              </div>
            </div>

            {/* Hàng dưới: Thanh cảnh báo / Trạng thái AI màu vàng nhạt */}
            <div className="p-2.5 sm:p-3 bg-[#fff8e6] dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-center space-x-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
              <p className="line-clamp-1">{biz.statusNotice}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. MỤC DOANH NGHIỆP ĐÃ LƯU TRỮ */}
      <div className="pt-2">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <Store size={15} />
          <span>Danh sách Business đã lưu trữ</span>
          {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showArchived && (
          <div className="mt-3 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
            Hiện chưa có doanh nghiệp nào trong mục lưu trữ.
          </div>
        )}
      </div>

      {/* MODAL THÊM DOANH NGHIỆP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Building2 className="text-[#f05a28]" />
              <span>Tạo Doanh Nghiệp Mới</span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowAddModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Doanh nghiệp / Cửa hàng *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: AI Fashion Store"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngành nghề kinh doanh *
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="fashion">Bán lẻ - Thời trang & Phụ kiện</option>
                  <option value="cosmetics">Mỹ phẩm & Làm đẹp</option>
                  <option value="fb">F&B - Đồ uống & Ẩm thực</option>
                  <option value="electronics">Điện máy & Công nghệ</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#f05a28] hover:bg-[#d94a1d] text-white text-sm font-bold rounded-xl shadow transition"
                >
                  Tạo Doanh Nghiệp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/user.service.js';
import { authService } from '../../services/auth.service.js';
import { uploadService } from '../../services/upload.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Search,
  ChevronDown,
  Pencil,
  Trash2,
  Calendar,
  KeyRound,
  Shield,
  Check,
  X,
  Calculator,
  CheckCircle2,
  ArrowRight,
  Camera
} from 'lucide-react';

// Danh mục 19 quyền hạn hệ thống chuẩn theo Đề cương
const DEFAULT_PERMISSIONS = [
  { code: 'PRODUCT_VIEW', name: 'Xem danh sách sản phẩm & tồn kho', module: 'Sản phẩm & Kho', description: 'Xem danh mục, sản phẩm, giá bán và số lượng tồn' },
  { code: 'PRODUCT_CREATE', name: 'Thêm mới sản phẩm', module: 'Sản phẩm & Kho', description: 'Tạo sản phẩm mới, thiết lập biến thể size/màu' },
  { code: 'PRODUCT_UPDATE', name: 'Chỉnh sửa thông tin sản phẩm', module: 'Sản phẩm & Kho', description: 'Cập nhật giá bán, hình ảnh, mô tả sản phẩm' },
  { code: 'PRODUCT_DELETE', name: 'Xóa sản phẩm', module: 'Sản phẩm & Kho', description: 'Xóa hoặc ngừng kinh doanh sản phẩm' },
  { code: 'INVENTORY_MANAGE', name: 'Quản lý kho hàng & nhập xuất', module: 'Sản phẩm & Kho', description: 'Tạo phiếu nhập kho, điều chỉnh số lượng tồn kho' },

  { code: 'ORDER_VIEW', name: 'Xem danh sách đơn hàng', module: 'Đơn hàng', description: 'Tra cứu, lọc và xem chi tiết đơn hàng' },
  { code: 'ORDER_CREATE', name: 'Tạo đơn hàng thủ công', module: 'Đơn hàng', description: 'Nhân viên tự tạo đơn hàng trực tiếp cho khách' },
  { code: 'ORDER_UPDATE', name: 'Duyệt & xử lý đơn hàng', module: 'Đơn hàng', description: 'Duyệt đơn (trừ kho), đổi trạng thái giao hàng' },
  { code: 'ORDER_CANCEL', name: 'Hủy đơn hàng', module: 'Đơn hàng', description: 'Hủy đơn và tự động hoàn trả số lượng vào kho' },

  { code: 'CUSTOMER_VIEW', name: 'Xem danh sách khách hàng', module: 'Khách hàng CRM', description: 'Xem thông tin khách hàng, số điện thoại, địa chỉ' },
  { code: 'CUSTOMER_MANAGE', name: 'Quản lý thông tin khách hàng', module: 'Khách hàng CRM', description: 'Cập nhật phân hạng, gắn tag và ghi chú khách' },

  { code: 'KNOWLEDGE_MANAGE', name: 'Quản lý Kho Tri Thức RAG', module: 'Trí tuệ nhân tạo (AI)', description: 'Nạp tài liệu FAQ, chính sách bán hàng cho AI Gemini' },
  { code: 'AI_CONFIG_MANAGE', name: 'Cấu hình Bot AI Gemini', module: 'Trí tuệ nhân tạo (AI)', description: 'Cài đặt Prompt, tone giọng, ngưỡng tin cậy RAG' },

  { code: 'CHAT_VIEW', name: 'Xem tin nhắn Live Chat', module: 'Hộp thư Live Chat', description: 'Xem hội thoại khách hàng từ Facebook Fanpage' },
  { code: 'CHAT_REPLY', name: 'Nhắn tin & tư vấn khách', module: 'Hộp thư Live Chat', description: 'Nhân viên chat trực tiếp, gửi ảnh, báo giá' },
  { code: 'CHAT_TAKEOVER', name: 'Tiếp quản từ Bot AI', module: 'Hộp thư Live Chat', description: 'Tạm dừng AI để nhân viên trực tiếp tiếp quản khách' },

  { code: 'DASHBOARD_VIEW', name: 'Xem Báo cáo Thống kê', module: 'Tổng quan & Báo cáo', description: 'Xem doanh thu, hiệu suất AI và tỷ lệ chốt đơn' },
  { code: 'USER_MANAGE', name: 'Quản lý nhân viên & thành viên', module: 'Hệ thống', description: 'Thêm, sửa thông tin, khóa tài khoản nhân sự' },
  { code: 'ROLE_MANAGE', name: 'Phân quyền tài khoản', module: 'Hệ thống', description: 'Cấp và tùy biến quyền hạn cho từng tài khoản' }
];

// Hàm gom nhóm quyền theo Module
const groupPermissionsList = (permsList) => {
  const list = Array.isArray(permsList) && permsList.length > 0 ? permsList : DEFAULT_PERMISSIONS;
  return list.reduce((acc, perm) => {
    const mod = perm.module || 'Chức năng khác';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState(() => groupPermissionsList(DEFAULT_PERMISSIONS));
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'permissions'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State (Đúng chuẩn 100% Chapter 3)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    avatar: '',
    password: '',
    role_type: 'ADMIN', // 'ADMIN' | 'MEMBER'
    role_id: '',
    custom_permissions: []
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const { showToast } = useToast();

  // Load danh sách người dùng
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({ limit: 100, search });
      if (res.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  // Load Roles & Permissions từ Backend
  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        authService.getRoles(),
        authService.getPermissions()
      ]);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (permsRes.success && Array.isArray(permsRes.data)) {
        setPermissionsGrouped(groupPermissionsList(permsRes.data));
      }
    } catch (err) {
      console.error('Lỗi tải roles/permissions:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRolesAndPermissions();
  }, []);

  // Lọc danh sách hiển thị
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);

    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active);

    const isUserAdmin = u.role_id?.name === 'ADMIN';
    const matchesRole =
      roleFilter === '' ||
      (roleFilter === 'ADMIN' && isUserAdmin) ||
      (roleFilter === 'MEMBER' && !isUserAdmin);

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Thống kê 4 thẻ
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role_id?.name === 'ADMIN').length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  // Xử lý upload ảnh đại diện (Multer API)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn file hình ảnh (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Dung lượng ảnh tối đa là 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadService.uploadSingle(file, 'avatars');
      if (res.success) {
        setFormData((prev) => ({ ...prev, avatar: res.data.url }));
        showToast('success', 'Đã tải lên ảnh đại diện thành công!');
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Toggle kích hoạt nhanh qua nút Switch
  const handleToggleActive = async (user) => {
    if (user.username === 'admin') {
      showToast('warning', 'Không thể vô hiệu hóa tài khoản Quản trị viên mặc định');
      return;
    }

    try {
      const updatedStatus = !user.is_active;
      const res = await userService.updateUser(user._id, { is_active: updatedStatus });
      if (res.success) {
        showToast(
          'success',
          `Đã ${updatedStatus ? 'kích hoạt' : 'tạm khóa'} tài khoản [${user.full_name}]`
        );
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, is_active: updatedStatus } : u))
        );
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setActiveTab('basic');
    setSelectedUser(null);
    const adminRole = roles.find((r) => r.name === 'ADMIN') || roles[0];

    const defaultMemberPerms = [
      'PRODUCT_VIEW',
      'ORDER_VIEW',
      'ORDER_CREATE',
      'CUSTOMER_VIEW',
      'CHAT_VIEW',
      'CHAT_REPLY'
    ];

    setFormData({
      full_name: '',
      username: '',
      email: '',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      password: '',
      role_type: 'ADMIN',
      role_id: adminRole?._id || '',
      custom_permissions: defaultMemberPerms
    });
    setShowModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setActiveTab('basic');
    setSelectedUser(user);

    const isAdmin = user.role_id?.name === 'ADMIN';
    const initialPerms =
      Array.isArray(user.custom_permissions) && user.custom_permissions.length > 0
        ? user.custom_permissions
        : [
            'PRODUCT_VIEW',
            'ORDER_VIEW',
            'ORDER_CREATE',
            'CUSTOMER_VIEW',
            'CHAT_VIEW',
            'CHAT_REPLY'
          ];

    setFormData({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      password: '',
      role_type: isAdmin ? 'ADMIN' : 'MEMBER',
      role_id: user.role_id?._id || roles[0]?._id || '',
      custom_permissions: initialPerms
    });
    setShowModal(true);
  };

  // Reset mật khẩu nhanh
  const handleResetPasswordQuick = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu của [${selectedUser.full_name}] về mặc định là 123456?`)) return;

    try {
      const res = await userService.resetPassword(selectedUser._id, '123456');
      if (res.success) {
        showToast('success', `Đã đặt lại mật khẩu về mặc định: 123456`);
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi đặt lại mật khẩu');
    }
  };

  // Xóa tài khoản
  const handleDeleteUser = async (user) => {
    if (user.username === 'admin') {
      showToast('warning', 'Không thể xóa tài khoản Quản trị viên hệ thống');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản [${user.full_name}]?`)) return;

    try {
      const res = await userService.deleteUser(user._id);
      if (res.success) {
        showToast('success', res.message || 'Đã xóa tài khoản thành công');
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi xóa tài khoản');
    }
  };

  // Tích / Bỏ tích 1 quyền
  const handleTogglePermission = (permCode) => {
    setFormData((prev) => {
      const current = prev.custom_permissions || [];
      const updated = current.includes(permCode)
        ? current.filter((p) => p !== permCode)
        : [...current, permCode];
      return { ...prev, custom_permissions: updated };
    });
  };

  // Chọn / Bỏ chọn toàn bộ quyền của 1 module
  const handleSelectModulePermissions = (modulePerms) => {
    const permCodes = modulePerms.map((p) => p.code);
    setFormData((prev) => {
      const current = prev.custom_permissions || [];
      const allSelected = permCodes.every((code) => current.includes(code));
      let updated;
      if (allSelected) {
        updated = current.filter((code) => !permCodes.includes(code));
      } else {
        updated = Array.from(new Set([...current, ...permCodes]));
      }
      return { ...prev, custom_permissions: updated };
    });
  };

  // Lưu Form Thêm mới / Cập nhật
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let targetRole = roles.find((r) => r.name === formData.role_type);
      if (!targetRole && roles.length > 0) {
        targetRole = formData.role_type === 'ADMIN' ? roles[0] : (roles[1] || roles[0]);
      }

      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        avatar: formData.avatar,
        role_id: targetRole?._id || formData.role_id,
        custom_permissions:
          formData.role_type === 'ADMIN' ? ['ALL'] : formData.custom_permissions
      };

      if (modalMode === 'create') {
        payload.username = formData.username || formData.email.split('@')[0];
        payload.password = formData.password || '123456';

        const res = await userService.createUser(payload);
        if (res.success) {
          showToast('success', `Tạo tài khoản thành viên [${formData.full_name}] thành công!`);
          setShowModal(false);
          fetchUsers();
        }
      } else {
        const res = await userService.updateUser(selectedUser._id, payload);
        if (res.success) {
          showToast('success', `Cập nhật thông tin thành viên [${formData.full_name}] thành công!`);
          setShowModal(false);
          fetchUsers();
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu thông tin thành viên');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ================= 1. HEADER ROW ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Thành viên
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {filteredUsers.length} tài khoản
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ô Tìm kiếm */}
          <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Tìm kiếm họ tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a48]"
            />
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Lọc Trạng thái */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f05a48] cursor-pointer"
            >
              <option value="">Trạng thái</option>
              <option value="active">Đang làm việc</option>
              <option value="inactive">Đã tạm khóa</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Lọc Nhóm quyền */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f05a48] cursor-pointer"
            >
              <option value="">Lọc nhóm quyền</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Nút Thêm thành viên */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#f05a48] hover:bg-[#e04937] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm thành viên</span>
          </button>
        </div>
      </div>

      {/* ================= 2. HÀNG 4 THẺ THỐNG KÊ ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#fef2f2] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-rose-900/40 shadow-sm flex items-center justify-center text-rose-500">
              <Calculator size={18} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tổng cộng</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
        </div>

        <div className="bg-[#ecfdf5] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-900/40 shadow-sm flex items-center justify-center text-emerald-500">
              <ShieldCheck size={18} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Quản trị viên</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{adminCount}</span>
        </div>

        <div className="bg-[#fffbeb] dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-amber-900/40 shadow-sm flex items-center justify-center text-amber-500">
              <UserCheck size={18} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Được kích hoạt</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{activeCount}</span>
        </div>

        <div className="bg-[#eff6ff] dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-blue-900/40 shadow-sm flex items-center justify-center text-blue-500">
              <UserX size={18} />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Chưa kích hoạt</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{inactiveCount}</span>
        </div>
      </div>

      {/* ================= 3. BẢNG DANH SÁCH THÀNH VIÊN ================= */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="py-4 pl-6 pr-2 w-12 text-center"></th>
                <th className="py-4 px-4 font-bold">TÊN THÀNH VIÊN</th>
                <th className="py-4 px-4 font-bold">TÊN ĐĂNG NHẬP</th>
                <th className="py-4 px-4 font-bold">SỐ ĐIỆN THOẠI</th>
                <th className="py-4 px-4 font-bold">NHÓM QUYỀN</th>
                <th className="py-4 px-4 font-bold">QUYỀN HẠN</th>
                <th className="py-4 px-4 font-bold">TRẠNG THÁI</th>
                <th className="py-4 px-6 text-right font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    Đang tải danh sách thành viên...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    Không tìm thấy thành viên phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role_id?.name === 'ADMIN';

                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition group"
                    >
                      {/* Cột 1: Toggle Switch */}
                      <td className="py-4 pl-6 pr-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          disabled={user.username === 'admin'}
                          title={user.is_active ? 'Nhấp để tạm khóa' : 'Nhấp để kích hoạt'}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-300 cursor-pointer ${
                            user.is_active ? 'bg-[#f05a48]' : 'bg-slate-300 dark:bg-slate-600'
                          } ${user.username === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                              user.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          ></div>
                        </button>
                      </td>

                      {/* Cột 2: TÊN THÀNH VIÊN */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <img
                              src={
                                user.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                              }
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                            {user.is_active && (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 absolute bottom-0 right-0"></span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-xs">
                              {user.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Email: {user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: TÊN ĐĂNG NHẬP */}
                      <td className="py-4 px-4">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">
                          {user.username}
                        </span>
                      </td>

                      {/* Cột 4: SỐ ĐIỆN THOẠI */}
                      <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {user.phone || 'Chưa cập nhật'}
                      </td>

                      {/* Cột 5: NHÓM QUYỀN */}
                      <td className="py-4 px-4">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </td>

                      {/* Cột 6: QUYỀN HẠN */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {isAdmin
                            ? 'Toàn quyền'
                            : user.custom_permissions && user.custom_permissions.length > 0
                            ? `Tùy chỉnh (${user.custom_permissions.length} quyền)`
                            : 'Theo vai trò'}
                        </span>
                      </td>

                      {/* Cột 7: TRẠNG THÁI */}
                      <td className="py-4 px-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#e8f5e9] dark:bg-emerald-950/40 text-[#2e7d32] dark:text-emerald-400 border border-[#c8e6c9] dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] dark:bg-emerald-400 mr-1.5 animate-pulse"></span>
                            Đang làm việc
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                            Đã tạm khóa
                          </span>
                        )}
                      </td>

                      {/* Cột 8: THAO TÁC */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(user);
                              setActiveTab('permissions');
                            }}
                            title="Xem / Tinh chỉnh quyền hạn"
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          >
                            <Calendar size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            title="Chỉnh sửa thông tin thành viên"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.username === 'admin'}
                            title="Xóa tài khoản"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 4. MODAL THÊM / SỬA THÀNH VIÊN (2 TAB CHUẨN) ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                {/* Avatar bấm vào để đổi ảnh / Upload qua Multer */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Nhấp để tải lên ảnh đại diện mới"
                >
                  <img
                    src={
                      formData.avatar ||
                      selectedUser?.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                    }
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 group-hover:opacity-75 transition shadow-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Camera size={16} className="text-white" />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 absolute bottom-0 right-0"></span>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>
                      {modalMode === 'create'
                        ? formData.full_name || 'Thêm thành viên mới'
                        : formData.full_name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalMode === 'create'
                      ? formData.email || 'Điền thông tin và phân quyền tài khoản (Nhấp vào ảnh để đổi Avatar)'
                      : formData.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-6 pt-2 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`py-3 px-6 text-xs font-bold transition border-b-2 cursor-pointer ${
                  activeTab === 'basic'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                Thông tin cơ bản
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`py-3 px-6 text-xs font-bold transition border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'permissions'
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span>Quyền hạn</span>
                {formData.role_type === 'MEMBER' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#f05a48] text-white font-bold">
                    {formData.custom_permissions?.length || 0}
                  </span>
                )}
              </button>
            </div>

            {/* MODAL BODY */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* ================= TAB 1: THÔNG TIN CƠ BẢN ================= */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  {/* Row 1: Tên tùy chỉnh + Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a48] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="email@aisales.vn"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a48] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        placeholder="0912..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a48] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 2 (Chỉ khi TẠO MỚI): Username & Password */}
                  {modalMode === 'create' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: nv_anh"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a48] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Mặc định: 123456"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-[#f05a48] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* NÚT RESET MẬT KHẨU KHI CHỈNH SỬA */}
                  {modalMode === 'edit' && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Bảo mật tài khoản
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tên đăng nhập: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formData.username}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetPasswordQuick}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <KeyRound size={13} />
                        <span>Đặt lại MK về 123456</span>
                      </button>
                    </div>
                  )}

                  {/* Nhóm quyền (Radio button Admin / Member) */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Nhóm quyền <span className="text-rose-500">*</span>
                    </label>

                    <div className="space-y-3">
                      {/* Radio 1: Admin */}
                      <label
                        onClick={() => setFormData({ ...formData, role_type: 'ADMIN' })}
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border transition cursor-pointer ${
                          formData.role_type === 'ADMIN'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="radio"
                            name="role_type"
                            value="ADMIN"
                            checked={formData.role_type === 'ADMIN'}
                            onChange={() => setFormData({ ...formData, role_type: 'ADMIN' })}
                            className="w-4 h-4 text-[#f05a48] focus:ring-[#f05a48]"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Admin</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Truy cập tất cả các chức năng và có thể quản lý vai trò đồng đội
                          </p>
                        </div>
                      </label>

                      {/* Radio 2: Member */}
                      <label
                        onClick={() => setFormData({ ...formData, role_type: 'MEMBER' })}
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border transition cursor-pointer ${
                          formData.role_type === 'MEMBER'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-1 ring-rose-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="radio"
                            name="role_type"
                            value="MEMBER"
                            checked={formData.role_type === 'MEMBER'}
                            onChange={() => setFormData({ ...formData, role_type: 'MEMBER' })}
                            className="w-4 h-4 text-[#f05a48] focus:ring-[#f05a48]"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Member</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Truy cập tất cả các chức năng theo role được phân quyền
                          </p>

                          {formData.role_type === 'MEMBER' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('permissions');
                              }}
                              className="mt-2 text-xs font-bold text-[#f05a48] hover:underline flex items-center space-x-1"
                            >
                              <span>👉 Bấm vào đây để tùy chỉnh 19 quyền hạn chi tiết</span>
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: QUYỀN HẠN ================= */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Shield className="text-[#f05a48]" size={18} />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Tổng quan quyền hạn
                      </h4>
                    </div>

                    {formData.role_type === 'MEMBER' && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Đã chọn:{' '}
                        <strong className="text-[#f05a48]">
                          {formData.custom_permissions?.length || 0}
                        </strong>{' '}
                        quyền
                      </span>
                    )}
                  </div>

                  {formData.role_type === 'ADMIN' ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                        <CheckCircle2 size={24} />
                      </div>
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white">
                        Toàn quyền Quản trị viên (Admin)
                      </h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Tài khoản thuộc nhóm Admin có toàn quyền truy cập, chỉnh sửa và quản lý mọi
                        chức năng trên toàn bộ hệ thống AISales.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role_type: 'MEMBER' })}
                        className="text-xs text-[#f05a48] font-bold hover:underline"
                      >
                        Chuyển sang nhóm Member để giới hạn và chọn quyền cụ thể
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {Object.keys(permissionsGrouped).map((moduleName) => {
                        const modulePerms = permissionsGrouped[moduleName] || [];
                        const isAllModuleSelected =
                          modulePerms.length > 0 &&
                          modulePerms.every((p) =>
                            formData.custom_permissions?.includes(p.code)
                          );

                        return (
                          <div
                            key={moduleName}
                            className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {moduleName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSelectModulePermissions(modulePerms)}
                                className="text-[11px] font-semibold text-[#f05a48] hover:underline cursor-pointer"
                              >
                                {isAllModuleSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {modulePerms.map((perm) => {
                                const isChecked =
                                  formData.custom_permissions?.includes(perm.code) || false;

                                return (
                                  <label
                                    key={perm.code}
                                    onClick={() => handleTogglePermission(perm.code)}
                                    className={`flex items-start space-x-2.5 p-2 rounded-lg border transition cursor-pointer ${
                                      isChecked
                                        ? 'bg-white dark:bg-slate-800 border-orange-300 dark:border-orange-800 text-slate-800 dark:text-white shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded text-[#f05a48] focus:ring-[#f05a48]"
                                    />
                                    <div>
                                      <p className="text-[11px] font-semibold leading-tight">
                                        {perm.name || perm.description}
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        {perm.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#f05a48] hover:bg-[#e04937] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;

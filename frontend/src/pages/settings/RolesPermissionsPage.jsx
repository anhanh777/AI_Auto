import React, { useState, useEffect } from 'react';
import { authService } from '../../services/auth.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  Save,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';

const RolesPermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        authService.getRoles(),
        authService.getPermissions()
      ]);

      if (rolesRes.success && permRes.success) {
        setRoles(rolesRes.data);
        setPermissions(permRes.data);

        const defaultRole = rolesRes.data.find(r => r.name === 'STAFF') || rolesRes.data[0];
        if (defaultRole) {
          setSelectedRole(defaultRole);
          setSelectedPermissions(defaultRole.permissions || []);
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
  };

  const handleTogglePermission = (code) => {
    if (selectedRole?.name === 'ADMIN') return;
    if (selectedPermissions.includes(code)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== code));
    } else {
      setSelectedPermissions([...selectedPermissions, code]);
    }
  };

  const handleToggleModule = (modulePermissions) => {
    if (selectedRole?.name === 'ADMIN') return;
    const moduleCodes = modulePermissions.map(p => p.code);
    const allSelected = moduleCodes.every(code => selectedPermissions.includes(code));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(p => !moduleCodes.includes(p)));
    } else {
      const newPerms = new Set([...selectedPermissions, ...moduleCodes]);
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);

    try {
      const res = await authService.updateRolePermissions(selectedRole._id, selectedPermissions);
      if (res.success) {
        showToast('success', `Đã cập nhật phân quyền thành công cho vai trò: ${selectedRole.name}`);
        setRoles(roles.map(r => r._id === selectedRole._id ? { ...r, permissions: selectedPermissions } : r));
      }
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi lưu phân quyền');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const mod = perm.module || 'Khác';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="text-blue-600" />
            <span>Quản Lý Vai Trò & Phân Quyền Hệ Thống</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cấu hình danh sách mã quyền chi tiết cho từng vai trò nhân viên
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium shadow-sm transition cursor-pointer"
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* BỐ CỤC 2 CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CỘT 1: ROLES */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm h-fit">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center space-x-1.5">
            <Layers size={15} />
            <span>Danh sách Vai trò ({roles.length})</span>
          </h2>
          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = selectedRole?._id === role._id;
              const isAdmin = role.name === 'ADMIN';

              return (
                <button
                  key={role._id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                      : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span>{role.name}</span>
                      {isAdmin && <Lock size={13} className="text-amber-500" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-normal line-clamp-1">
                      {role.description || (isAdmin ? 'Toàn quyền' : 'Nhân viên tư vấn')}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full font-mono">
                    {isAdmin ? 'ALL' : `${role.permissions?.length || 0} quyền`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CỘT 2: PERMISSIONS */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Phân quyền chi tiết cho vai trò:</span>
                <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-extrabold">
                  {selectedRole?.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {selectedRole?.name === 'ADMIN'
                  ? 'Quản trị viên mặc định sở hữu toàn quyền cao nhất và không thể thay đổi.'
                  : 'Tích chọn các ô chức năng để cấp quyền cho nhân viên.'}
              </p>
            </div>

            {selectedRole?.name !== 'ADMIN' && (
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold text-sm transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                <span>Lưu thay đổi quyền</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([moduleName, modulePerms]) => {
              const allModuleSelected = modulePerms.every(p => selectedPermissions.includes(p.code));
              const isAdmin = selectedRole?.name === 'ADMIN';

              return (
                <div key={moduleName} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      {moduleName} ({modulePerms.length})
                    </h3>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleModule(modulePerms)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {allModuleSelected ? 'Bỏ chọn cả nhóm' : 'Chọn toàn bộ nhóm'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modulePerms.map((perm) => {
                      const isChecked = isAdmin || selectedPermissions.includes(perm.code);

                      return (
                        <div
                          key={perm.code}
                          onClick={() => handleTogglePermission(perm.code)}
                          className={`p-3 rounded-lg border transition cursor-pointer flex items-start space-x-3 ${
                            isChecked
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'
                          } ${isAdmin ? 'cursor-not-allowed opacity-90' : ''}`}
                        >
                          <div className="mt-0.5 text-blue-600 shrink-0">
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{perm.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                              {perm.code}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissionsPage;

import React from 'react';

const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-2xl font-bold text-center text-teal-700 mb-6">Đăng Nhập Hệ Thống AI Sales</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tên đăng nhập / Email</label>
            <input type="text" className="w-full mt-1 p-2 border rounded-md focus:ring-teal-500 focus:border-teal-500" placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input type="password" className="w-full mt-1 p-2 border rounded-md focus:ring-teal-500 focus:border-teal-500" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md shadow transition">
            Đăng Nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

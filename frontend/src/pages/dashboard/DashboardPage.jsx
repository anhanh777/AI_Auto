import React from 'react';

const DashboardPage = () => {
  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Tổng Quan Hệ Thống</h1>
        <p className="text-slate-500">Hệ thống tự động hóa tư vấn bán hàng online ứng dụng AI</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-xl shadow border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500">Hội thoại hôm nay</h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">128</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500">Tỷ lệ AI phản hồi</h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">94.5%</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500">Đơn hàng tự động trích xuất</h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">36</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500">Doanh thu tạm tính</h3>
          <p className="text-3xl font-bold text-teal-600 mt-2">18.500.000 ₫</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { businessService } from '../services/business.service.js';
import { useToast } from './ToastContext.jsx';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const [businesses, setBusinesses] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await businessService.getBusinesses();
      if (res.success && Array.isArray(res.data)) {
        setBusinesses(res.data);

        const savedBusinessId = localStorage.getItem('ai_sales_active_business_id');
        const found = res.data.find((b) => b._id === savedBusinessId);

        if (found) {
          setActiveBusiness(found);
        } else if (res.data.length > 0) {
          setActiveBusiness(res.data[0]);
          localStorage.setItem('ai_sales_active_business_id', res.data[0]._id);
        } else {
          setActiveBusiness(null);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách doanh nghiệp:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const switchBusiness = (business) => {
    setActiveBusiness(business);
    localStorage.setItem('ai_sales_active_business_id', business._id);
    showToast('info', `Đã chuyển sang quản lý cửa hàng: ${business.business_name}`);
  };

  const createBusiness = async (formData) => {
    try {
      const res = await businessService.createBusiness(formData);
      if (res.success) {
        showToast('success', 'Tạo cửa hàng mới thành công');
        await fetchBusinesses();
        switchBusiness(res.data);
        return res.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi tạo cửa hàng mới';
      showToast('error', msg);
      throw error;
    }
  };

  const joinBusiness = async (code) => {
    try {
      const res = await businessService.joinBusiness(code);
      if (res.success) {
        showToast('success', res.message || 'Yêu cầu tham gia đã được gửi tới Quản trị viên xét duyệt');
        await fetchBusinesses();
        if (res.data && !res.data.pending) {
          switchBusiness(res.data);
        }
        return res.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi gửi yêu cầu tham gia doanh nghiệp';
      showToast('error', msg);
      throw error;
    }
  };

  const exitBusiness = () => {
    setActiveBusiness(null);
    localStorage.removeItem('ai_sales_active_business_id');
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        switchBusiness,
        exitBusiness,
        fetchBusinesses,
        createBusiness,
        joinBusiness,
        loading
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

import React, { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../contexts/BusinessContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { productService } from '../../services/product.service.js';
import { categoryService } from '../../services/category.service.js';
import { uploadService } from '../../services/upload.service.js';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Check,
  Store,
  Tag,
  Boxes,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const ProductListPage = () => {
  const { activeBusiness } = useBusiness();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  // State danh sách & phân trang
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });

  // Bộ lọc
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    status: '',
    stock_status: ''
  });

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImportStockModal, setShowImportStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForImport, setSelectedProductForImport] = useState(null);

  // Active Tab trong Modal Product (1: Cơ bản, 2: Biến thể, 3: AI & Hình ảnh)
  const [activeProductTab, setActiveProductTab] = useState(1);

  // Form sản phẩm
  const [productForm, setProductForm] = useState({
    category_id: '',
    sku: '',
    product_name: '',
    base_price: '',
    sale_price: '',
    stock_physical: 0,
    stock_available: 0,
    variants_json: [],
    ai_selling_points: '',
    description: '',
    image_urls: [],
    status: 'ACTIVE'
  });

  // Form nhập kho
  const [importForm, setImportForm] = useState({
    variant_sku: '',
    quantity: 10,
    note: ''
  });

  // Form danh mục
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    parent_id: '',
    description: '',
    image_url: ''
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // Loading states
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Tải danh sách danh mục
  const fetchCategories = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      const res = await categoryService.getCategories({ business_id: activeBusiness._id });
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
    }
  }, [activeBusiness?._id]);

  // Tải danh sách sản phẩm
  const fetchProducts = useCallback(async (page = 1) => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const params = {
        business_id: activeBusiness._id,
        page,
        limit: pagination.limit,
        search: filters.search,
        category_id: filters.category_id,
        status: filters.status,
        stock_status: filters.stock_status
      };

      const res = await productService.getProducts(params);
      if (res.success) {
        setProducts(res.data || []);
        if (res.pagination) {
          setPagination({
            currentPage: res.pagination.currentPage,
            limit: res.pagination.limit,
            totalItems: res.pagination.totalItems,
            totalPages: res.pagination.totalPages
          });
        }
        if (res.metrics) {
          setMetrics(res.metrics);
        }
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?._id, filters, pagination.limit, showToast]);

  useEffect(() => {
    if (activeBusiness?._id) {
      fetchCategories();
      fetchProducts(1);
    }
  }, [activeBusiness?._id, filters, fetchCategories, fetchProducts]);

  // Format tiền tệ VNĐ
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Mở modal thêm mới sản phẩm
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setActiveProductTab(1);
    setProductForm({
      category_id: categories.length > 0 ? categories[0]._id : '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      product_name: '',
      base_price: '',
      sale_price: '',
      stock_physical: 0,
      stock_available: 0,
      variants_json: [
        { sku_con: '', size: 'M', color: 'Đen', price: '', stock: 20 },
        { sku_con: '', size: 'L', color: 'Đen', price: '', stock: 20 }
      ],
      ai_selling_points: '',
      description: '',
      image_urls: [],
      status: 'ACTIVE'
    });
    setShowProductModal(true);
  };

  // Mở modal chỉnh sửa sản phẩm
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setActiveProductTab(1);
    setProductForm({
      category_id: prod.category_id?._id || prod.category_id || '',
      sku: prod.sku || '',
      product_name: prod.product_name || '',
      base_price: prod.base_price || '',
      sale_price: prod.sale_price !== null ? prod.sale_price : '',
      stock_physical: prod.stock_physical || 0,
      stock_available: prod.stock_available || 0,
      variants_json: Array.isArray(prod.variants_json) ? prod.variants_json : [],
      ai_selling_points: prod.ai_selling_points || '',
      description: prod.description || '',
      image_urls: Array.isArray(prod.image_urls) ? prod.image_urls : [],
      status: prod.status || 'ACTIVE'
    });
    setShowProductModal(true);
  };

  // Upload hình ảnh sản phẩm qua Multer
  const handleUploadProductImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await uploadService.uploadImage(file);
      if (res.success && res.data?.url) {
        const fullUrl = res.data.url.startsWith('http')
          ? res.data.url
          : `http://localhost:5000${res.data.url}`;

        setProductForm((prev) => ({
          ...prev,
          image_urls: [...prev.image_urls, fullUrl]
        }));
        showToast('Tải ảnh sản phẩm thành công', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải ảnh', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Xóa bớt ảnh trong danh sách
  const handleRemoveImage = (index) => {
    setProductForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  // Thêm dòng biến thể mới
  const handleAddVariantRow = () => {
    setProductForm((prev) => ({
      ...prev,
      variants_json: [
        ...prev.variants_json,
        {
          sku_con: `${prev.sku || 'SKU'}-${prev.variants_json.length + 1}`,
          size: 'M',
          color: 'Trắng',
          price: prev.sale_price || prev.base_price || '',
          stock: 10
        }
      ]
    }));
  };

  // Cập nhật giá trị ô trong dòng biến thể
  const handleVariantChange = (index, field, value) => {
    setProductForm((prev) => {
      const updated = [...prev.variants_json];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants_json: updated };
    });
  };

  // Xóa dòng biến thể
  const handleRemoveVariantRow = (index) => {
    setProductForm((prev) => ({
      ...prev,
      variants_json: prev.variants_json.filter((_, i) => i !== index)
    }));
  };

  // Submit Lưu sản phẩm (Tạo mới hoặc Cập nhật)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!productForm.product_name || !productForm.sku || !productForm.category_id) {
      showToast('Vui lòng điền đầy đủ Tên, Mã SKU và Danh mục', 'warning');
      return;
    }

    try {
      setSubmittingProduct(true);
      const payload = {
        ...productForm,
        base_price: Number(productForm.base_price) || 0,
        sale_price: productForm.sale_price ? Number(productForm.sale_price) : null,
        variants_json: productForm.variants_json.map((v) => ({
          ...v,
          stock: Number(v.stock) || 0,
          price: v.price ? Number(v.price) : Number(productForm.sale_price || productForm.base_price)
        }))
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct._id, payload);
        showToast(`Đã cập nhật sản phẩm "${payload.product_name}" thành công`, 'success');
      } else {
        await productService.createProduct(payload);
        showToast(`Đã thêm sản phẩm "${payload.product_name}" thành công`, 'success');
      }

      setShowProductModal(false);
      fetchProducts(pagination.currentPage);
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu sản phẩm', 'error');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Xóa sản phẩm
  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm [${prod.product_name}]?`)) {
      return;
    }
    try {
      await productService.deleteProduct(prod._id);
      showToast('Đã xóa sản phẩm thành công', 'success');
      fetchProducts(pagination.currentPage);
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa sản phẩm', 'error');
    }
  };

  // Mở modal nhập kho nhanh
  const handleOpenImportStock = (prod) => {
    setSelectedProductForImport(prod);
    setImportForm({
      variant_sku: prod.variants_json?.[0]?.sku_con || '',
      quantity: 10,
      note: 'Nhập kho bổ sung'
    });
    setShowImportStockModal(true);
  };

  // Submit nhập kho nhanh
  const handleSubmitImportStock = async (e) => {
    e.preventDefault();
    if (!selectedProductForImport) return;

    try {
      await productService.importStock(selectedProductForImport._id, importForm);
      showToast('Nhập thêm số lượng tồn kho thành công!', 'success');
      setShowImportStockModal(false);
      fetchProducts(pagination.currentPage);
    } catch (err) {
      showToast(err.message || 'Lỗi khi nhập kho', 'error');
    }
  };

  // Quản lý Danh mục: Submit tạo / cập nhật
  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.category_name) return;

    try {
      if (editingCategoryId) {
        await categoryService.updateCategory(editingCategoryId, categoryForm);
        showToast('Cập nhật danh mục thành công', 'success');
      } else {
        await categoryService.createCategory(categoryForm);
        showToast('Tạo danh mục mới thành công', 'success');
      }
      setCategoryForm({ category_name: '', parent_id: '', description: '', image_url: '' });
      setEditingCategoryId(null);
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu danh mục', 'error');
    }
  };

  // Xóa danh mục
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.category_name}"?`)) return;
    try {
      await categoryService.deleteCategory(cat._id);
      showToast('Đã xóa danh mục thành công', 'success');
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa danh mục', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Package size={22} />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Quản Lý Danh Mục & Sản Phẩm
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cửa hàng hiện tại: <strong className="text-blue-600 dark:text-blue-400">{activeBusiness?.business_name || 'Đang chọn'}</strong> • Tồn kho đa biến thể & Điểm bán AI (RAG)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <FolderTree size={16} className="text-purple-500" />
            <span>Danh mục ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* ================= 4 METRIC CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng sản phẩm */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng sản phẩm</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {metrics.totalProducts}
            </h3>
            <span className="text-[10px] text-slate-400">Theo store hiện tại</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Package size={24} />
          </div>
        </div>

        {/* Card 2: Đang kinh doanh */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang kinh doanh</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.activeProducts}
            </h3>
            <span className="text-[10px] text-emerald-500 font-medium">Trạng thái ACTIVE</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 3: Hết hàng / Tồn thấp */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Hết hàng / Tồn thấp</p>
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {metrics.outOfStockProducts + metrics.lowStockProducts}
            </h3>
            <span className="text-[10px] text-rose-500 font-medium">
              {metrics.outOfStockProducts} hết • {metrics.lowStockProducts} tồn ≤ 5
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Card 4: Tổng danh mục */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng danh mục</p>
            <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {categories.length}
            </h3>
            <span className="text-[10px] text-purple-500 font-medium">Phân cấp ngành hàng</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <FolderTree size={24} />
          </div>
        </div>
      </div>

      {/* ================= BỘ LỌC & TÌM KIẾM ================= */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Tìm kiếm */}
          <div className="relative md:col-span-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SKU, điểm bán AI..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Lọc danh mục */}
          <div>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">-- Tất cả danh mục --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name} ({c.product_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc trạng thái kinh doanh */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
              <option value="OUT_OF_STOCK">Hết hàng (OUT_OF_STOCK)</option>
              <option value="HIDDEN">Tạm ẩn (HIDDEN)</option>
            </select>
          </div>

          {/* Lọc tồn kho */}
          <div className="flex items-center space-x-2">
            <select
              value={filters.stock_status}
              onChange={(e) => setFilters({ ...filters, stock_status: e.target.value })}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">-- Tất cả tồn kho --</option>
              <option value="in_stock">Còn nhiều ({'>'} 5)</option>
              <option value="low_stock">Sắp hết hàng (1 - 5)</option>
              <option value="out_of_stock">Hết hàng (= 0)</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setFilters({ search: '', category_id: '', status: '', stock_status: '' });
                fetchProducts(1);
              }}
              className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= BẢNG DANH SÁCH SẢN PHẨM ================= */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">Ảnh</th>
                <th className="py-3.5 px-4">Sản phẩm & Điểm bán AI</th>
                <th className="py-3.5 px-4">SKU / Danh mục</th>
                <th className="py-3.5 px-4 text-right">Giá bán</th>
                <th className="py-3.5 px-4 text-center">Tồn khả dụng</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline mr-2" size={18} />
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Chưa có sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const hasDiscount = prod.sale_price && prod.sale_price < prod.base_price;
                  const discountPercent = hasDiscount
                    ? Math.round(((prod.base_price - prod.sale_price) / prod.base_price) * 100)
                    : 0;

                  return (
                    <tr
                      key={prod._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition group"
                    >
                      {/* Cột 1: Thumbnail */}
                      <td className="py-3 px-4 text-center">
                        {prod.image_urls && prod.image_urls.length > 0 ? (
                          <img
                            src={prod.image_urls[0]}
                            alt={prod.product_name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm mx-auto"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </td>

                      {/* Cột 2: Tên & Điểm bán AI */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                          {prod.product_name}
                        </div>
                        {prod.variants_json && prod.variants_json.length > 0 && (
                          <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-semibold">
                              {prod.variants_json.length} biến thể
                            </span>
                            <span className="truncate">
                              {prod.variants_json.map((v) => `${v.size}/${v.color}`).slice(0, 3).join(', ')}
                            </span>
                          </div>
                        )}
                        {prod.ai_selling_points && (
                          <div className="mt-1 flex items-start space-x-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 p-1.5 rounded-lg">
                            <Sparkles size={11} className="shrink-0 mt-0.5" />
                            <span className="line-clamp-1 italic">{prod.ai_selling_points}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 3: SKU & Danh mục */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {prod.sku}
                        </span>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-[10px] font-medium">
                            {prod.category_id?.category_name || 'Chưa phân loại'}
                          </span>
                        </div>
                      </td>

                      {/* Cột 4: Giá bán */}
                      <td className="py-3 px-4 text-right">
                        {hasDiscount ? (
                          <div>
                            <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                              {formatCurrency(prod.sale_price)}
                            </span>
                            <div className="flex items-center justify-end space-x-1 mt-0.5">
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatCurrency(prod.base_price)}
                              </span>
                              <span className="text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-600 px-1 rounded font-bold">
                                -{discountPercent}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {formatCurrency(prod.base_price)}
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Tồn kho */}
                      <td className="py-3 px-4 text-center">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            prod.stock_available <= 0
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200'
                              : prod.stock_available <= 5
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200'
                          }`}
                        >
                          {prod.stock_available <= 0
                            ? 'Hết hàng (0)'
                            : `${prod.stock_available} sp`}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Vật lý: {prod.stock_physical || 0}
                        </p>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            prod.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                              : prod.status === 'OUT_OF_STOCK'
                              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {prod.status === 'ACTIVE' ? 'Đang bán' : prod.status === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Tạm ẩn'}
                        </span>
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenImportStock(prod)}
                            className="p-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 rounded-lg transition cursor-pointer"
                            title="Nhập kho nhanh"
                          >
                            <ArrowDownToLine size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa chi tiết"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={15} />
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

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages} (Tổng {pagination.totalItems} sản phẩm)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => fetchProducts(pagination.currentPage - 1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => fetchProducts(pagination.currentPage + 1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: THÊM / CHỈNH SỬA SẢN PHẨM ================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
                  <Package size={20} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cửa hàng: {activeBusiness?.business_name} (Bảng 3.32 Products)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Header */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 px-5 pt-2 bg-slate-50/50 dark:bg-slate-900/40">
              <button
                type="button"
                onClick={() => setActiveProductTab(1)}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeProductTab === 1
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Thông tin cơ bản
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab(2)}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  activeProductTab === 2
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>2. Biến thể Size & Màu</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                  {productForm.variants_json.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab(3)}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  activeProductTab === 3
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>3. Điểm bán AI (RAG) & Album</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: THÔNG TIN CƠ BẢN */}
              {activeProductTab === 1 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên sản phẩm *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Áo Thun Cotton Dáng Rộng Soulmade"
                        value={productForm.product_name}
                        onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mã SKU sản phẩm *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: AT-COTTON-01"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Danh mục sản phẩm *
                      </label>
                      <select
                        required
                        value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.category_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Giá niêm yết gốc (đ) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="250000"
                        value={productForm.base_price}
                        onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Giá khuyến mãi (nếu có)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="199000"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Trạng thái kinh doanh
                      </label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="ACTIVE">Đang kinh doanh (ACTIVE)</option>
                        <option value="OUT_OF_STOCK">Hết hàng (OUT_OF_STOCK)</option>
                        <option value="HIDDEN">Tạm ẩn (HIDDEN)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tồn kho tổng (Tự động tính từ biến thể)
                      </label>
                      <input
                        type="number"
                        disabled
                        value={
                          productForm.variants_json.length > 0
                            ? productForm.variants_json.reduce((s, v) => s + (Number(v.stock) || 0), 0)
                            : productForm.stock_available
                        }
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mô tả chi tiết sản phẩm
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Chất liệu 100% cotton định lượng 250gsm..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* TAB 2: BIẾN THỂ SIZE & MÀU SẮC */}
              {activeProductTab === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Danh sách các biến thể Size / Màu / Tồn kho
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        AI sẽ đối chiếu các biến thể này khi khách hỏi màu sắc & size số.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm biến thể</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                          <th className="p-2.5">Kích cỡ (Size)</th>
                          <th className="p-2.5">Màu sắc</th>
                          <th className="p-2.5">Mã SKU con</th>
                          <th className="p-2.5 w-24">Tồn kho</th>
                          <th className="p-2.5 w-32">Giá bán (đ)</th>
                          <th className="p-2.5 w-10 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {productForm.variants_json.map((variant, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                value={variant.size}
                                onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                                placeholder="M, L, XL, 30..."
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={variant.color}
                                onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                                placeholder="Đen, Trắng, Be..."
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={variant.sku_con}
                                onChange={(e) => handleVariantChange(idx, 'sku_con', e.target.value)}
                                placeholder="SKU-CON-01"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={variant.price}
                                onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                                placeholder="Theo giá SP"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariantRow(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: AI SELLING POINTS & ALBUM ẢNH */}
              {activeProductTab === 3 && (
                <div className="space-y-4">
                  {/* AI Selling Points */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="text-indigo-600 dark:text-indigo-400" size={18} />
                      <label className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                        Điểm bán hàng nổi bật cho AI (AI Selling Points)
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      Nhập các ưu điểm vượt trội của sản phẩm (chất liệu, công nghệ may, độ bền, form dáng) để AI Gemini tự động lấy làm dữ liệu thuyết phục khách mua hàng.
                    </p>
                    <textarea
                      rows={3}
                      placeholder="VD: Chất vải 100% cotton định lượng 250gsm dày dặn, không nhăn, không xù lông khi giặt máy. Cổ áo bo dệt chống bai dão. Dáng rộng trẻ trung che khuyết điểm bụng..."
                      value={productForm.ai_selling_points}
                      onChange={(e) => setProductForm({ ...productForm, ai_selling_points: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    ></textarea>
                  </div>

                  {/* Album ảnh sản phẩm */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Album hình ảnh sản phẩm
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {productForm.image_urls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square"
                        >
                          <img src={url} alt="Product" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Nút Upload Multer */}
                      <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl aspect-square flex flex-col items-center justify-center p-3 cursor-pointer bg-slate-50 dark:bg-slate-900 transition">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center">
                          {uploadingImage ? 'Đang tải...' : 'Thêm ảnh'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadProductImage}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {submittingProduct ? 'Đang lưu...' : editingProduct ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUẢN LÝ DANH MỤC ================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <FolderTree className="text-purple-600" />
              <span>Quản Lý Danh Mục Sản Phẩm</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cửa hàng: {activeBusiness?.business_name} (Bảng 3.31 Categories)
            </p>

            {/* Form Thêm/Sửa Danh mục */}
            <form onSubmit={handleSubmitCategory} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3 mb-4 border border-slate-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên danh mục *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Áo Thun & Polo"
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Danh mục cha (nếu có)
                  </label>
                  <select
                    value={categoryForm.parent_id}
                    onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  >
                    <option value="">-- Là danh mục gốc (Level 1) --</option>
                    {categories
                      .filter((c) => c._id !== editingCategoryId)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.category_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả danh mục
                </label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn gọn về danh mục..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2">
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCategoryForm({ category_name: '', parent_id: '', description: '', image_url: '' });
                    }}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  {editingCategoryId ? 'Cập nhật danh mục' : 'Thêm danh mục'}
                </button>
              </div>
            </form>

            {/* Danh sách danh mục hiện có */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Danh sách hiện có ({categories.length})
              </h4>
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {cat.category_name}
                    </h5>
                    <span className="text-[11px] text-slate-400">
                      Slug: {cat.slug} • Có <strong>{cat.product_count || 0}</strong> sản phẩm
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(cat._id);
                        setCategoryForm({
                          category_name: cat.category_name,
                          parent_id: cat.parent_id?._id || cat.parent_id || '',
                          description: cat.description || '',
                          image_url: cat.image_url || ''
                        });
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 rounded-lg"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: NHẬP KHO NHANH ================= */}
      {showImportStockModal && selectedProductForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={() => setShowImportStockModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <ArrowDownToLine className="text-blue-600" />
              <span>Nhập Kho Nhanh Sản Phẩm</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Sản phẩm: <strong>{selectedProductForImport.product_name}</strong>
            </p>

            <form onSubmit={handleSubmitImportStock} className="space-y-3">
              {selectedProductForImport.variants_json && selectedProductForImport.variants_json.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn biến thể cần cộng tồn kho *
                  </label>
                  <select
                    value={importForm.variant_sku}
                    onChange={(e) => setImportForm({ ...importForm, variant_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {selectedProductForImport.variants_json.map((v, i) => (
                      <option key={i} value={v.sku_con}>
                        {v.sku_con} - {v.size}/{v.color} (Tồn hiện tại: {v.stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số lượng nhập thêm *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={importForm.quantity}
                  onChange={(e) => setImportForm({ ...importForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú nhập kho
                </label>
                <input
                  type="text"
                  placeholder="VD: Nhập thêm lô hàng mới xưởng may..."
                  value={importForm.note}
                  onChange={(e) => setImportForm({ ...importForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowImportStockModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Xác nhận nhập kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPage;

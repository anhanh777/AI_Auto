import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit3,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Check,
  CheckCircle2,
  Video,
  Barcode,
  Share2,
  Bookmark,
  ShoppingCart,
  SlidersHorizontal,
  GripVertical
} from 'lucide-react';

const ProductListPage = () => {
  const { activeBusiness } = useBusiness();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active Menu: 'products' | 'categories'
  const [activeMenu, setActiveMenu] = useState('products');

  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Search queries
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Active Tab trong Modal Product (1: Thông tin cơ bản, 2: Truyền thông, 3: Giá, 4: Biến thể & Toppings)
  const [activeProductTab, setActiveProductTab] = useState(1);

  // Form Sản phẩm
  const [productForm, setProductForm] = useState({
    product_name: '',
    description: '',
    product_url: '',
    category_id: '',
    sku: '',
    barcode: '',
    stock_physical: 100,
    stock_available: 100,
    base_price: 400000,
    sale_price: 299000,
    cost_price: 0,
    import_price: 0,
    currency: 'VND',
    weight: 0,
    image_urls: [],
    video_url: '',
    variants_json: [],
    ai_selling_points: '',
    status: 'ACTIVE'
  });

  // Form Danh mục
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    parent_id: '',
    description: '',
    image_url: ''
  });

  // Loading flags
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 1. Tải danh sách danh mục
  const fetchCategories = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      const res = await categoryService.getCategories({
        business_id: activeBusiness._id,
        search: categorySearch
      });
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    }
  }, [activeBusiness?._id, categorySearch]);

  // 2. Tải danh sách sản phẩm
  const fetchProducts = useCallback(async () => {
    if (!activeBusiness?._id) return;
    try {
      setLoading(true);
      const res = await productService.getProducts({
        business_id: activeBusiness._id,
        search: productSearch,
        limit: 100
      });
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?._id, productSearch, showToast]);

  useEffect(() => {
    if (activeBusiness?._id) {
      fetchCategories();
      fetchProducts();
    }
  }, [activeBusiness?._id, fetchCategories, fetchProducts]);

  // Format tiền tệ VNĐ
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
    return `${Number(amount).toLocaleString('vi-VN')} đ`;
  };

  // Format ngày giờ
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format ngày giờ dạng MM/DD/YYYY cho Danh mục
  const formatCategoryDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year}, ${hours}:${minutes}`;
  };

  // ================= SẢN PHẨM: MỞ MODAL & XỬ LÝ FORM =================
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setActiveProductTab(1);
    const randomSku = `TM${Math.floor(10 + Math.random() * 90)}`;
    setProductForm({
      product_name: '',
      description: '',
      product_url: '',
      category_id: categories.length > 0 ? categories[0]._id : '',
      sku: randomSku,
      barcode: '',
      stock_physical: 100000,
      stock_available: 100000,
      base_price: 400000,
      sale_price: 299000,
      cost_price: 0,
      import_price: 0,
      currency: 'VND',
      weight: 0,
      image_urls: [],
      video_url: '',
      variants_json: [
        { sku_con: `${randomSku}-M`, size: 'M', color: 'Mặc định', stock: 50000, price: 299000 },
        { sku_con: `${randomSku}-L`, size: 'L', color: 'Mặc định', stock: 50000, price: 299000 }
      ],
      ai_selling_points: '',
      status: 'ACTIVE'
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setActiveProductTab(1);
    setProductForm({
      product_name: prod.product_name || '',
      description: prod.description || '',
      product_url: prod.product_url || '',
      category_id: prod.category_id?._id || prod.category_id || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      stock_physical: prod.stock_physical || 0,
      stock_available: prod.stock_available || 0,
      base_price: prod.base_price || 0,
      sale_price: prod.sale_price !== null ? prod.sale_price : '',
      cost_price: prod.cost_price || 0,
      import_price: prod.import_price || 0,
      currency: prod.currency || 'VND',
      weight: prod.weight || 0,
      image_urls: Array.isArray(prod.image_urls) ? prod.image_urls : [],
      video_url: prod.video_url || '',
      variants_json: Array.isArray(prod.variants_json) ? prod.variants_json : [],
      ai_selling_points: prod.ai_selling_points || '',
      status: prod.status || 'ACTIVE'
    });
    setShowProductModal(true);
  };

  // Tạo mã vạch tự động
  const handleGenerateBarcode = () => {
    const code = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    setProductForm((prev) => ({ ...prev, barcode: code }));
    showToast(`Đã tạo mã vạch tự động: ${code}`, 'info');
  };

  // Upload hình ảnh qua Multer
  const handleUploadImage = async (e, isMainImage = false) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await uploadService.uploadImage(file);
      if (res.success && res.data?.url) {
        const fullUrl = res.data.url.startsWith('http')
          ? res.data.url
          : `http://localhost:5000${res.data.url}`;

        if (isMainImage) {
          setProductForm((prev) => {
            const others = prev.image_urls.filter((_, idx) => idx !== 0);
            return { ...prev, image_urls: [fullUrl, ...others] };
          });
        } else {
          setProductForm((prev) => ({
            ...prev,
            image_urls: [...prev.image_urls, fullUrl]
          }));
        }
        showToast('Tải ảnh thành công', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải ảnh', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index) => {
    setProductForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, idx) => idx !== index)
    }));
  };

  // Biến thể
  const handleAddVariantRow = () => {
    setProductForm((prev) => ({
      ...prev,
      variants_json: [
        ...prev.variants_json,
        {
          sku_con: `${prev.sku || 'SKU'}-${prev.variants_json.length + 1}`,
          size: 'M',
          color: 'Tiêu chuẩn',
          stock: 10000,
          price: prev.sale_price || prev.base_price || 0
        }
      ]
    }));
  };

  const handleVariantChange = (index, field, value) => {
    setProductForm((prev) => {
      const updated = [...prev.variants_json];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants_json: updated };
    });
  };

  const handleRemoveVariantRow = (index) => {
    setProductForm((prev) => ({
      ...prev,
      variants_json: prev.variants_json.filter((_, idx) => idx !== index)
    }));
  };

  // Submit Lưu Sản phẩm
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!productForm.product_name || !productForm.sku || !productForm.category_id) {
      showToast('Vui lòng nhập Tên sản phẩm, Mã SKU và Danh mục', 'warning');
      return;
    }

    try {
      setSubmittingProduct(true);
      const payload = {
        ...productForm,
        base_price: Number(productForm.base_price) || 0,
        sale_price: productForm.sale_price !== '' && productForm.sale_price !== null ? Number(productForm.sale_price) : null,
        cost_price: Number(productForm.cost_price) || 0,
        import_price: Number(productForm.import_price) || 0,
        weight: Number(productForm.weight) || 0,
        stock_physical: Number(productForm.stock_physical) || 0,
        stock_available: Number(productForm.stock_available) || 0,
        variants_json: productForm.variants_json.map((v) => ({
          ...v,
          stock: Number(v.stock) || 0,
          price: Number(v.price) || Number(productForm.sale_price || productForm.base_price) || 0
        }))
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct._id, payload);
        showToast('Cập nhật sản phẩm thành công', 'success');
      } else {
        await productService.createProduct(payload);
        showToast('Thêm mới sản phẩm thành công', 'success');
      }

      setShowProductModal(false);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu sản phẩm', 'error');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Xóa sản phẩm
  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm [${prod.product_name}]?`)) return;
    try {
      await productService.deleteProduct(prod._id);
      showToast('Đã xóa sản phẩm thành công', 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa sản phẩm', 'error');
    }
  };

  // Toggle trạng thái On/Off nhanh từ bảng
  const handleToggleProductStatus = async (prod) => {
    try {
      const nextStatus = prod.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
      await productService.updateProduct(prod._id, { status: nextStatus });
      showToast(`Đã ${nextStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm ẩn'} sản phẩm`, 'info');
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật trạng thái', 'error');
    }
  };

  // ================= DANH MỤC: MỞ MODAL & XỬ LÝ FORM =================
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      category_name: '',
      parent_id: '',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150'
    });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      category_name: cat.category_name || '',
      parent_id: cat.parent_id?._id || cat.parent_id || '',
      description: cat.description || '',
      image_url: cat.image_url || ''
    });
    setShowCategoryModal(true);
  };

  const handleUploadCategoryAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const res = await uploadService.uploadImage(file);
      if (res.success && res.data?.url) {
        const fullUrl = res.data.url.startsWith('http')
          ? res.data.url
          : `http://localhost:5000${res.data.url}`;
        setCategoryForm((prev) => ({ ...prev, image_url: fullUrl }));
        showToast('Tải ảnh danh mục thành công', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải ảnh', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.category_name) return;

    try {
      setSubmittingCategory(true);
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, categoryForm);
        showToast('Cập nhật danh mục thành công', 'success');
      } else {
        await categoryService.createCategory(categoryForm);
        showToast('Thêm danh mục mới thành công', 'success');
      }
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu danh mục', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục [${cat.category_name}]?`)) return;
    try {
      await categoryService.deleteCategory(cat._id);
      showToast('Đã xóa danh mục thành công', 'success');
      fetchCategories();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa danh mục', 'error');
    }
  };

  // Checkbox chọn nhiều
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(products.map((p) => p._id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[calc(100vh-100px)] overflow-hidden">
      {/* ================= CỘT TRÁI: SIDEBAR SUB-MENU (SẢN PHẨM & CATEGORIES) ================= */}
      <aside className="w-56 shrink-0 border-r border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-between bg-slate-50/40 dark:bg-slate-900/40">
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 px-3">
            Sản Phẩm
          </h2>

          <nav className="space-y-1 text-xs font-semibold">
            {/* Tab 1: Sản phẩm */}
            <button
              type="button"
              onClick={() => setActiveMenu('products')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition text-left cursor-pointer ${
                activeMenu === 'products'
                  ? 'bg-[#fff1ee] text-[#f05a28] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Package size={16} className={activeMenu === 'products' ? 'text-[#f05a28]' : 'text-slate-400'} />
              <span>Sản phẩm</span>
            </button>

            {/* Tab 2: Categories */}
            <button
              type="button"
              onClick={() => setActiveMenu('categories')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition text-left cursor-pointer ${
                activeMenu === 'categories'
                  ? 'bg-[#fff1ee] text-[#f05a28] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GripVertical size={16} className={activeMenu === 'categories' ? 'text-[#f05a28]' : 'text-slate-400'} />
              <span>Categories</span>
            </button>
          </nav>
        </div>

        {/* Nút thu gọn / trang thái */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="truncate">{activeBusiness?.business_name || 'Store'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </aside>

      {/* ================= KHU VỰC CHÍNH BÊN PHẢI ================= */}
      <div className="flex-1 flex flex-col p-6 overflow-x-auto">
        {/* ================= MÀN HÌNH 1: SẢN PHẨM (ẢNH 1) ================= */}
        {activeMenu === 'products' && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Sản phẩm
              </h1>

              <div className="flex items-center space-x-2.5">
                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-48 sm:w-60 pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#f05a28]"
                  />
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Filter icon */}
                <button
                  type="button"
                  onClick={fetchProducts}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Lọc & Làm mới"
                >
                  <Filter size={14} />
                </button>

                {/* Quét sản phẩm button */}
                <button
                  type="button"
                  onClick={() => showToast('Tính năng Quét sản phẩm sẵn sàng đồng bộ Fanpage & Web', 'info')}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <span>Quét sản phẩm</span>
                  <ShoppingCart size={14} className="text-[#17234e]" />
                </button>

                {/* Action buttons */}
                <button
                  type="button"
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Chia sẻ / Xuất dữ liệu"
                >
                  <Share2 size={14} />
                </button>
                <button
                  type="button"
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Ghi nhớ"
                >
                  <Bookmark size={14} />
                </button>

                {/* NÚT THÊM MỚI SẢN PHẨM (#f05a28) */}
                <button
                  type="button"
                  onClick={handleOpenCreateProduct}
                  className="px-4 py-1.5 bg-[#f05a28] hover:bg-[#d94e20] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm mới</span>
                </button>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU SẢN PHẨM CHUẨN THEO ẢNH 1 */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={products.length > 0 && selectedProductIds.length === products.length}
                          className="rounded border-slate-300 text-[#f05a28] focus:ring-[#f05a28]"
                        />
                      </th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                      <th className="py-3 px-3 w-20">SKU</th>
                      <th className="py-3 px-3">SẢN PHẨM</th>
                      <th className="py-3 px-3 text-center">BIẾN THỂ</th>
                      <th className="py-3 px-3 text-right">GIÁ</th>
                      <th className="py-3 px-3 text-center">TỒN KHO KHẢ DỤNG</th>
                      <th className="py-3 px-3 text-center">TỒN KHO THỰC TẾ</th>
                      <th className="py-3 px-3">NGƯỜI TẠO</th>
                      <th className="py-3 px-3 text-center">NGUỒN</th>
                      <th className="py-3 px-3 text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          <RefreshCw className="animate-spin inline mr-2" size={16} />
                          Đang tải danh sách sản phẩm...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          Chưa có sản phẩm nào. Nhấn "+ Thêm mới" để bắt đầu.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const hasSale = prod.sale_price !== null && prod.sale_price !== undefined && prod.sale_price < prod.base_price;
                        const mainImage = prod.image_urls?.[0] || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100';
                        const creatorName = prod.created_by?.full_name || 'Anh Trần';
                        const creatorAvatar = prod.created_by?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60';
                        const isChecked = selectedProductIds.includes(prod._id);

                        return (
                          <tr key={prod._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSelectOne(prod._id)}
                                className="rounded border-slate-300 text-[#f05a28] focus:ring-[#f05a28]"
                              />
                            </td>

                            {/* Status Icon Tick Xanh Tròn */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(prod)}
                                title={prod.status === 'ACTIVE' ? 'Đang hoạt động (Click để ẩn)' : 'Đang tạm ẩn (Click để bật)'}
                                className="cursor-pointer"
                              >
                                {prod.status === 'ACTIVE' ? (
                                  <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-50" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-100" />
                                )}
                              </button>
                            </td>

                            {/* SKU */}
                            <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {prod.sku}
                            </td>

                            {/* SẢN PHẨM: Thumbnail + Tên + Dòng ID xanh dương */}
                            <td className="py-3 px-3 max-w-xs">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={mainImage}
                                  alt={prod.product_name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                                />
                                <div className="truncate">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs" title={prod.product_name}>
                                    {prod.product_name}
                                  </h4>
                                  <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                    ID: <span className="hover:underline">{prod._id?.substring(0, 16) || '25172272849091028'}</span> and {prod.variants_json?.length || 1} more
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* BIẾN THỂ */}
                            <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                              {prod.variants_json && prod.variants_json.length > 0
                                ? `${prod.variants_json.length} biến thể`
                                : '-'}
                            </td>

                            {/* GIÁ: Giá bán đậm + Giá gốc gạch đỏ */}
                            <td className="py-3 px-3 text-right">
                              {hasSale ? (
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(prod.sale_price)}
                                  </div>
                                  <div className="text-[11px] text-rose-500 line-through">
                                    {formatCurrency(prod.base_price)}
                                  </div>
                                </div>
                              ) : (
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(prod.base_price)}
                                </div>
                              )}
                            </td>

                            {/* TỒN KHO KHẢ DỤNG */}
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {Number(prod.stock_available || 0).toLocaleString()}
                            </td>

                            {/* TỒN KHO THỰC TẾ */}
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {Number(prod.stock_physical || 0).toLocaleString()}
                            </td>

                            {/* NGƯỜI TẠO: Avatar tròn + Tên + Ngày giờ */}
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={creatorAvatar}
                                  alt={creatorName}
                                  className="w-7 h-7 rounded-full object-cover border shrink-0"
                                />
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {creatorName}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {formatDateTime(prod.created_at || new Date())}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* NGUỒN: Smax Ai Badge */}
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#17234e] text-white rounded text-[10px] font-bold">
                                <span className="text-blue-400 font-extrabold">S</span>
                                <span>Smax Ai</span>
                              </span>
                            </td>

                            {/* THAO TÁC: Sửa / Xóa */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProduct(prod)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition cursor-pointer"
                                  title="Chỉnh sửa sản phẩm"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod)}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Xóa sản phẩm"
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

              {/* FOOTER: THÙNG RÁC + TỔNG SỐ LƯỢNG */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40 text-xs">
                <button
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={() => {
                    if (window.confirm(`Xóa ${selectedProductIds.length} sản phẩm đã chọn?`)) {
                      Promise.all(selectedProductIds.map((id) => productService.deleteProduct(id)))
                        .then(() => {
                          showToast(`Đã xóa ${selectedProductIds.length} sản phẩm`, 'success');
                          setSelectedProductIds([]);
                          fetchProducts();
                        });
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
                  title="Xóa các mục đã chọn"
                >
                  <Trash2 size={14} />
                </button>

                <span className="font-bold text-slate-600 dark:text-slate-400">
                  Tổng: {products.length} / {products.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= MÀN HÌNH 2: CATEGORIES (ẢNH 2) ================= */}
        {activeMenu === 'categories' && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Categories
              </h1>

              <div className="flex items-center space-x-2.5">
                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-48 sm:w-60 pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#f05a28]"
                  />
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* NÚT THÊM MỚI DANH MỤC (#f05a28) */}
                <button
                  type="button"
                  onClick={handleOpenCreateCategory}
                  className="px-4 py-1.5 bg-[#f05a28] hover:bg-[#d94e20] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Thêm mới</span>
                </button>
              </div>
            </div>

            {/* BẢNG DỮ LIỆU DANH MỤC CHUẨN THEO ẢNH 2 */}
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-12">#</th>
                      <th className="py-3 px-4">DANH MỤC</th>
                      <th className="py-3 px-4">MÔ TẢ</th>
                      <th className="py-3 px-4">NGÀY TẠO</th>
                      <th className="py-3 px-4 text-right w-24">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Chưa có danh mục nào. Nhấn "+ Thêm mới" để tạo danh mục đầu tiên.
                        </td>
                      </tr>
                    ) : (
                      categories.map((cat, idx) => (
                        <tr key={cat._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          {/* STT */}
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {idx + 1}
                          </td>

                          {/* DANH MỤC: Thumbnail + Tên + ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              {cat.image_url ? (
                                <img
                                  src={cat.image_url}
                                  alt={cat.category_name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                                  <ImageIcon size={16} />
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {cat.category_name}
                                </h4>
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                                  ID: <span className="hover:underline">{cat._id}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* MÔ TẢ */}
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {cat.description || '-'}
                          </td>

                          {/* NGÀY TẠO */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {formatCategoryDate(cat.created_at || new Date())}
                          </td>

                          {/* THAO TÁC */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition cursor-pointer"
                                title="Chỉnh sửa danh mục"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Xóa danh mục"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CẬP NHẬT / THÊM SẢN PHẨM (CHUẨN 100% THEO ẢNH 3, 4, 5) ================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingProduct ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
                </h3>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#17234e] text-white rounded text-[10px] font-bold">
                  <span className="text-blue-400 font-extrabold">S</span>
                  <span>Smax Ai</span>
                </span>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Navigation (Ảnh 3, 4, 5) */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-1 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveProductTab(1)}
                className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
                  activeProductTab === 1
                    ? 'border-[#f05a28] text-[#f05a28]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Thông tin cơ bản
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab(2)}
                className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
                  activeProductTab === 2
                    ? 'border-[#f05a28] text-[#f05a28]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Truyền thông
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab(3)}
                className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
                  activeProductTab === 3
                    ? 'border-[#f05a28] text-[#f05a28]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Giá
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab(4)}
                className={`pb-2.5 px-4 border-b-2 transition cursor-pointer ${
                  activeProductTab === 4
                    ? 'border-[#f05a28] text-[#f05a28]'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Biến thể & Toppings
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* ================= TAB 1: THÔNG TIN CƠ BẢN (ẢNH 3) ================= */}
              {activeProductTab === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cột trái: Tên sản phẩm & Mô tả sản phẩm */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          TÊN SẢN PHẨM <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-slate-400 text-[11px]">
                          {productForm.product_name.length}/200
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={200}
                        placeholder="VD: Kem Massage Body Thon Gọn – Săn Chắc Sline 6D+..."
                        value={productForm.product_name}
                        onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          MÔ TẢ SẢN PHẨM <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-slate-400 text-[11px]">
                          {productForm.description.length}/9999
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        required
                        maxLength={9999}
                        placeholder="Kem massage Sline 6D+ là lựa chọn phù hợp cho những ai muốn xây dựng thói quen chăm sóc cơ thể tại nhà...

Ưu điểm nổi bật (AI Training):
- Chiết xuất thảo dược tự nhiên dịu nhẹ
- Hỗ trợ làm săn chắc vùng eo, đùi, bắp tay"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      ></textarea>
                    </div>
                  </div>

                  {/* Cột phải: URL, Danh mục, SKU, Mã vạch, Tồn thực tế, Tồn khả dụng */}
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ĐƯỜNG DẪN SẢN PHẨM (URL)
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.lventa.online/tan-mo-6d"
                        value={productForm.product_url}
                        onChange={(e) => setProductForm({ ...productForm, product_url: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        DANH MỤC <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.category_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Khung SKU & Mã Vạch & Tồn kho */}
                    <div className="p-4 bg-slate-50/40 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            SKU (MÃ SẢN PHẨM) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="TM10"
                            value={productForm.sku}
                            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700 dark:text-slate-300">
                              MÃ VẠCH
                            </label>
                            <button
                              type="button"
                              onClick={handleGenerateBarcode}
                              className="text-[10px] text-[#f05a28] hover:underline font-bold flex items-center space-x-0.5"
                            >
                              <Barcode size={11} />
                              <span>Tạo mã tự động</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Nhập giá trị mã vạch..."
                            value={productForm.barcode}
                            onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            TỒN KHO THỰC TẾ
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={productForm.stock_physical}
                            onChange={(e) => setProductForm({ ...productForm, stock_physical: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            TỒN KHO KHẢ DỤNG
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={productForm.stock_available}
                            onChange={(e) => setProductForm({ ...productForm, stock_available: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: TRUYỀN THÔNG (ẢNH 4) ================= */}
              {activeProductTab === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cột trái: Hình ảnh chính */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mb-0.5">
                        <span className="text-[#f05a28] font-black">|</span>
                        <span>Hình ảnh chính</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">Hình ảnh đại diện sản phẩm</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-3">
                      {productForm.image_urls.length > 0 ? (
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 max-w-[280px] max-h-[280px] aspect-square shadow-sm">
                          <img
                            src={productForm.image_urls[0]}
                            alt="Main product"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold cursor-pointer">
                            <span>Đổi ảnh chính</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadImage(e, true)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="w-full max-w-[280px] aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer hover:border-[#f05a28] transition bg-white dark:bg-slate-900">
                          <Upload size={24} className="text-slate-400 mb-2" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">Tải ảnh đại diện</span>
                          <span className="text-[10px] text-slate-400 mt-1">PNG, JPG tối đa 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadImage(e, true)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Danh sách ảnh sản phẩm & Video sản phẩm */}
                  <div className="space-y-4">
                    {/* Danh sách ảnh sản phẩm */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mb-0.5">
                        <span className="text-[#f05a28] font-black">|</span>
                        <span>Danh sách ảnh sản phẩm</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Tải lên nhiều hình ảnh chất lượng cao để khách hàng thấy được nhiều khía cạnh của sản phẩm.
                      </p>

                      <div className="grid grid-cols-4 gap-2.5">
                        {productForm.image_urls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                          >
                            <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}

                        {/* Ô thêm ảnh mới (+) */}
                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#f05a28] rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-900 transition text-[#f05a28]">
                          <Plus size={18} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadImage(e, false)}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Video sản phẩm */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mb-0.5">
                        <span className="text-[#f05a28] font-black">|</span>
                        <span>Video sản phẩm</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Thêm liên kết video để giới thiệu sản phẩm của bạn một cách sinh động nhất.
                      </p>

                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center bg-white dark:bg-slate-900 text-center">
                        <Video size={24} className="text-[#f05a28] mb-1" />
                        <span className="font-bold text-[11px] text-[#f05a28] uppercase tracking-wider">
                          THÊM VIDEO
                        </span>
                        <input
                          type="text"
                          placeholder="Dán link Video (Youtube, Facebook, MP4)..."
                          value={productForm.video_url}
                          onChange={(e) => setProductForm({ ...productForm, video_url: e.target.value })}
                          className="w-full mt-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: GIÁ (ẢNH 5) ================= */}
              {activeProductTab === 3 && (
                <div className="p-5 bg-slate-50/40 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1 mb-0.5">
                      <span className="text-[#f05a28] font-black">|</span>
                      <span>Giá sản phẩm</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Quản lý giá bán và khối lượng/trọng lượng sản phẩm hiện có trong kho.
                    </p>
                  </div>

                  {/* Hàng 1: Giá Bán | Giá Khuyến Mãi | Giá Vốn | Giá Nhập Kho */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GIÁ BÁN <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="400000"
                        value={productForm.base_price}
                        onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GIÁ KHUYẾN MÃI
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="299000"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[#f05a28] focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GIÁ VỐN
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={productForm.cost_price}
                        onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GIÁ NHẬP KHO
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={productForm.import_price}
                        onChange={(e) => setProductForm({ ...productForm, import_price: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Hàng 2: Tiền tệ | Khối lượng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        TIỀN TỆ
                      </label>
                      <select
                        value={productForm.currency}
                        onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                      >
                        <option value="VND">VND (Việt Nam Đồng)</option>
                        <option value="USD">USD (Đô la Mỹ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        KHỐI LƯỢNG
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={productForm.weight}
                          onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                          className="w-full px-3 py-2 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 4: BIẾN THỂ & TOPPINGS ================= */}
              {activeProductTab === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                        <span className="text-[#f05a28] font-black">|</span>
                        <span>Biến thể Size / Màu sắc / Tồn kho (Bảng 3.32 variants_json)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        AI Gemini sẽ đọc các biến thể này để giải đáp khi khách hỏi Size/Màu cụ thể.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="px-3 py-1.5 bg-[#f05a28] text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Thêm biến thể</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                          <th className="p-2.5">Kích cỡ (Size)</th>
                          <th className="p-2.5">Màu sắc</th>
                          <th className="p-2.5">Mã SKU con</th>
                          <th className="p-2.5 w-24">Tồn kho</th>
                          <th className="p-2.5 w-32">Giá bán (đ)</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {productForm.variants_json.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400">
                              Chưa có biến thể nào. Nhấn "+ Thêm biến thể" để thiết lập.
                            </td>
                          </tr>
                        ) : (
                          productForm.variants_json.map((variant, idx) => (
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
                                  placeholder="Đen, Trắng..."
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={variant.sku_con}
                                  onChange={(e) => handleVariantChange(idx, 'sku_con', e.target.value)}
                                  placeholder="TM10-M"
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={variant.stock}
                                  onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={variant.price}
                                  onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Footer (Ảnh 3, 4, 5) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {/* Switch Hoạt động */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm((prev) => ({
                        ...prev,
                        status: prev.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE'
                      }))
                    }
                    className={`w-10 h-5 rounded-full p-0.5 transition cursor-pointer ${
                      productForm.status === 'ACTIVE' ? 'bg-[#f05a28]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition transform ${
                        productForm.status === 'ACTIVE' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Hoạt động</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Thoát
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProduct}
                    className="px-6 py-2 bg-[#f05a28] hover:bg-[#d94e20] text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {submittingProduct ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM / SỬA DANH MỤC ================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              {editingCategory ? 'Cập nhật danh mục' : 'Thêm mới danh mục'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Phân cấp nhóm sản phẩm (Bảng 3.31 Categories)
            </p>

            <form onSubmit={handleSubmitCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Boby, Xịt Khử Mùi..."
                  value={categoryForm.category_name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả danh mục
                </label>
                <input
                  type="text"
                  placeholder="VD: Chăm sóc cơ thể..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#f05a28] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ảnh đại diện danh mục
                </label>
                <div className="flex items-center space-x-3">
                  {categoryForm.image_url ? (
                    <img
                      src={categoryForm.image_url}
                      alt="Category"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  ) : null}
                  <label className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer flex items-center space-x-1.5">
                    <Upload size={14} />
                    <span>{uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCategoryAvatar}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Thoát
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  className="px-5 py-2 bg-[#f05a28] hover:bg-[#d94e20] text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {submittingCategory ? 'Đang lưu...' : 'Lưu'}
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

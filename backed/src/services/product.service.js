import { Product, Category } from '../models/index.js';
import { createSlug } from '../helpers/slug.helper.js';
import { getPagination } from '../helpers/pagination.helper.js';

/**
 * Lấy danh sách sản phẩm có phân trang, tìm kiếm, lọc theo doanh nghiệp
 */
export const getProductsService = async ({
  business_id,
  page = 1,
  limit = 20,
  search = '',
  category_id = '',
  status = '',
  stock_status = ''
}) => {
  if (!business_id) {
    throw new Error('Thiếu thông tin business_id của doanh nghiệp');
  }

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { product_name: searchRegex },
      { sku: searchRegex },
      { barcode: searchRegex },
      { ai_selling_points: searchRegex },
      { description: searchRegex },
      { 'variants_json.sku_con': searchRegex }
    ];
  }

  if (category_id && category_id.trim() !== '') {
    filter.category_ids = { $in: [category_id.trim()] };
  }

  if (status && status.trim() !== '') {
    filter.status = status;
  }

  if (stock_status === 'out_of_stock') {
    filter.stock_available = { $lte: 0 };
  } else if (stock_status === 'low_stock') {
    filter.stock_available = { $gt: 0, $lte: 5 };
  } else if (stock_status === 'in_stock') {
    filter.stock_available = { $gt: 5 };
  }

  const totalItems = await Product.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const products = await Product.find(filter)
    .populate('category_ids', 'category_name slug image_url')
    .populate('created_by', 'full_name avatar username')
    .sort({ created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  // Thống kê nhanh toàn bộ số liệu theo business
  const [totalProducts, activeProducts, outOfStockProducts, lowStockProducts] = await Promise.all([
    Product.countDocuments({ business_id }),
    Product.countDocuments({ business_id, status: 'ACTIVE' }),
    Product.countDocuments({ business_id, stock_available: { $lte: 0 } }),
    Product.countDocuments({ business_id, stock_available: { $gt: 0, $lte: 5 } })
  ]);

  return {
    products,
    pagination: {
      currentPage: pagination.page,
      limit: pagination.limit,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev
    },
    metrics: {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts
    }
  };
};

/**
 * Lấy chi tiết 1 sản phẩm
 */
export const getProductByIdService = async (productId, business_id) => {
  const query = { _id: productId };
  if (business_id) query.business_id = business_id;

  const product = await Product.findOne(query)
    .populate('category_ids', 'category_name slug image_url')
    .populate('created_by', 'full_name avatar username');

  if (!product) {
    throw new Error('Không tìm thấy sản phẩm');
  }
  return product;
};

/**
 * Tạo mới sản phẩm
 */
export const createProductService = async (data, userId) => {
  const {
    business_id,
    category_ids = [],
    category_id,
    sku,
    barcode = '',
    product_name,
    product_url = '',
    base_price,
    sale_price,
    cost_price = 0,
    import_price = 0,
    currency = 'VND',
    weight = 0,
    variants_json = [],
    ai_selling_points = '',
    description = '',
    image_urls = [],
    video_url = '',
    status = 'ACTIVE'
  } = data;

  if (!business_id) throw new Error('business_id là bắt buộc');

  // Chuẩn hóa mảng danh mục
  let rawCatIds = Array.isArray(category_ids) && category_ids.length > 0 ? category_ids : (category_id ? [category_id] : []);
  if (rawCatIds.length === 0) {
    throw new Error('Sản phẩm phải thuộc ít nhất 1 danh mục');
  }

  // 1. Kiểm tra danh mục hợp lệ
  const validCategories = await Category.find({ _id: { $in: rawCatIds }, business_id });
  if (validCategories.length === 0) {
    throw new Error('Danh mục được chỉ định không tồn tại hoặc không thuộc doanh nghiệp này');
  }
  const finalCatIds = validCategories.map((c) => c._id);

  // 2. Kiểm tra trùng SKU
  const existingSku = await Product.findOne({
    business_id,
    sku: sku.trim().toUpperCase()
  });
  if (existingSku) {
    throw new Error(`Mã SKU "${sku}" đã tồn tại trong doanh nghiệp này`);
  }

  // 3. Tự động tính tổng tồn kho vật lý và khả dụng từ mảng biến thể
  let calculatedPhysicalStock = Number(data.stock_physical) || 0;
  let calculatedAvailableStock = Number(data.stock_available) || calculatedPhysicalStock;

  if (Array.isArray(variants_json) && variants_json.length > 0) {
    calculatedPhysicalStock = variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    calculatedAvailableStock = calculatedPhysicalStock;
  }

  // Trạng thái
  let finalStatus = status;
  if (calculatedAvailableStock <= 0 && status === 'ACTIVE') {
    finalStatus = 'OUT_OF_STOCK';
  }

  const baseSlug = createSlug(product_name);
  const uniqueSlug = `${baseSlug}-${sku.trim().toLowerCase()}`;

  const newProduct = await Product.create({
    business_id,
    category_ids: finalCatIds,
    sku: sku.trim().toUpperCase(),
    barcode: barcode.trim(),
    product_name: product_name.trim(),
    slug: uniqueSlug,
    product_url: product_url.trim(),
    base_price: Number(base_price),
    sale_price: sale_price !== undefined && sale_price !== '' && sale_price !== null ? Number(sale_price) : null,
    cost_price: Number(cost_price) || 0,
    import_price: Number(import_price) || 0,
    currency,
    weight: Number(weight) || 0,
    stock_physical: calculatedPhysicalStock,
    stock_available: calculatedAvailableStock,
    variants_json: Array.isArray(variants_json) ? variants_json : [],
    ai_selling_points: ai_selling_points ? ai_selling_points.trim() : '',
    description: description ? description.trim() : '',
    image_urls: Array.isArray(image_urls) ? image_urls : [],
    video_url: video_url ? video_url.trim() : '',
    status: finalStatus,
    created_by: userId || null
  });

  const populatedProduct = await Product.findById(newProduct._id)
    .populate('category_ids', 'category_name slug image_url')
    .populate('created_by', 'full_name avatar username');

  return populatedProduct;
};

/**
 * Cập nhật sản phẩm
 */
export const updateProductService = async (productId, data, userId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm để cập nhật');
  }

  // Cập nhật danh sách danh mục
  if (data.category_ids !== undefined || data.category_id !== undefined) {
    let rawCatIds = Array.isArray(data.category_ids) ? data.category_ids : (data.category_id ? [data.category_id] : []);
    if (rawCatIds.length > 0) {
      const validCategories = await Category.find({
        _id: { $in: rawCatIds },
        business_id: product.business_id
      });
      if (validCategories.length === 0) throw new Error('Danh mục không hợp lệ');
      product.category_ids = validCategories.map((c) => c._id);
    }
  }

  if (data.sku && data.sku.trim().toUpperCase() !== product.sku) {
    const existingSku = await Product.findOne({
      business_id: product.business_id,
      sku: data.sku.trim().toUpperCase(),
      _id: { $ne: productId }
    });
    if (existingSku) {
      throw new Error(`Mã SKU "${data.sku}" đã được sử dụng bởi sản phẩm khác`);
    }
    product.sku = data.sku.trim().toUpperCase();
  }

  if (data.barcode !== undefined) product.barcode = data.barcode.trim();
  if (data.product_url !== undefined) product.product_url = data.product_url.trim();
  if (data.video_url !== undefined) product.video_url = data.video_url.trim();
  if (data.cost_price !== undefined) product.cost_price = Number(data.cost_price) || 0;
  if (data.import_price !== undefined) product.import_price = Number(data.import_price) || 0;
  if (data.currency !== undefined) product.currency = data.currency;
  if (data.weight !== undefined) product.weight = Number(data.weight) || 0;

  if (data.product_name) {
    product.product_name = data.product_name.trim();
    product.slug = `${createSlug(data.product_name)}-${product.sku.toLowerCase()}`;
  }

  if (data.base_price !== undefined) product.base_price = Number(data.base_price);
  if (data.sale_price !== undefined) {
    product.sale_price = data.sale_price !== '' && data.sale_price !== null ? Number(data.sale_price) : null;
  }

  if (data.variants_json !== undefined && Array.isArray(data.variants_json)) {
    product.variants_json = data.variants_json;
    if (data.variants_json.length > 0) {
      const sumStock = data.variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      product.stock_physical = sumStock;
      product.stock_available = sumStock;
    }
  } else {
    if (data.stock_physical !== undefined) product.stock_physical = Number(data.stock_physical);
    if (data.stock_available !== undefined) product.stock_available = Number(data.stock_available);
  }

  if (data.ai_selling_points !== undefined) product.ai_selling_points = data.ai_selling_points;
  if (data.description !== undefined) product.description = data.description;
  if (data.image_urls !== undefined && Array.isArray(data.image_urls)) {
    product.image_urls = data.image_urls;
  }

  if (data.status) {
    product.status = data.status;
  }

  if (userId) product.updated_by = userId;

  await product.save();

  const updatedProduct = await Product.findById(productId)
    .populate('category_ids', 'category_name slug image_url')
    .populate('created_by', 'full_name avatar username');

  return updatedProduct;
};

/**
 * Xóa sản phẩm
 */
export const deleteProductService = async (productId, business_id) => {
  const query = { _id: productId };
  if (business_id) query.business_id = business_id;

  const product = await Product.findOne(query);
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm để xóa');
  }

  await Product.findByIdAndDelete(productId);
  return { success: true, message: `Đã xóa sản phẩm "${product.product_name}" thành công` };
};

/**
 * Nhập thêm số lượng tồn kho nhanh cho sản phẩm / biến thể
 */
export const importStockService = async (productId, { variant_sku, quantity = 0, note = '' }, userId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm');
  }

  const importQty = Number(quantity);
  if (isNaN(importQty) || importQty <= 0) {
    throw new Error('Số lượng nhập kho phải lớn hơn 0');
  }

  if (variant_sku && product.variants_json && product.variants_json.length > 0) {
    let found = false;
    product.variants_json = product.variants_json.map((v) => {
      if (v.sku_con === variant_sku || `${product.sku}-${v.size}-${v.color}` === variant_sku) {
        found = true;
        return { ...v, stock: (Number(v.stock) || 0) + importQty };
      }
      return v;
    });

    if (!found) {
      throw new Error(`Không tìm thấy biến thể có mã "${variant_sku}"`);
    }

    const newTotal = product.variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    product.stock_physical = newTotal;
    product.stock_available = newTotal;
  } else {
    product.stock_physical += importQty;
    product.stock_available += importQty;
  }

  if (product.stock_available > 0 && product.status === 'OUT_OF_STOCK') {
    product.status = 'ACTIVE';
  }

  if (userId) product.updated_by = userId;
  await product.save();

  return {
    success: true,
    message: `Đã nhập thêm ${importQty} sản phẩm vào kho thành công`,
    product
  };
};

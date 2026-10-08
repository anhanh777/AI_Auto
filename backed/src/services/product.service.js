import { Product, Category } from '../models/index.js';
import { createSlug } from '../helpers/slug.helper.js';
import { getPagination } from '../helpers/pagination.helper.js';

/**
 * Lấy danh sách sản phẩm có phân trang, tìm kiếm, lọc theo doanh nghiệp
 */
export const getProductsService = async ({
  business_id,
  page = 1,
  limit = 10,
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
      { ai_selling_points: searchRegex },
      { description: searchRegex },
      { 'variants_json.sku_con': searchRegex }
    ];
  }

  if (category_id && category_id.trim() !== '') {
    filter.category_id = category_id;
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
    .populate('category_id', 'category_name slug')
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

  const product = await Product.findOne(query).populate('category_id', 'category_name slug');
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
    category_id,
    sku,
    product_name,
    base_price,
    sale_price,
    variants_json = [],
    ai_selling_points = '',
    description = '',
    image_urls = [],
    status = 'ACTIVE'
  } = data;

  if (!business_id) throw new Error('business_id là bắt buộc');
  if (!category_id) throw new Error('category_id là bắt buộc');

  // 1. Kiểm tra danh mục có tồn tại trong doanh nghiệp không
  const category = await Category.findOne({ _id: category_id, business_id });
  if (!category) {
    throw new Error('Danh mục được chỉ định không tồn tại hoặc không thuộc doanh nghiệp này');
  }

  // 2. Kiểm tra trùng SKU trong cùng doanh nghiệp
  const existingSku = await Product.findOne({
    business_id,
    sku: sku.trim().toUpperCase()
  });
  if (existingSku) {
    throw new Error(`Mã SKU [${sku}] đã tồn tại trong doanh nghiệp này`);
  }

  // 3. Tự động tính tổng tồn kho vật lý và khả dụng từ mảng biến thể (nếu có)
  let calculatedPhysicalStock = Number(data.stock_physical) || 0;
  let calculatedAvailableStock = Number(data.stock_available) || calculatedPhysicalStock;

  if (Array.isArray(variants_json) && variants_json.length > 0) {
    calculatedPhysicalStock = variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    calculatedAvailableStock = calculatedPhysicalStock;
  }

  // Tự động chuyển status sang OUT_OF_STOCK nếu hết hàng
  let finalStatus = status;
  if (calculatedAvailableStock <= 0 && status === 'ACTIVE') {
    finalStatus = 'OUT_OF_STOCK';
  }

  const baseSlug = createSlug(product_name);
  const uniqueSlug = `${baseSlug}-${sku.trim().toLowerCase()}`;

  const newProduct = await Product.create({
    business_id,
    category_id,
    sku: sku.trim().toUpperCase(),
    product_name: product_name.trim(),
    slug: uniqueSlug,
    base_price: Number(base_price),
    sale_price: sale_price !== undefined && sale_price !== null ? Number(sale_price) : null,
    stock_physical: calculatedPhysicalStock,
    stock_available: calculatedAvailableStock,
    variants_json: Array.isArray(variants_json) ? variants_json : [],
    ai_selling_points: ai_selling_points ? ai_selling_points.trim() : '',
    description: description ? description.trim() : '',
    image_urls: Array.isArray(image_urls) ? image_urls : [],
    status: finalStatus,
    created_by: userId || null
  });

  const populatedProduct = await Product.findById(newProduct._id).populate(
    'category_id',
    'category_name slug'
  );
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

  if (data.category_id && data.category_id !== product.category_id.toString()) {
    const category = await Category.findOne({
      _id: data.category_id,
      business_id: product.business_id
    });
    if (!category) throw new Error('Danh mục không hợp lệ');
    product.category_id = data.category_id;
  }

  if (data.sku && data.sku.trim().toUpperCase() !== product.sku) {
    const existingSku = await Product.findOne({
      business_id: product.business_id,
      sku: data.sku.trim().toUpperCase(),
      _id: { $ne: productId }
    });
    if (existingSku) {
      throw new Error(`Mã SKU [${data.sku}] đã được sử dụng bởi sản phẩm khác`);
    }
    product.sku = data.sku.trim().toUpperCase();
  }

  if (data.product_name) {
    product.product_name = data.product_name.trim();
    product.slug = `${createSlug(data.product_name)}-${product.sku.toLowerCase()}`;
  }

  if (data.base_price !== undefined) product.base_price = Number(data.base_price);
  if (data.sale_price !== undefined) {
    product.sale_price = data.sale_price !== null ? Number(data.sale_price) : null;
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
  } else if (product.stock_available <= 0 && product.status === 'ACTIVE') {
    product.status = 'OUT_OF_STOCK';
  } else if (product.stock_available > 0 && product.status === 'OUT_OF_STOCK') {
    product.status = 'ACTIVE';
  }

  if (userId) product.updated_by = userId;

  await product.save();

  const updatedProduct = await Product.findById(productId).populate(
    'category_id',
    'category_name slug'
  );
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
  return { success: true, message: `Đã xóa sản phẩm [${product.product_name}] thành công` };
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

  // Nếu nhập cho biến thể cụ thể
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
      throw new Error(`Không tìm thấy biến thể có mã [${variant_sku}]`);
    }

    const newTotal = product.variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    product.stock_physical = newTotal;
    product.stock_available = newTotal;
  } else {
    // Nhập cho sản phẩm đơn
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

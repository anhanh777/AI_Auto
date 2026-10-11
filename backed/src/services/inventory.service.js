import { Inventory, Product } from '../models/index.js';
import { getPagination } from '../helpers/pagination.helper.js';

/**
 * 1. GET /api/v1/inventory
 * Báo cáo tổng quan tồn kho, thống kê và danh sách sản phẩm theo trạng thái tồn kho
 */
export const getInventorySummaryService = async ({
  business_id,
  page = 1,
  limit = 20,
  search = '',
  category_id = '',
  stock_status = ''
}) => {
  if (!business_id) {
    throw new Error('business_id là bắt buộc');
  }

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { product_name: searchRegex },
      { sku: searchRegex },
      { barcode: searchRegex },
      { 'variants_json.sku_con': searchRegex }
    ];
  }

  if (category_id && category_id.trim() !== '') {
    filter.$or = [
      { category_ids: category_id.trim() },
      { category_id: category_id.trim() }
    ];
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
    .sort({ stock_available: 1, created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  // Thống kê nhanh toàn cửa hàng
  const [totalProducts, outOfStockCount, lowStockCount, stockAggregate] = await Promise.all([
    Product.countDocuments({ business_id }),
    Product.countDocuments({ business_id, stock_available: { $lte: 0 } }),
    Product.countDocuments({ business_id, stock_available: { $gt: 0, $lte: 5 } }),
    Product.aggregate([
      { $match: { business_id } },
      {
        $group: {
          _id: null,
          totalPhysicalStock: { $sum: '$stock_physical' },
          totalAvailableStock: { $sum: '$stock_available' }
        }
      }
    ])
  ]);

  const stats = {
    total_products: totalProducts,
    out_of_stock: outOfStockCount,
    low_stock: lowStockCount,
    in_stock: Math.max(0, totalProducts - outOfStockCount - lowStockCount),
    total_physical_stock: stockAggregate[0]?.totalPhysicalStock || 0,
    total_available_stock: stockAggregate[0]?.totalAvailableStock || 0
  };

  return {
    stats,
    products,
    pagination
  };
};

/**
 * 2. POST /api/v1/inventory/import
 * Tạo phiếu nhập hàng vào kho và tăng số lượng tồn kho sản phẩm/biến thể
 */
export const importStockService = async ({
  business_id,
  product_id,
  variant_sku = '',
  quantity,
  unit_price = 0,
  note = '',
  userId
}) => {
  if (!business_id) throw new Error('business_id là bắt buộc');
  if (!product_id) throw new Error('product_id là bắt buộc');

  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) {
    throw new Error('Số lượng nhập kho phải lớn hơn 0');
  }

  const product = await Product.findOne({ _id: product_id, business_id });
  if (!product) {
    throw new Error('Không tìm thấy sản phẩm trong cửa hàng');
  }

  const cleanVariantSku = variant_sku ? variant_sku.trim() : '';

  // Nếu có biến thể, cập nhật tồn kho biến thể tương ứng
  let variantFound = false;
  if (cleanVariantSku && Array.isArray(product.variants_json) && product.variants_json.length > 0) {
    product.variants_json = product.variants_json.map((v) => {
      if (v.sku_con === cleanVariantSku) {
        variantFound = true;
        const oldStock = Number(v.stock) || 0;
        return {
          ...v,
          stock: oldStock + numQty
        };
      }
      return v;
    });

    if (variantFound) {
      // Tính lại tổng tồn kho từ các biến thể
      product.stock_physical = product.variants_json.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      product.stock_available = (product.stock_available || 0) + numQty;
    }
  }

  // Nếu không có biến thể hoặc không khớp biến thể cụ thể, cộng thẳng vào stock của product
  if (!variantFound) {
    product.stock_physical = (product.stock_physical || 0) + numQty;
    product.stock_available = (product.stock_available || 0) + numQty;
  }

  // Nếu sản phẩm từng OUT_OF_STOCK thì mở lại ACTIVE
  if (product.status === 'OUT_OF_STOCK' && product.stock_available > 0) {
    product.status = 'ACTIVE';
  }

  // Cập nhật giá nhập gần nhất nếu có truyền unit_price > 0
  if (Number(unit_price) > 0) {
    product.import_price = Number(unit_price);
  }

  product.updated_by = userId || null;
  await product.save();

  // Tạo bản ghi Inventory
  const inventoryRecord = await Inventory.create({
    business_id,
    product_id: product._id,
    variant_sku: cleanVariantSku || product.sku,
    type: 'IMPORT',
    quantity: numQty,
    unit_price: Number(unit_price) || 0,
    note: note ? note.trim() : `Nhập kho +${numQty} sản phẩm ${product.product_name}`,
    performed_by: userId || null
  });

  const populatedRecord = await Inventory.findById(inventoryRecord._id)
    .populate('product_id', 'product_name sku image_urls variants_json')
    .populate('performed_by', 'full_name username avatar role_name');

  return {
    inventory: populatedRecord,
    product: {
      _id: product._id,
      product_name: product.product_name,
      stock_physical: product.stock_physical,
      stock_available: product.stock_available,
      status: product.status
    }
  };
};

/**
 * 3. GET /api/v1/inventory/history
 * Lấy lịch sử biến động kho và thao tác sản phẩm (Tạo mới, Cập nhật, Nhập kho...)
 */
export const getInventoryHistoryService = async ({
  business_id,
  product_id = '',
  type = '',
  search = '',
  page = 1,
  limit = 20
}) => {
  if (!business_id) {
    throw new Error('business_id là bắt buộc');
  }

  const filter = { business_id };

  if (product_id && product_id.trim() !== '') {
    filter.product_id = product_id.trim();
  }

  if (type && type.trim() !== '') {
    filter.type = type.trim().toUpperCase();
  }

  const totalItems = await Inventory.countDocuments(filter);
  const pagination = getPagination(page, limit, totalItems);

  const history = await Inventory.find(filter)
    .populate({
      path: 'product_id',
      select: 'product_name sku image_urls base_price stock_physical variants_json category_ids',
      populate: { path: 'category_ids', select: 'category_name' }
    })
    .populate('performed_by', 'full_name username avatar role_name')
    .sort({ created_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  return {
    history,
    pagination
  };
};

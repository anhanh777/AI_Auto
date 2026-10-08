import { Category, Product } from '../models/index.js';
import { createSlug } from '../helpers/slug.helper.js';

/**
 * Lấy danh sách danh mục theo business_id (Kèm đếm số sản phẩm)
 */
export const getCategoriesService = async ({ business_id, search = '', is_active }) => {
  if (!business_id) {
    throw new Error('Thiếu thông tin business_id của doanh nghiệp');
  }

  const filter = { business_id };

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { category_name: searchRegex },
      { slug: searchRegex },
      { description: searchRegex }
    ];
  }

  if (is_active !== undefined && is_active !== '') {
    filter.is_active = is_active === 'true' || is_active === true;
  }

  const categories = await Category.find(filter)
    .populate('parent_id', 'category_name slug')
    .sort({ created_at: -1 });

  // Đếm số lượng sản phẩm thuộc từng danh mục
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const productCount = await Product.countDocuments({
        business_id,
        category_id: cat._id
      });
      const catObj = cat.toObject();
      catObj.product_count = productCount;
      return catObj;
    })
  );

  return categoriesWithCount;
};

/**
 * Lấy chi tiết 1 danh mục theo ID
 */
export const getCategoryByIdService = async (categoryId, business_id) => {
  const query = { _id: categoryId };
  if (business_id) query.business_id = business_id;

  const category = await Category.findOne(query).populate('parent_id', 'category_name slug');
  if (!category) {
    throw new Error('Không tìm thấy danh mục sản phẩm');
  }
  return category;
};

/**
 * Tạo mới danh mục
 */
export const createCategoryService = async (data, userId) => {
  const { business_id, category_name, parent_id, description, image_url, is_active } = data;

  if (!business_id) {
    throw new Error('business_id là bắt buộc');
  }

  const baseSlug = createSlug(category_name);
  let uniqueSlug = baseSlug;

  // Kiểm tra trùng slug trong cùng doanh nghiệp
  const existingCategory = await Category.findOne({ business_id, slug: uniqueSlug });
  if (existingCategory) {
    uniqueSlug = `${baseSlug}-${Date.now()}`;
  }

  const newCategory = await Category.create({
    business_id,
    category_name: category_name.trim(),
    slug: uniqueSlug,
    parent_id: parent_id || null,
    description: description || '',
    image_url: image_url || '',
    is_active: is_active !== undefined ? is_active : true,
    created_by: userId || null
  });

  return newCategory;
};

/**
 * Cập nhật danh mục
 */
export const updateCategoryService = async (categoryId, data, userId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Không tìm thấy danh mục để cập nhật');
  }

  if (data.category_name && data.category_name.trim() !== category.category_name) {
    category.category_name = data.category_name.trim();
    const newSlug = createSlug(data.category_name);
    const existing = await Category.findOne({
      business_id: category.business_id,
      slug: newSlug,
      _id: { $ne: categoryId }
    });
    category.slug = existing ? `${newSlug}-${Date.now()}` : newSlug;
  }

  if (data.parent_id !== undefined) category.parent_id = data.parent_id || null;
  if (data.description !== undefined) category.description = data.description;
  if (data.image_url !== undefined) category.image_url = data.image_url;
  if (data.is_active !== undefined) category.is_active = data.is_active;
  if (userId) category.updated_by = userId;

  await category.save();
  return category;
};

/**
 * Xóa danh mục (Kiểm tra an toàn dữ liệu)
 */
export const deleteCategoryService = async (categoryId, business_id) => {
  const query = { _id: categoryId };
  if (business_id) query.business_id = business_id;

  const category = await Category.findOne(query);
  if (!category) {
    throw new Error('Không tìm thấy danh mục để xóa');
  }

  // Kiểm tra xem danh mục này có đang chứa sản phẩm nào không
  const productsCount = await Product.countDocuments({
    business_id: category.business_id,
    category_id: categoryId
  });

  if (productsCount > 0) {
    throw new Error(
      `Không thể xóa danh mục "${category.category_name}" vì đang có ${productsCount} sản phẩm trực thuộc. Vui lòng chuyển hoặc xóa sản phẩm trước.`
    );
  }

  await Category.findByIdAndDelete(categoryId);
  return { success: true, message: `Đã xóa danh mục "${category.category_name}" thành công` };
};

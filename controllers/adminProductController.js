import asyncHandler from "express-async-handler"
import Product from "../models/productModel.js"
import { conflict, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { deleteFromCloudinary, getPublicIdFromUrl } from "../utils/cloudinaryUtils.js"

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const buildSku = async (name, existingId = null) => {
  const base = slugify(name)
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase() || "VDY"

  let sku = `VDY-${base}`
  let suffix = 1

  while (await Product.exists({ sku, ...(existingId ? { _id: { $ne: existingId } } : {}) })) {
    suffix += 1
    sku = `VDY-${base}-${suffix}`
  }

  return sku
}

const buildSlug = async (name, existingId = null) => {
  const base = slugify(name)
  let slug = base
  let suffix = 1

  while (await Product.exists({ slug, ...(existingId ? { _id: { $ne: existingId } } : {}) })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }

  return slug
}

const normalizeProductBody = async (body, existingProduct = null) => {
  const nextStock = body.stock ?? existingProduct?.stock ?? 0
  const status =
    body.status ??
    (nextStock <= 0 ? "out_of_stock" : existingProduct?.status ?? "active")

  const name = body.name ?? existingProduct?.name
  const shouldRefreshIdentity = !existingProduct || body.name || body.sku

  return {
    name,
    slug: shouldRefreshIdentity
      ? await buildSlug(name, existingProduct?._id)
      : existingProduct.slug,
    description: body.description ?? existingProduct?.description ?? "",
    shortDescription:
      body.shortDescription ??
      existingProduct?.shortDescription ??
      body.description?.slice(0, 140) ??
      "",
    category: body.category ?? existingProduct?.category,
    subCategory: body.subCategory ?? existingProduct?.subCategory ?? "",
    tags: body.tags ?? existingProduct?.tags ?? [],
    sku: body.sku
      ? body.sku.toUpperCase()
      : shouldRefreshIdentity
        ? await buildSku(name, existingProduct?._id)
        : existingProduct.sku,
    price: body.price ?? existingProduct?.price,
    discountedPrice:
      body.discountedPrice === undefined
        ? existingProduct?.discountedPrice ?? null
        : body.discountedPrice,
    stock: nextStock,
    unit: body.unit ?? existingProduct?.unit ?? "unit",
    images: body.images ?? existingProduct?.images ?? [],
    featured: body.featured ?? existingProduct?.featured ?? false,
    status,
    inventoryTracking:
      body.inventoryTracking ?? existingProduct?.inventoryTracking ?? true,
  }
}

const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, category, status, sortBy, sortOrder } = req.query

  const filter = {}
  if (category) filter.category = category
  if (status) filter.status = status
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ])

  return sendSuccess(res, {
    message: "Products fetched successfully",
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  })
})

const getProductSummary = asyncHandler(async (_req, res) => {
  const [totalProducts, activeProducts, outOfStockProducts, lowStockProducts] =
    await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: "active", stock: { $gt: 0 } }),
      Product.countDocuments({ $or: [{ status: "out_of_stock" }, { stock: 0 }] }),
      Product.countDocuments({ stock: { $gt: 0, $lte: 20 } }),
    ])

  return sendSuccess(res, {
    message: "Product summary fetched successfully",
    data: {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
    },
  })
})

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    throw notFound("Product not found")
  }

  return sendSuccess(res, {
    message: "Product fetched successfully",
    data: { product },
  })
})

const createProduct = asyncHandler(async (req, res) => {
  const productBody = await normalizeProductBody(req.body)

  if (await Product.exists({ sku: productBody.sku })) {
    throw conflict("A product with this SKU already exists")
  }

  const product = await Product.create(productBody)

  return sendSuccess(res, {
    statusCode: 201,
    message: "Product created successfully",
    data: { product },
  })
})

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    throw notFound("Product not found")
  }

  const productBody = await normalizeProductBody(req.body, product)

  if (
    productBody.sku !== product.sku &&
    (await Product.exists({ sku: productBody.sku, _id: { $ne: product._id } }))
  ) {
    throw conflict("A product with this SKU already exists")
  }

  // Identify removed images to delete from Cloudinary
  const removedImages = product.images.filter(
    (img) => !productBody.images.includes(img)
  )

  for (const imageUrl of removedImages) {
    const publicId = getPublicIdFromUrl(imageUrl)
    if (publicId) {
      await deleteFromCloudinary(publicId)
    }
  }

  Object.assign(product, productBody)
  await product.save()

  return sendSuccess(res, {
    message: "Product updated successfully",
    data: { product },
  })
})

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)

  if (!product) {
    throw notFound("Product not found")
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    for (const imageUrl of product.images) {
      const publicId = getPublicIdFromUrl(imageUrl)
      if (publicId) {
        await deleteFromCloudinary(publicId)
      }
    }
  }

  await product.deleteOne()

  return sendSuccess(res, {
    message: "Product deleted successfully",
    data: { productId: req.params.id },
  })
})

const deleteProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body

  // Fetch products to get their image URLs
  const products = await Product.find({ _id: { $in: ids } })

  for (const product of products) {
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        const publicId = getPublicIdFromUrl(imageUrl)
        if (publicId) {
          await deleteFromCloudinary(publicId)
        }
      }
    }
  }

  const result = await Product.deleteMany({ _id: { $in: ids } })

  return sendSuccess(res, {
    message: "Products deleted successfully",
    data: { deletedCount: result.deletedCount },
  })
})

export {
  createProduct,
  deleteProduct,
  deleteProducts,
  getProductById,
  getProductSummary,
  getProducts,
  updateProduct,
}

import asyncHandler from "express-async-handler"
import Product from "../models/productModel.js"
import mongoose from "mongoose"
import { notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

// @desc Get all products (public)
// @route GET /api/v1/products
const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, featured, sortBy = "createdAt", sortOrder = "desc" } = req.query

  const filter = { status: "active" } // Only active products for public
  
  if (category && category !== "all") {
    filter.category = category
  }

  if (featured === "true") {
    filter.featured = true
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
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
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  })
})

// @desc Get product by slug or id (public)
// @route GET /api/v1/products/:slug
const getProductBySlug = asyncHandler(async (req, res) => {
  const param = req.params.slug

  let product = null

  if (mongoose.Types.ObjectId.isValid(param)) {
    product = await Product.findById(param)
  } else {
    product = await Product.findOne({ slug: param, status: "active" })
  }

  if (!product || product.status !== "active") {
    throw notFound("Product not found")
  }

  return sendSuccess(res, {
    message: "Product fetched successfully",
    data: { product },
  })
})

export { getProducts, getProductBySlug }

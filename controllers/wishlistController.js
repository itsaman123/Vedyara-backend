import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import Product from "../models/productModel.js"
import { notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

// @desc Get user wishlist
// @route GET /api/v1/wishlist
// @access Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist")

  return sendSuccess(res, {
    message: "Wishlist fetched successfully",
    // Products deleted by the admin populate as null
    data: { items: user.wishlist.filter(Boolean) },
  })
})

// @desc Toggle wishlist item
// @route POST /api/v1/wishlist/toggle
// @access Private
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body

  const product = await Product.findById(productId)
  if (!product) {
    throw notFound("Product not found")
  }

  const user = await User.findById(req.user._id)
  const isWishlisted = user.wishlist.some((id) => id.toString() === productId)

  if (isWishlisted) {
    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId)
  } else {
    user.wishlist.push(productId)
  }

  await user.save()

  return sendSuccess(res, {
    message: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
    data: { inWishlist: !isWishlisted },
  })
})

// @desc Fold a guest wishlist into the account after sign-in
// @route POST /api/v1/wishlist/merge
// @access Private
const mergeWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const saved = new Set(user.wishlist.map(String))

  const existing = await Product.find({ _id: { $in: req.body.productIds } }).distinct("_id")
  for (const id of existing) {
    if (!saved.has(id.toString())) user.wishlist.push(id)
  }

  await user.save()
  await user.populate("wishlist")

  return sendSuccess(res, {
    message: "Wishlist merged",
    data: { items: user.wishlist.filter(Boolean) },
  })
})

export { getWishlist, toggleWishlist, mergeWishlist }

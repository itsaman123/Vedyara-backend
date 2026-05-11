import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import Product from "../models/productModel.js"
import { notFound, badRequest } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

// @desc Get user wishlist
// @route GET /api/v1/wishlist
// @access Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist")
  
  return sendSuccess(res, {
    message: "Wishlist fetched successfully",
    data: { items: user.wishlist },
  })
})

// @desc Toggle wishlist item
// @route POST /api/v1/wishlist/toggle
// @access Private
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body

  if (!productId) {
    throw badRequest("Product ID is required")
  }

  const product = await Product.findById(productId)
  if (!product) {
    throw notFound("Product not found")
  }

  const user = await User.findById(req.user._id)
  const isWishlisted = user.wishlist.includes(productId)

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

export { getWishlist, toggleWishlist }

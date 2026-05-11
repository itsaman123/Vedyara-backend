import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import Product from "../models/productModel.js"
import { notFound, badRequest } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

// Helper to format cart for frontend
const formatCart = (user) => {
  const items = user.cart.map((item) => ({
    productId: item.product._id,
    name: item.product.name,
    price: item.product.discountedPrice || item.product.price,
    image: item.product.images[0] || "",
    quantity: item.quantity,
    slug: item.product.slug,
  }))

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  return { items, totalAmount }
}

// @desc Get user cart
// @route GET /api/v1/cart
// @access Private
const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("cart.product")
  
  return sendSuccess(res, {
    message: "Cart fetched successfully",
    data: formatCart(user),
  })
})

// @desc Add item to cart
// @route POST /api/v1/cart
// @access Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body

  if (!productId) {
    throw badRequest("Product ID is required")
  }

  const product = await Product.findById(productId)
  if (!product) {
    throw notFound("Product not found")
  }

  const user = await User.findById(req.user._id)

  const cartItemIndex = user.cart.findIndex(
    (item) => item.product.toString() === productId
  )

  if (cartItemIndex > -1) {
    user.cart[cartItemIndex].quantity += Number(quantity)
  } else {
    user.cart.push({ product: productId, quantity: Number(quantity) })
  }

  await user.save()
  const updatedUser = await User.findById(req.user._id).populate("cart.product")

  return sendSuccess(res, {
    message: "Item added to cart",
    data: formatCart(updatedUser),
  })
})

// @desc Update cart item quantity
// @route PATCH /api/v1/cart/:productId
// @access Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params
  const { quantity } = req.body

  if (quantity < 1) {
    throw badRequest("Quantity must be at least 1")
  }

  const user = await User.findById(req.user._id)
  const cartItem = user.cart.find((item) => item.product.toString() === productId)

  if (!cartItem) {
    throw notFound("Item not found in cart")
  }

  cartItem.quantity = Number(quantity)
  await user.save()
  
  const updatedUser = await User.findById(req.user._id).populate("cart.product")
  return sendSuccess(res, {
    message: "Cart updated",
    data: formatCart(updatedUser),
  })
})

// @desc Remove item from cart
// @route DELETE /api/v1/cart/:productId
// @access Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params

  const user = await User.findById(req.user._id)
  user.cart = user.cart.filter((item) => item.product.toString() !== productId)
  
  await user.save()
  
  const updatedUser = await User.findById(req.user._id).populate("cart.product")
  return sendSuccess(res, {
    message: "Item removed from cart",
    data: formatCart(updatedUser),
  })
})

export { getCart, addToCart, updateCartItem, removeFromCart }

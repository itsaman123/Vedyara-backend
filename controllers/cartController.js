import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import Product from "../models/productModel.js"
import { notFound, badRequest } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { getUnitPrice } from "../utils/orderUtils.js"

// Helper to format cart for frontend
const formatCart = (user) => {
  const items = user.cart
    // Products deleted by the admin populate as null
    .filter((item) => item.product)
    .map((item) => ({
      productId: item.product._id,
      name: item.product.name,
      price: getUnitPrice(item.product),
      mrp: item.product.price,
      image: item.product.images[0] || "",
      quantity: item.quantity,
      slug: item.product.slug,
      unit: item.product.unit,
      stock: item.product.inventoryTracking ? item.product.stock : null,
      available:
        item.product.status === "active" &&
        (!item.product.inventoryTracking || item.product.stock >= item.quantity),
    }))

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  return { items, totalAmount }
}

const sendCart = async (res, userId, message) => {
  const user = await User.findById(userId).populate("cart.product")

  return sendSuccess(res, {
    message,
    data: formatCart(user),
  })
}

const findSellableProduct = async (productId) => {
  const product = await Product.findById(productId)

  if (!product || product.status === "inactive" || product.status === "draft") {
    throw notFound("Product not found")
  }

  if (product.status === "out_of_stock" || (product.inventoryTracking && product.stock <= 0)) {
    throw badRequest(`${product.name} is out of stock`)
  }

  return product
}

const assertInStock = (product, quantity) => {
  if (product.inventoryTracking && quantity > product.stock) {
    throw badRequest(`Only ${product.stock} of ${product.name} left in stock`)
  }
}

// @desc Get user cart
// @route GET /api/v1/cart
// @access Private
const getCart = asyncHandler(async (req, res) => {
  return sendCart(res, req.user._id, "Cart fetched successfully")
})

// @desc Add item to cart
// @route POST /api/v1/cart
// @access Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body

  const product = await findSellableProduct(productId)
  const user = await User.findById(req.user._id)

  const cartItem = user.cart.find((item) => item.product.toString() === productId)
  const nextQuantity = (cartItem?.quantity || 0) + quantity

  assertInStock(product, nextQuantity)

  if (cartItem) {
    cartItem.quantity = nextQuantity
  } else {
    user.cart.push({ product: productId, quantity })
  }

  await user.save()

  return sendCart(res, req.user._id, "Item added to cart")
})

// @desc Update cart item quantity
// @route PATCH /api/v1/cart/:productId
// @access Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params
  const { quantity } = req.body

  const user = await User.findById(req.user._id)
  const cartItem = user.cart.find((item) => item.product.toString() === productId)

  if (!cartItem) {
    throw notFound("Item not found in cart")
  }

  // Lowering a quantity is always allowed, even past current stock
  if (quantity > cartItem.quantity) {
    assertInStock(await findSellableProduct(productId), quantity)
  }

  cartItem.quantity = quantity
  await user.save()

  return sendCart(res, req.user._id, "Cart updated")
})

// @desc Remove item from cart
// @route DELETE /api/v1/cart/:productId
// @access Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params

  const user = await User.findById(req.user._id)
  user.cart = user.cart.filter((item) => item.product.toString() !== productId)

  await user.save()

  return sendCart(res, req.user._id, "Item removed from cart")
})

// @desc Empty the cart
// @route DELETE /api/v1/cart
// @access Private
const clearCart = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { cart: [] } })

  return sendSuccess(res, {
    message: "Cart cleared",
    data: { items: [], totalAmount: 0 },
  })
})

// @desc Fold a guest cart into the account after sign-in. Quantities add up,
// capped at available stock; unavailable products are skipped.
// @route POST /api/v1/cart/merge
// @access Private
const mergeCart = asyncHandler(async (req, res) => {
  const { items } = req.body

  const user = await User.findById(req.user._id)
  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
    status: "active",
  })
  const byId = new Map(products.map((p) => [p._id.toString(), p]))

  for (const { productId, quantity } of items) {
    const product = byId.get(productId)
    if (!product) continue

    const cartItem = user.cart.find((item) => item.product.toString() === productId)
    const wanted = (cartItem?.quantity || 0) + quantity
    const nextQuantity = product.inventoryTracking ? Math.min(wanted, product.stock) : wanted

    if (nextQuantity < 1) continue

    if (cartItem) {
      cartItem.quantity = nextQuantity
    } else {
      user.cart.push({ product: productId, quantity: nextQuantity })
    }
  }

  await user.save()

  return sendCart(res, req.user._id, "Cart merged")
})

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart, mergeCart }

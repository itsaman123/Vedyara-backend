import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import Order from "../models/orderModel.js"
import User from "../models/userModel.js"
import Razorpay from "razorpay"
import crypto from "crypto"
import { badRequest, createError, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { buildOrderLines, logStockMovement, restoreStock, takeStock } from "../utils/orderUtils.js"

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

const generateOrderNumber = () => `ORD-${Date.now()}-${crypto.randomInt(100, 1000)}`

const hmacHex = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex")

const signaturesMatch = (expected, received) => {
  const a = Buffer.from(expected)
  const b = Buffer.from(String(received || ""))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const isOwner = (order, user) =>
  order.user ? order.user.equals(user._id) : order.customerEmail === user.email

// Online orders the customer never paid for are abandoned checkouts, not orders
const ABANDONED_ONLINE = { paymentMethod: "razorpay", paymentStatus: { $in: ["awaiting", "failed"] } }

const findOwnOrder = async (orderId, user) => {
  if (!mongoose.isValidObjectId(orderId)) throw notFound("Order not found")

  const order = await Order.findById(orderId)
  if (!order || !isOwner(order, user)) throw notFound("Order not found")

  return order
}

const toCustomerOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  amount: order.amount,
  itemsCount: order.itemsCount,
  shippingAddress: order.shippingAddress,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  items: order.items.map((item) => {
    // Older orders have no snapshot and rely on the populated product
    const product = item.product instanceof mongoose.Types.ObjectId ? null : item.product
    return {
      productId: product?._id || item.product,
      name: item.name || product?.name || "Product",
      image: item.image || product?.images?.[0] || "",
      slug: product?.slug || null,
      quantity: item.quantity,
      price: item.price,
    }
  }),
})

// Saves the checkout address (and phone, if missing) to the customer's profile
const rememberCheckoutDetails = async (userId, address) => {
  const user = await User.findById(userId)
  if (!user) return

  if (!user.phone) user.phone = address.phone
  user.saveAddress(address)
  await user.save()
}

// Moves an online order to paid exactly once, even if the browser callback
// and the webhook arrive together.
const markOrderPaid = async (order, { paymentId, signature }) => {
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        // A captured payment revives an order cancelled when the window closed
        status: "processing",
        razorpayPaymentId: paymentId,
        ...(signature ? { razorpaySignature: signature } : {}),
      },
    },
    { new: true }
  )

  if (!paid) return Order.findById(order._id)

  if (!paid.stockDeducted) {
    // The money is already taken, so never fail here; oversold lines go to zero
    const { taken } = await takeStock(paid.items, { allowShortfall: true })
    paid.stockDeducted = true
    await paid.save()
    await logStockMovement(taken, { type: "sold", note: `Order ${paid.orderNumber}`, userId: paid.user })
  }

  return paid
}

// @desc Which payment methods checkout can offer
// @route GET /api/v1/orders/payment-config
// @access Public
const getPaymentConfig = (_req, res) => {
  const razorpayEnabled = isRazorpayConfigured()

  return sendSuccess(res, {
    message: "Payment config fetched successfully",
    data: {
      razorpayEnabled,
      razorpayKeyId: razorpayEnabled ? process.env.RAZORPAY_KEY_ID : null,
      codEnabled: true,
    },
  })
}

// @desc Create an online order and the matching Razorpay order
// @route POST /api/v1/orders/create
// @access Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured()) {
    throw createError(503, "Online payment isn't available right now. Please choose Cash on Delivery.")
  }

  const { items, shippingAddress, saveAddress } = req.body
  const { lines, amount, itemsCount } = await buildOrderLines(items)
  const orderNumber = generateOrderNumber()

  let razorpayOrder
  try {
    razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: orderNumber,
      notes: { orderNumber },
    })
  } catch (rzpErr) {
    const msg = rzpErr?.error?.description || rzpErr?.message || "Razorpay order creation failed"
    const err = new Error(msg)
    err.statusCode = 502
    throw err
  }

  const order = await Order.create({
    orderNumber,
    user: req.user._id,
    customerName: req.user.name,
    customerEmail: req.user.email,
    shippingAddress,
    items: lines,
    itemsCount,
    amount,
    paymentMethod: "razorpay",
    razorpayOrderId: razorpayOrder.id,
    status: "pending",
    paymentStatus: "awaiting",
  })

  if (saveAddress) await rememberCheckoutDetails(req.user._id, shippingAddress)

  return sendSuccess(res, {
    statusCode: 201,
    message: "Order created successfully",
    data: {
      orderId: order._id,
      orderNumber,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    },
  })
})

// @desc Verify the payment the Razorpay checkout reports back
// @route POST /api/v1/orders/verify
// @access Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

  const order = await findOwnOrder(orderId, req.user)

  // The signature only proves *a* payment happened; it must be for this order
  if (order.paymentMethod !== "razorpay" || order.razorpayOrderId !== razorpay_order_id) {
    throw badRequest("This payment doesn't belong to this order")
  }

  const expectedSignature = hmacHex(
    process.env.RAZORPAY_KEY_SECRET,
    `${razorpay_order_id}|${razorpay_payment_id}`
  )

  if (!signaturesMatch(expectedSignature, razorpay_signature)) {
    throw badRequest("Invalid payment signature")
  }

  const paid = await markOrderPaid(order, {
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })

  return sendSuccess(res, {
    message: "Payment verified successfully",
    data: { order: toCustomerOrder(paid) },
  })
})

// @desc Razorpay server-to-server events. Records payments even when the
// customer closes the tab before their browser reports back.
// @route POST /api/v1/orders/razorpay-webhook
// @access Public (signed by Razorpay)
const razorpayWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw notFound("Webhook is not configured")

  if (!req.rawBody || !signaturesMatch(hmacHex(secret, req.rawBody), req.headers["x-razorpay-signature"])) {
    throw badRequest("Invalid webhook signature")
  }

  const { event, payload } = req.body
  const payment = payload?.payment?.entity

  if ((event === "payment.captured" || event === "order.paid") && payment?.order_id) {
    const order = await Order.findOne({ razorpayOrderId: payment.order_id })
    if (order) await markOrderPaid(order, { paymentId: payment.id })
  }

  return sendSuccess(res, { message: "Webhook received" })
})

// @desc The customer closed the Razorpay window without paying
// @route POST /api/v1/orders/:id/cancel-payment
// @access Private
const cancelPendingPayment = asyncHandler(async (req, res) => {
  const order = await findOwnOrder(req.params.id, req.user)

  await Order.updateOne(
    { _id: order._id, paymentMethod: "razorpay", paymentStatus: "awaiting" },
    { $set: { status: "cancelled", paymentStatus: "failed" } }
  )

  return sendSuccess(res, { message: "Payment cancelled" })
})

// @desc Create COD order
// @route POST /api/v1/orders/create-cod
// @access Private
const createCodOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, saveAddress } = req.body
  const { lines, amount, itemsCount } = await buildOrderLines(items)
  const orderNumber = generateOrderNumber()

  const { shortLine, taken } = await takeStock(lines)
  if (shortLine) {
    throw badRequest(`Sorry, ${shortLine.name} just went out of stock`)
  }

  let order
  try {
    order = await Order.create({
      orderNumber,
      user: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      shippingAddress,
      items: lines,
      itemsCount,
      amount,
      paymentMethod: "cod",
      status: "processing",
      paymentStatus: "awaiting",
      stockDeducted: true,
    })
  } catch (error) {
    await restoreStock(taken)
    throw error
  }

  await logStockMovement(taken, { type: "sold", note: `Order ${orderNumber}`, userId: req.user._id })
  if (saveAddress) await rememberCheckoutDetails(req.user._id, shippingAddress)

  return sendSuccess(res, {
    statusCode: 201,
    message: "Order placed successfully",
    data: { order: toCustomerOrder(order) },
  })
})

// @desc Get User Orders
// @route GET /api/v1/orders/myorders
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    // Orders from before accounts were linked only carry the email
    $or: [{ user: req.user._id }, { customerEmail: req.user.email }],
    $nor: [ABANDONED_ONLINE],
  })
    .populate("items.product", "name slug images")
    .sort({ createdAt: -1 })

  return sendSuccess(res, {
    message: "Orders fetched successfully",
    data: orders.map(toCustomerOrder),
  })
})

// Public lookup for the Track Order page. Requires both the order number and
// the email on the order, and only returns fields safe to show a guest.
const trackOrder = asyncHandler(async (req, res) => {
  const orderNumber = String(req.query.orderNumber || "").trim()
  const email = String(req.query.email || "").trim().toLowerCase()

  if (!orderNumber || !email) {
    throw badRequest("Order number and email are required")
  }

  const order = await Order.findOne({ orderNumber, customerEmail: email })
    .populate("items.product", "name slug images unit")

  if (!order) {
    throw notFound("No order found with these details")
  }

  return sendSuccess(res, {
    message: "Order fetched successfully",
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      itemsCount: order.itemsCount,
      city: order.shippingAddress?.city || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        name: item.name || item.product?.name || "Product",
        slug: item.product?.slug || null,
        image: item.image || item.product?.images?.[0] || null,
        unit: item.product?.unit || null,
        quantity: item.quantity,
        price: item.price,
      })),
    },
  })
})

export {
  ABANDONED_ONLINE,
  cancelPendingPayment,
  createCodOrder,
  createRazorpayOrder,
  getMyOrders,
  getPaymentConfig,
  razorpayWebhook,
  trackOrder,
  verifyPayment,
}

import asyncHandler from "express-async-handler"
import Order from "../models/orderModel.js"
import Product from "../models/productModel.js"
import Razorpay from "razorpay"
import crypto from "crypto"
import { badRequest, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
})

// @desc Create Razorpay order
// @route POST /api/v1/orders/create
// @access Private (or public with customer info)
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { items, customerName, customerEmail } = req.body

  if (!items || items.length === 0) {
    throw badRequest("No items in order")
  }

  let totalAmount = 0
  const orderItems = []

  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) {
      throw notFound(`Product not found: ${item.productId}`)
    }
    const price = product.discountedPrice || product.price
    totalAmount += price * item.quantity
    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price: price,
    })
  }

  // Create Razorpay Order
  const options = {
    amount: Math.round(totalAmount * 100), // amount in paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  }

  const razorpayOrder = await razorpay.orders.create(options)

  // Create Order in database
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const order = await Order.create({
    orderNumber,
    customerName,
    customerEmail,
    items: orderItems,
    itemsCount: items.reduce((acc, item) => acc + item.quantity, 0),
    amount: totalAmount,
    razorpayOrderId: razorpayOrder.id,
    status: "pending",
    paymentStatus: "awaiting",
  })

  return sendSuccess(res, {
    message: "Order created successfully",
    data: {
      razorpayOrder,
      orderId: order._id,
    },
  })
})

// @desc Verify Razorpay payment
// @route POST /api/v1/orders/verify
// @access Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
    .update(body.toString())
    .digest("hex")

  const isAuthentic = expectedSignature === razorpay_signature

  if (isAuthentic) {
    // Update order status
    const order = await Order.findById(orderId)
    if (!order) {
      throw notFound("Order not found")
    }

    order.paymentStatus = "paid"
    order.razorpayPaymentId = razorpay_payment_id
    order.razorpaySignature = razorpay_signature
    order.status = "processing"
    await order.save()

    return sendSuccess(res, {
      message: "Payment verified successfully",
      data: order,
    })
  } else {
    throw badRequest("Invalid payment signature")
  }
})

export { createRazorpayOrder, verifyPayment }

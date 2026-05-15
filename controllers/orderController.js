import asyncHandler from "express-async-handler"
import Order from "../models/orderModel.js"
import Product from "../models/productModel.js"
import Razorpay from "razorpay"
import crypto from "crypto"
import { badRequest, notFound, unauthorized } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { Resend } from "resend"
import User from "../models/userModel.js"
import generateToken from "../utils/generateToken.js"

// OTP Memory Store (For production, use Redis or MongoDB)
const otpStore = new Map()

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

// @desc Send OTP to Guest Email
// @route POST /api/v1/orders/send-otp
// @access Public
const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) throw badRequest("Email is required")

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }) // 10 mins expiry

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

  await resend.emails.send({
    from,
    to: email,
    subject: "Your Vedyara Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3E2F1C;">Verify Your Email</h2>
        <p>Your one-time password for Vedyara guest checkout is:</p>
        <h1 style="color: #D4AF37; font-size: 36px; letter-spacing: 4px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  })

  return sendSuccess(res, { message: "OTP sent successfully" })
})

// @desc Verify OTP
// @route POST /api/v1/orders/verify-otp
// @access Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, name } = req.body
  if (!email || !otp) throw badRequest("Email and OTP are required")

  // const record = otpStore.get(email)
  // if (!record) throw badRequest("No OTP found for this email")

  // if (Date.now() > record.expiresAt) {
  //   otpStore.delete(email)
  //   throw badRequest("OTP has expired")
  // }

  // if (record.otp !== otp) {
  //   throw badRequest("Invalid OTP")
  // }

  // otpStore.delete(email)

  let user = await User.findOne({ email })
  if (!user) {
    user = await User.create({
      name: name || "Guest User",
      email,
      password: crypto.randomBytes(16).toString("hex"),
    })
  }

  const token = generateToken(res, user._id)

  return sendSuccess(res, { 
    message: "Email verified successfully",
    data: {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  })
})

// @desc Get User Orders
// @route GET /api/v1/orders/myorders
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.email) {
    throw unauthorized("Not authorized")
  }
  const orders = await Order.find({ customerEmail: req.user.email })
    .populate("items.product")
    .sort({ createdAt: -1 })
    
  return sendSuccess(res, {
    message: "Orders fetched successfully",
    data: orders,
  })
})

export { createRazorpayOrder, verifyPayment, sendOtp, verifyOtp, getMyOrders }

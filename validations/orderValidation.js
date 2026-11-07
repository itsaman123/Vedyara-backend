import Joi from "joi"
import { shippingAddressSchema } from "./userValidation.js"

const mongoId = Joi.string().hex().length(24).lowercase()

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"]

const orderListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid(...ORDER_STATUSES),
  sortBy: Joi.string().valid("createdAt", "updatedAt", "amount", "status").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})

const lineItemSchema = Joi.object({
  productId: mongoId.required(),
  quantity: Joi.number().integer().min(1).max(100).required(),
})

const placeOrderSchema = Joi.object({
  items: Joi.array().items(lineItemSchema).min(1).max(50).required(),
  shippingAddress: shippingAddressSchema.required(),
  saveAddress: Joi.boolean().default(true),
})

const verifyPaymentSchema = Joi.object({
  orderId: mongoId.required(),
  razorpay_order_id: Joi.string().trim().max(100).required(),
  razorpay_payment_id: Joi.string().trim().max(100).required(),
  razorpay_signature: Joi.string().trim().max(200).required(),
})

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...ORDER_STATUSES).required(),
})

const addToCartSchema = Joi.object({
  productId: mongoId.required(),
  quantity: Joi.number().integer().min(1).max(100).default(1),
})

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(100).required(),
})

const mergeCartSchema = Joi.object({
  items: Joi.array().items(lineItemSchema).max(50).required(),
})

const toggleWishlistSchema = Joi.object({
  productId: mongoId.required(),
})

const mergeWishlistSchema = Joi.object({
  productIds: Joi.array().items(mongoId).max(100).required(),
})

export {
  addToCartSchema,
  mergeCartSchema,
  mergeWishlistSchema,
  orderListQuerySchema,
  placeOrderSchema,
  toggleWishlistSchema,
  updateCartItemSchema,
  updateOrderStatusSchema,
  verifyPaymentSchema,
}

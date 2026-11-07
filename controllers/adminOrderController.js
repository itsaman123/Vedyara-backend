import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import Order from "../models/orderModel.js"
import { badRequest, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { logStockMovement, restoreStock } from "../utils/orderUtils.js"
import { ABANDONED_ONLINE } from "./orderController.js"

const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, search, status, sortBy, sortOrder } = req.query

  const filter = {}
  if (status) filter.status = status
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ])

  return sendSuccess(res, {
    message: "Orders fetched successfully",
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

const getOrderSummary = asyncHandler(async (_req, res) => {
  // Abandoned online checkouts aren't real orders
  const placed = { $nor: [ABANDONED_ONLINE] }

  const [totalOrders, completedOrders, inProgressOrders] = await Promise.all([
    Order.countDocuments(placed),
    Order.countDocuments({ ...placed, status: "delivered" }),
    Order.countDocuments({ ...placed, status: { $in: ["pending", "processing", "shipped"] } }),
  ])

  return sendSuccess(res, {
    message: "Order summary fetched successfully",
    data: {
      totalOrders,
      completedOrders,
      inProgressOrders,
    },
  })
})

const findOrder = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw notFound("Order not found")

  const order = await Order.findById(id)
    .populate("items.product", "name sku images unit")
    .populate("user", "name email phone")

  if (!order) throw notFound("Order not found")
  return order
}

const getOrderById = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Order fetched successfully",
    data: { order: await findOrder(req.params.id) },
  })
})

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  const order = await findOrder(req.params.id)

  if (order.status === status) {
    return sendSuccess(res, { message: "Order status unchanged", data: { order } })
  }

  if (order.status === "cancelled") {
    throw badRequest("Cancelled orders can't be reopened")
  }

  if (status !== "cancelled" && order.paymentMethod === "razorpay" && order.paymentStatus !== "paid") {
    throw badRequest("This online order hasn't been paid yet")
  }

  if (status === "cancelled" && order.stockDeducted) {
    const lines = order.items.map((item) => ({
      product: item.product?._id || item.product,
      quantity: item.quantity,
    }))
    const restored = await restoreStock(lines)
    order.stockDeducted = false
    await logStockMovement(restored, {
      type: "added",
      note: `Order ${order.orderNumber} cancelled`,
      userId: req.user._id,
    })
  }

  // Cash is collected at the door
  if (status === "delivered" && order.paymentMethod === "cod") {
    order.paymentStatus = "paid"
  }

  order.status = status
  await order.save()

  return sendSuccess(res, {
    message: "Order status updated",
    data: { order },
  })
})

export { getOrderById, getOrderSummary, getOrders, updateOrderStatus }

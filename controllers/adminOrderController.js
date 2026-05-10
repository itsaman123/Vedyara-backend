import asyncHandler from "express-async-handler"
import Order from "../models/orderModel.js"
import { sendSuccess } from "../utils/apiResponse.js"

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
  const [totalOrders, completedOrders, inProgressOrders] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: { $in: ["pending", "processing", "shipped"] } }),
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

export { getOrderSummary, getOrders }

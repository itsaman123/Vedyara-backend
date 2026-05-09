import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import Inventory from "../models/inventoryModel.js"
import Product from "../models/productModel.js"
import { badRequest, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

const getInventoryList = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    type,
    productId,
    search,
    sortBy,
    sortOrder,
  } = req.query

  const filter = {}

  if (type) {
    filter.type = type
  }

  if (productId) {
    filter.productId = productId
  }

  if (search) {
    const matchingProducts = await Product.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ],
    }).select("_id")

    filter.productId = { $in: matchingProducts.map((product) => product._id) }
  }

  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const [items, total] = await Promise.all([
    Inventory.find(filter)
      .populate("productId", "name slug sku stock unit images")
      .populate("createdBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Inventory.countDocuments(filter),
  ])

  return sendSuccess(res, {
    message: "Inventory list fetched successfully",
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

const addInventory = asyncHandler(async (req, res) => {
  const { productId, quantity, type, note } = req.body
  const session = await mongoose.startSession()

  let product
  let inventory

  try {
    await session.withTransaction(async () => {
      product = await Product.findById(productId).session(session)

      if (!product) {
        throw notFound("Product not found")
      }

      const stockChange = type === "added" ? quantity : -quantity
      const nextStock = product.stock + stockChange

      if (nextStock < 0) {
        throw badRequest("Inventory adjustment cannot reduce stock below zero")
      }

      product.stock = nextStock
      product.status = nextStock === 0 ? "out_of_stock" : product.status

      if (nextStock > 0 && product.status === "out_of_stock") {
        product.status = "active"
      }

      const createdInventory = await Inventory.create(
        [
          {
            productId,
            quantity,
            type,
            note,
            createdBy: req.user._id,
          },
        ],
        { session }
      )

      inventory = createdInventory[0]
      await product.save({ session })
    })
  } finally {
    await session.endSession()
  }

  await inventory.populate("productId", "name slug sku stock unit images")
  await inventory.populate("createdBy", "name email role")

  return sendSuccess(res, {
    statusCode: 201,
    message: "Inventory updated successfully",
    data: {
      inventory,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        status: product.status,
      },
    },
  })
})

export { getInventoryList, addInventory }

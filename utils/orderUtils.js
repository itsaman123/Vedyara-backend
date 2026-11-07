import Product from "../models/productModel.js"
import Inventory from "../models/inventoryModel.js"
import { badRequest } from "./apiError.js"

// The price a customer pays for one unit. Shared by cart and checkout so the
// cart total always matches what the order charges.
const getUnitPrice = (product) => product.discountedPrice || product.price

const unavailableMessage = (product) => {
  if (!product) return "A product in your order is no longer available"
  if (product.status === "out_of_stock" || (product.inventoryTracking && product.stock <= 0)) {
    return `${product.name} is out of stock`
  }
  if (product.status !== "active") return `${product.name} is no longer available`
  return null
}

// Validates requested items against live product data and prices them on the
// server. Duplicate product lines are merged so stock checks see the real total.
const buildOrderLines = async (items) => {
  const quantities = new Map()
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) || 0) + quantity)
  }

  const products = await Product.find({ _id: { $in: [...quantities.keys()] } })
  const byId = new Map(products.map((p) => [p._id.toString(), p]))

  const lines = []
  for (const [productId, quantity] of quantities) {
    const product = byId.get(productId)
    const problem = unavailableMessage(product)
    if (problem) throw badRequest(problem)

    if (product.inventoryTracking && product.stock < quantity) {
      throw badRequest(`Only ${product.stock} of ${product.name} left in stock`)
    }

    lines.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || "",
      quantity,
      price: getUnitPrice(product),
    })
  }

  return {
    lines,
    amount: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    itemsCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  }
}

const getTrackedIds = async (lines) => {
  const ids = await Product.find({
    _id: { $in: lines.map((line) => line.product) },
    inventoryTracking: true,
  }).distinct("_id")
  return new Set(ids.map(String))
}

const markSoldOut = (ids) =>
  Product.updateMany(
    { _id: { $in: ids }, stock: { $lte: 0 }, status: "active" },
    { $set: { status: "out_of_stock" } }
  )

const putBack = async (lines) => {
  for (const line of lines) {
    await Product.updateOne({ _id: line.product }, { $inc: { stock: line.quantity } })
  }
}

// Takes stock for each tracked line with a guarded decrement, so two customers
// can't both buy the last unit. On a short line, puts back what was already
// taken and returns { shortLine }. Otherwise returns the tracked lines taken.
//
// With allowShortfall (used once a payment has been captured) a short line
// simply drops that product to zero instead of failing.
const takeStock = async (lines, { allowShortfall = false } = {}) => {
  const tracked = await getTrackedIds(lines)
  const taken = []

  for (const line of lines) {
    if (!tracked.has(String(line.product))) continue

    const result = await Product.updateOne(
      { _id: line.product, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    )

    if (result.modifiedCount !== 1) {
      if (!allowShortfall) {
        await putBack(taken)
        return { shortLine: line, taken: [] }
      }
      await Product.updateOne({ _id: line.product }, { $set: { stock: 0 } })
    }

    taken.push(line)
  }

  await markSoldOut([...tracked])
  return { shortLine: null, taken }
}

const restoreStock = async (lines) => {
  const tracked = await getTrackedIds(lines)
  const trackedLines = lines.filter((line) => tracked.has(String(line.product)))

  await putBack(trackedLines)
  await Product.updateMany(
    { _id: { $in: trackedLines.map((line) => line.product) }, stock: { $gt: 0 }, status: "out_of_stock" },
    { $set: { status: "active" } }
  )

  return trackedLines
}

// Records stock movements in the admin inventory history. Best effort: a
// logging failure must never undo a placed order.
const logStockMovement = async (lines, { type, note, userId }) => {
  if (!lines.length || !userId) return

  try {
    await Inventory.insertMany(
      lines.map((line) => ({
        productId: line.product,
        quantity: line.quantity,
        type,
        note,
        createdBy: userId,
      }))
    )
  } catch (error) {
    console.error("[INVENTORY] Failed to log stock movement:", error.message)
  }
}

export { buildOrderLines, getUnitPrice, logStockMovement, restoreStock, takeStock }

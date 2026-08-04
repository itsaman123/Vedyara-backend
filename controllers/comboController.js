import asyncHandler from "express-async-handler"
import Combo from "../models/comboModel.js"
import { sendSuccess } from "../utils/apiResponse.js"

// @desc Get all active combos (public), ordered for the homepage
// @route GET /api/v1/combos
const getCombos = asyncHandler(async (_req, res) => {
  const combos = await Combo.find({ status: "active" })
    .sort({ order: 1, createdAt: -1 })
    .populate("products.product", "name slug price discountedPrice images unit")

  return sendSuccess(res, {
    message: "Combos fetched successfully",
    data: { items: combos },
  })
})

export { getCombos }

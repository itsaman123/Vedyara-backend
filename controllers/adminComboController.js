import asyncHandler from "express-async-handler"
import Combo from "../models/comboModel.js"
import Product from "../models/productModel.js"
import { badRequest, notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const buildSlug = async (name, existingId = null) => {
  const base = slugify(name) || "combo"
  let slug = base
  let suffix = 1

  while (await Combo.exists({ slug, ...(existingId ? { _id: { $ne: existingId } } : {}) })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }

  return slug
}

const assertProductsExist = async (products) => {
  const ids = products.map((item) => item.product)
  const uniqueIds = [...new Set(ids.map(String))]
  const count = await Product.countDocuments({ _id: { $in: uniqueIds } })

  if (count !== uniqueIds.length) {
    throw badRequest("One or more selected products could not be found")
  }
}

const normalizeComboBody = async (body, existingCombo = null) => {
  const name = body.name ?? existingCombo?.name
  const shouldRefreshSlug = !existingCombo || body.name

  return {
    name,
    slug: shouldRefreshSlug ? await buildSlug(name, existingCombo?._id) : existingCombo.slug,
    tagline: body.tagline ?? existingCombo?.tagline ?? "",
    description: body.description ?? existingCombo?.description ?? "",
    emoji: body.emoji ?? existingCombo?.emoji ?? "🎁",
    badge: body.badge ?? existingCombo?.badge ?? "",
    products: body.products ?? existingCombo?.products ?? [],
    price: body.price ?? existingCombo?.price,
    highlights: body.highlights ?? existingCombo?.highlights ?? [],
    order: body.order ?? existingCombo?.order ?? 0,
    status: body.status ?? existingCombo?.status ?? "draft",
  }
}

const populateCombo = (query) =>
  query.populate("products.product", "name slug price discountedPrice images unit")

const getCombos = asyncHandler(async (req, res) => {
  const { page, limit, search, status } = req.query

  const filter = {}
  if (status) filter.status = status
  if (search) filter.name = { $regex: search, $options: "i" }

  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    populateCombo(Combo.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit)),
    Combo.countDocuments(filter),
  ])

  return sendSuccess(res, {
    message: "Combos fetched successfully",
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

const getComboById = asyncHandler(async (req, res) => {
  const combo = await populateCombo(Combo.findById(req.params.id))

  if (!combo) {
    throw notFound("Combo not found")
  }

  return sendSuccess(res, {
    message: "Combo fetched successfully",
    data: { combo },
  })
})

const createCombo = asyncHandler(async (req, res) => {
  const comboBody = await normalizeComboBody(req.body)
  await assertProductsExist(comboBody.products)

  const combo = await Combo.create(comboBody)
  const populated = await populateCombo(Combo.findById(combo._id))

  return sendSuccess(res, {
    statusCode: 201,
    message: "Combo created successfully",
    data: { combo: populated },
  })
})

const updateCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id)

  if (!combo) {
    throw notFound("Combo not found")
  }

  const comboBody = await normalizeComboBody(req.body, combo)
  await assertProductsExist(comboBody.products)

  Object.assign(combo, comboBody)
  await combo.save()

  const populated = await populateCombo(Combo.findById(combo._id))

  return sendSuccess(res, {
    message: "Combo updated successfully",
    data: { combo: populated },
  })
})

const deleteCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id)

  if (!combo) {
    throw notFound("Combo not found")
  }

  await combo.deleteOne()

  return sendSuccess(res, {
    message: "Combo deleted successfully",
    data: { comboId: req.params.id },
  })
})

const deleteCombos = asyncHandler(async (req, res) => {
  const { ids } = req.body

  const result = await Combo.deleteMany({ _id: { $in: ids } })

  return sendSuccess(res, {
    message: "Combos deleted successfully",
    data: { deletedCount: result.deletedCount },
  })
})

export {
  createCombo,
  deleteCombo,
  deleteCombos,
  getComboById,
  getCombos,
  updateCombo,
}

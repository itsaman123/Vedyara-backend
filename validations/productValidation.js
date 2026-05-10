import Joi from "joi"

const mongoId = Joi.string().hex().length(24)

const productPayload = {
  name: Joi.string().trim().min(2).max(160),
  description: Joi.string().trim().max(5000).allow("").default(""),
  shortDescription: Joi.string().trim().max(500).allow("").default(""),
  category: Joi.string().trim().min(2).max(80),
  subCategory: Joi.string().trim().max(80).allow("").default(""),
  tags: Joi.array().items(Joi.string().trim().max(40)).default([]),
  sku: Joi.string().trim().max(60),
  price: Joi.number().min(0),
  discountedPrice: Joi.number().min(0).allow(null).default(null),
  stock: Joi.number().integer().min(0).default(0),
  unit: Joi.string().trim().max(40).default("unit"),
  images: Joi.array().items(Joi.string().max(2500000)).default([]),
  featured: Joi.boolean().default(false),
  status: Joi.string().valid("active", "inactive", "draft", "out_of_stock"),
  inventoryTracking: Joi.boolean().default(true),
}

const createProductSchema = Joi.object({
  ...productPayload,
  name: productPayload.name.required(),
  category: productPayload.category.required(),
  price: productPayload.price.required(),
})

const updateProductSchema = Joi.object(productPayload).min(1)

const productListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  category: Joi.string().trim().max(80),
  status: Joi.string().valid("active", "inactive", "draft", "out_of_stock"),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "name", "price", "stock", "status")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})

const deleteProductsSchema = Joi.object({
  ids: Joi.array().items(mongoId.required()).min(1).required(),
})

export {
  createProductSchema,
  deleteProductsSchema,
  productListQuerySchema,
  updateProductSchema,
}

import Joi from "joi"

const mongoId = Joi.string().hex().length(24)

const comboItemSchema = Joi.object({
  product: mongoId.required(),
  quantity: Joi.number().integer().min(1).default(1),
})

const comboPayload = {
  name: Joi.string().trim().min(2).max(160),
  tagline: Joi.string().trim().max(200).allow("").default(""),
  description: Joi.string().trim().max(2000).allow("").default(""),
  emoji: Joi.string().trim().max(8).allow("").default("🎁"),
  badge: Joi.string().trim().max(40).allow("").default(""),
  products: Joi.array().items(comboItemSchema).min(2),
  price: Joi.number().min(0),
  highlights: Joi.array().items(Joi.string().trim().max(120)).default([]),
  order: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid("active", "inactive", "draft"),
}

const createComboSchema = Joi.object({
  ...comboPayload,
  name: comboPayload.name.required(),
  products: comboPayload.products.required(),
  price: comboPayload.price.required(),
})

const updateComboSchema = Joi.object(comboPayload).min(1)

const comboListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid("active", "inactive", "draft"),
})

const deleteCombosSchema = Joi.object({
  ids: Joi.array().items(mongoId.required()).min(1).required(),
})

export {
  createComboSchema,
  deleteCombosSchema,
  comboListQuerySchema,
  updateComboSchema,
}

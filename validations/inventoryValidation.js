import Joi from "joi"

const mongoId = Joi.string().hex().length(24)

const addInventorySchema = Joi.object({
  productId: mongoId.required(),
  quantity: Joi.number().integer().min(1).required(),
  type: Joi.string().valid("added", "removed").default("added"),
  note: Joi.string().trim().max(500).allow("").default(""),
})

const inventoryListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid("added", "removed", "sold"),
  productId: mongoId,
  search: Joi.string().trim().max(100),
  sortBy: Joi.string().valid("createdAt", "quantity", "type").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})

export { addInventorySchema, inventoryListQuerySchema }

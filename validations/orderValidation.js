import Joi from "joi"

const orderListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  status: Joi.string().valid("pending", "processing", "shipped", "delivered", "cancelled"),
  sortBy: Joi.string().valid("createdAt", "updatedAt", "amount", "status").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
})

export { orderListQuerySchema }

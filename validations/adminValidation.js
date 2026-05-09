import Joi from "joi"

const adminLoginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
})

export { adminLoginSchema }

import Joi from "joi"

const email = Joi.string().trim().lowercase().email().max(254)

// Indian mobile numbers, typed any common way ("+91 98765 43210",
// "098765-43210"); stored as the bare 10 digits
const phone = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const match = value.replace(/[\s-]/g, "").match(/^(?:\+?91|0)?([6-9]\d{9})$/)
    return match ? match[1] : helpers.error("any.invalid")
  })
  .messages({ "any.invalid": "Enter a valid 10-digit mobile number" })

const name = Joi.string().trim().min(2).max(50)

const addressFields = {
  name: name.required(),
  phone: phone.required(),
  address: Joi.string().trim().min(5).max(300).required(),
  city: Joi.string().trim().min(2).max(80).required(),
  state: Joi.string().trim().min(2).max(80).required(),
  pincode: Joi.string()
    .trim()
    .pattern(/^[1-9]\d{5}$/)
    .required()
    .messages({ "string.pattern.base": "Enter a valid 6-digit pincode" }),
}

const shippingAddressSchema = Joi.object(addressFields)

const addAddressSchema = Joi.object({
  ...addressFields,
  isDefault: Joi.boolean().default(false),
})

const checkoutAuthSchema = Joi.object({
  name: name.required(),
  email: email.required(),
  phone: phone.required(),
})

const otpRequestSchema = Joi.object({
  email: email.required(),
})

const otpVerifySchema = Joi.object({
  email: email.required(),
  otp: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({ "string.pattern.base": "Enter the 6-digit code" }),
})

const updateProfileSchema = Joi.object({
  name,
  phone: phone.allow(""),
  email,
  password: Joi.string().min(6).max(128),
}).min(1)

export {
  addAddressSchema,
  checkoutAuthSchema,
  otpRequestSchema,
  otpVerifySchema,
  shippingAddressSchema,
  updateProfileSchema,
}

import { badRequest } from "../utils/apiError.js"

const validateRequest = (schema, property = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }))

    throw badRequest("Validation failed", errors)
  }

  req[property] = value
  next()
}

export default validateRequest

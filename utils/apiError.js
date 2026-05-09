const createError = (statusCode, message, errors = null) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.errors = errors
  return error
}

const badRequest = (message, errors = null) => createError(400, message, errors)
const unauthorized = (message, errors = null) => createError(401, message, errors)
const forbidden = (message, errors = null) => createError(403, message, errors)
const notFound = (message, errors = null) => createError(404, message, errors)
const conflict = (message, errors = null) => createError(409, message, errors)

export { createError, badRequest, unauthorized, forbidden, notFound, conflict }

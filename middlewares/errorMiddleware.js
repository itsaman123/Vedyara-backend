import { sendError } from "../utils/apiResponse.js"

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500)
  const message = err.message || "Something went wrong"

  return sendError(res, {
    statusCode,
    message,
    errors: err.errors,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  })
}

export { notFound, errorHandler }

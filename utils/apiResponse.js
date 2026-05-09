const sendSuccess = (
  res,
  { statusCode = 200, message = "Request completed successfully", data = null } = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

const sendError = (
  res,
  {
    statusCode = 500,
    message = "Something went wrong",
    errors = null,
    stack = undefined,
  } = {}
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack,
  })
}

export { sendSuccess, sendError }

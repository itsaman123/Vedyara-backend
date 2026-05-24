import jwt from "jsonwebtoken"
import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import { forbidden, unauthorized } from "../utils/apiError.js"

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.jwt || req.headers["x-auth-token"] || req.headers.token

  if (req.headers.authorization) {
    if (req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]
    } else {
      token = req.headers.authorization
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.user = await User.findById(decoded.userId).select("-password")

      if (!req.user) {
        throw unauthorized("User linked to this token no longer exists")
      }

      next()
    } catch (error) {
      throw unauthorized("Invalid or expired token")
    }
  } else {
    throw unauthorized("Not authorized, token missing")
  }
})

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw forbidden("You do not have permission to access this resource")
  }

  next()
}

const adminOnly = authorizeRoles("admin")

export { protect, authorizeRoles, adminOnly }

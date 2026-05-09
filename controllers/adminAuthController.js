import asyncHandler from "express-async-handler"
import User from "../models/userModel.js"
import { unauthorized } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import generateToken from "../utils/generateToken.js"

const buildAdminPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
})

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const admin = await User.findOne({ email, role: "admin" })

  if (!admin || !(await admin.matchPassword(password))) {
    throw unauthorized("Invalid admin email or password")
  }

  const token = generateToken(res, admin._id)

  return sendSuccess(res, {
    message: "Admin authenticated successfully",
    data: {
      admin: buildAdminPayload(admin),
      token,
    },
  })
})

const getAdminProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Admin profile fetched successfully",
    data: {
      admin: buildAdminPayload(req.user),
    },
  })
})

export { loginAdmin, getAdminProfile }

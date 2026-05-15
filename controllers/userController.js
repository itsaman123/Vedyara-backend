import asyncHandler from "express-async-handler"
import crypto from "crypto"
import User from "../models/userModel.js"
import generateToken from "../utils/generateToken.js"
import { badRequest, conflict, notFound, unauthorized } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import sendPasswordResetEmail from "../utils/sendPasswordResetEmail.js"

const buildUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  addresses: user.addresses || [],
})

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex")

// @desc user token
// route /api/users/login
// @method post
const loginUser = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password

  if (!email || !password) {
    throw badRequest("Email and password are required")
  }

  const user = await User.findOne({ email })

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(res, user._id)

    return sendSuccess(res, {
      statusCode: 200,
      message: "User authenticated successfully",
      data: {
        user: buildUserPayload(user),
        token,
      },
    })
  }

  throw unauthorized("Invalid email or password")
})

// @desc register user
// route /api/users
// @method post
const registerUser = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim()
  const email = req.body.email?.trim().toLowerCase()
  const password = req.body.password

  if (!name || !email || !password) {
    throw badRequest("Name, email, and password are required")
  }

  const userExists = await User.findOne({ email })

  if (userExists) {
    throw conflict("User already exists")
  }

  const user = await User.create({
    name,
    email,
    password,
  })

  const token = generateToken(res, user._id)

  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: {
      user: buildUserPayload(user),
      token,
    },
  })
})

// @desc logout user
// route /api/users/logout
// @method post
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  })

  return sendSuccess(res, {
    message: "User logged out successfully",
  })
})

// @desc get user profile
// route /api/users/profile
// @method get
const getUserProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "User profile fetched successfully",
    data: {
      user: buildUserPayload(req.user),
    },
  })
})

// @desc update user profile
// route /api/users/profile
// @method put
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    throw notFound("User not found")
  }

  const nextName = req.body.name?.trim()
  const nextEmail = req.body.email?.trim().toLowerCase()
  const nextPassword = req.body.password

  if (nextEmail && nextEmail !== user.email) {
    const existingUser = await User.findOne({ email: nextEmail })

    if (existingUser) {
      throw conflict("Email is already in use")
    }
  }

  user.name = nextName || user.name
  user.email = nextEmail || user.email

  if (nextPassword) {
    user.password = nextPassword
  }

  const updatedUser = await user.save()

  return sendSuccess(res, {
    message: "User profile updated successfully",
    data: {
      user: buildUserPayload(updatedUser),
    },
  })
})

// @desc add user address
// route /api/users/addresses
// @method post
const addUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  
  if (!user) {
    throw notFound("User not found")
  }

  const { name, phone, address, city, pincode, isDefault } = req.body

  if (!name || !phone || !address || !city || !pincode) {
    throw badRequest("All address fields are required")
  }

  const newAddress = {
    name,
    phone,
    address,
    city,
    pincode,
    isDefault: isDefault || false
  }

  // If this is set to default or it's the first address, we might want to unset others
  if (newAddress.isDefault) {
    user.addresses.forEach(a => { a.isDefault = false })
  } else if (user.addresses.length === 0) {
    newAddress.isDefault = true
  }

  user.addresses.push(newAddress)
  const updatedUser = await user.save()

  return sendSuccess(res, {
    statusCode: 201,
    message: "Address added successfully",
    data: {
      user: buildUserPayload(updatedUser),
    },
  })
})

// @desc delete user address
// route /api/users/addresses/:id
// @method delete
const deleteUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  
  if (!user) {
    throw notFound("User not found")
  }

  const addressId = req.params.id
  
  user.addresses = user.addresses.filter(a => a._id.toString() !== addressId)
  
  // Ensure we still have a default if any left
  if (user.addresses.length > 0 && !user.addresses.some(a => a.isDefault)) {
    user.addresses[0].isDefault = true
  }

  const updatedUser = await user.save()

  return sendSuccess(res, {
    message: "Address deleted successfully",
    data: {
      user: buildUserPayload(updatedUser),
    },
  })
})

// @desc request password reset email
// route /api/users/forgot-password
// @method post
const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase()

  if (!email) {
    throw badRequest("Email is required")
  }

  const user = await User.findOne({ email })

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex")

    user.resetPasswordToken = hashResetToken(resetToken)
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000
    await user.save({ validateBeforeSave: false })

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      })
    } catch (error) {
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save({ validateBeforeSave: false })
      throw error
    }
  }

  return sendSuccess(res, {
    message: "If an account exists for that email, a password reset link has been sent",
  })
})

// @desc reset password
// route /api/users/reset-password/:token
// @method post
const resetPassword = asyncHandler(async (req, res) => {
  const password = req.body.password
  const token = req.params.token

  if (!password) {
    throw badRequest("Password is required")
  }

  if (!token) {
    throw badRequest("Reset token is required")
  }

  const user = await User.findOne({
    resetPasswordToken: hashResetToken(token),
    resetPasswordExpires: { $gt: Date.now() },
  })

  if (!user) {
    throw badRequest("Password reset link is invalid or has expired")
  }

  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  return sendSuccess(res, {
    message: "Password reset successfully",
  })
})

export {
  loginUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
  addUserAddress,
  deleteUserAddress,
}

import asyncHandler from "express-async-handler"
import crypto from "crypto"
import User from "../models/userModel.js"
import generateToken from "../utils/generateToken.js"
import { badRequest, conflict, createError, notFound, unauthorized } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import sendPasswordResetEmail from "../utils/sendPasswordResetEmail.js"
import sendOtpEmail from "../utils/sendOtpEmail.js"

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 30 * 1000
const OTP_MAX_ATTEMPTS = 5

const buildUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  emailVerified: Boolean(user.emailVerified),
  addresses: user.addresses || [],
})

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex")

const clearOtp = (user) => {
  user.otpHash = undefined
  user.otpExpires = undefined
  user.otpAttempts = 0
}

const issueOtp = async (user) => {
  if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw createError(429, "A code was just sent. Please wait a few seconds before requesting another.")
  }

  const otp = crypto.randomInt(100000, 1000000).toString()

  user.otpHash = hashResetToken(otp)
  user.otpExpires = Date.now() + OTP_TTL_MS
  user.otpAttempts = 0
  user.otpSentAt = Date.now()
  await user.save({ validateBeforeSave: false })

  await sendOtpEmail({ email: user.email, name: user.name, otp })
}

const sendSession = (res, user, { statusCode = 200, message }) => {
  const token = generateToken(res, user._id, user.tokenVersion)

  return sendSuccess(res, {
    statusCode,
    message,
    data: {
      otpRequired: false,
      token,
      user: buildUserPayload(user),
    },
  })
}

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
    const token = generateToken(res, user._id, user.tokenVersion)

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

  const token = generateToken(res, user._id, user.tokenVersion)

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

    user.emailVerified = false
  }

  user.name = nextName || user.name
  user.email = nextEmail || user.email

  if (req.body.phone !== undefined) {
    user.phone = req.body.phone || undefined
  }

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

  const { isDefault, ...address } = req.body

  user.saveAddress(address, { makeDefault: isDefault })
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

// @desc make an address the default
// route /api/users/addresses/:id/default
// @method patch
const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    throw notFound("User not found")
  }

  const target = user.addresses.find((a) => a._id.toString() === req.params.id)

  if (!target) {
    throw notFound("Address not found")
  }

  user.addresses.forEach((a) => {
    a.isDefault = a._id.equals(target._id)
  })
  const updatedUser = await user.save()

  return sendSuccess(res, {
    message: "Default address updated",
    data: {
      user: buildUserPayload(updatedUser),
    },
  })
})

// @desc identify a shopper at checkout. A new email gets an account straight
// away; an existing email must prove ownership with a one-time code first.
// route /api/users/checkout-auth
// @method post
const checkoutAuth = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body

  const existingUser = await User.findOne({ email })

  if (!existingUser) {
    try {
      const user = await User.create({
        name,
        email,
        phone,
        password: crypto.randomBytes(16).toString("hex"),
      })

      return sendSession(res, user, { statusCode: 201, message: "Account created" })
    } catch (error) {
      // Lost a race with a parallel request for the same email
      if (error.code !== 11000) throw error
    }
  }

  const user = existingUser || (await User.findOne({ email }))
  await issueOtp(user)

  return sendSuccess(res, {
    message: "Verification code sent",
    data: { otpRequired: true, email },
  })
})

// @desc email a sign-in code to an existing customer
// route /api/users/otp/request
// @method post
const requestOtp = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email })

  if (!user) {
    throw notFound(
      "No account found for this email. Your account is created automatically with your first order."
    )
  }

  await issueOtp(user)

  return sendSuccess(res, {
    message: "Verification code sent",
    data: { otpRequired: true, email: user.email },
  })
})

// @desc sign in with an emailed one-time code
// route /api/users/otp/verify
// @method post
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body
  const user = await User.findOne({ email })

  if (!user || !user.otpHash) {
    throw badRequest("Please request a new code")
  }

  if (user.otpExpires.getTime() < Date.now()) {
    clearOtp(user)
    await user.save({ validateBeforeSave: false })
    throw badRequest("This code has expired. Please request a new one")
  }

  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    clearOtp(user)
    await user.save({ validateBeforeSave: false })
    throw badRequest("Too many incorrect attempts. Please request a new code")
  }

  if (hashResetToken(otp) !== user.otpHash) {
    user.otpAttempts += 1
    await user.save({ validateBeforeSave: false })
    throw badRequest("Incorrect code. Please check and try again")
  }

  clearOtp(user)

  // First proof of ownership: sign out any session created before it, e.g.
  // by someone who checked out with this email before the real owner did
  if (!user.emailVerified) {
    user.emailVerified = true
    user.tokenVersion = (user.tokenVersion || 0) + 1
  }

  await user.save({ validateBeforeSave: false })

  return sendSession(res, user, { message: "Signed in successfully" })
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
  setDefaultAddress,
  checkoutAuth,
  requestOtp,
  verifyOtp,
}

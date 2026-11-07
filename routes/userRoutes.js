import express from "express"
import {
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
} from "../controllers/userController.js"
import { protect } from "../middlewares/authMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import {
  addAddressSchema,
  checkoutAuthSchema,
  otpRequestSchema,
  otpVerifySchema,
  updateProfileSchema,
} from "../validations/userValidation.js"

const router = express.Router()

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post("/logout", logoutUser)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)

router.post("/checkout-auth", validateRequest(checkoutAuthSchema), checkoutAuth)
router.post("/otp/request", validateRequest(otpRequestSchema), requestOtp)
router.post("/otp/verify", validateRequest(otpVerifySchema), verifyOtp)

router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, validateRequest(updateProfileSchema), updateUserProfile)

router.post("/addresses", protect, validateRequest(addAddressSchema), addUserAddress)
router.patch("/addresses/:id/default", protect, setDefaultAddress)
router.delete("/addresses/:id", protect, deleteUserAddress)

export default router

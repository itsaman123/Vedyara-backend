import express from "express"
import {
  cancelPendingPayment,
  createCodOrder,
  createRazorpayOrder,
  getMyOrders,
  getPaymentConfig,
  razorpayWebhook,
  trackOrder,
  verifyPayment,
} from "../controllers/orderController.js"
import { protect } from "../middlewares/authMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import { placeOrderSchema, verifyPaymentSchema } from "../validations/orderValidation.js"

const router = express.Router()

router.get("/payment-config", getPaymentConfig)
router.post("/razorpay-webhook", razorpayWebhook)

router.post("/create", protect, validateRequest(placeOrderSchema), createRazorpayOrder)
router.post("/verify", protect, validateRequest(verifyPaymentSchema), verifyPayment)
router.post("/create-cod", protect, validateRequest(placeOrderSchema), createCodOrder)
router.post("/:id/cancel-payment", protect, cancelPendingPayment)

router.get("/myorders", protect, getMyOrders)
router.get("/track", trackOrder)

export default router

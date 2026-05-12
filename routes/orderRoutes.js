import express from "express"
import { createRazorpayOrder, verifyPayment } from "../controllers/orderController.js"
// import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

// We can make these protected if we want, but for Buy Now (guest), we might want them accessible
// For now, let's keep them public so guests can buy too, or the controller handles it.
router.post("/create", createRazorpayOrder)
router.post("/verify", verifyPayment)

export default router

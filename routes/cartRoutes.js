import express from "express"
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} from "../controllers/cartController.js"
import { protect } from "../middlewares/authMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import {
  addToCartSchema,
  mergeCartSchema,
  updateCartItemSchema,
} from "../validations/orderValidation.js"

const router = express.Router()

router.use(protect) // All cart routes are protected

router.route("/")
  .get(getCart)
  .post(validateRequest(addToCartSchema), addToCart)
  .delete(clearCart)

router.post("/merge", validateRequest(mergeCartSchema), mergeCart)

router.route("/:productId")
  .patch(validateRequest(updateCartItemSchema), updateCartItem)
  .delete(removeFromCart)

export default router

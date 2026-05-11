import express from "express"
import { getCart, addToCart, updateCartItem, removeFromCart } from "../controllers/cartController.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.use(protect) // All cart routes are protected

router.route("/")
  .get(getCart)
  .post(addToCart)

router.route("/:productId")
  .patch(updateCartItem)
  .delete(removeFromCart)

export default router

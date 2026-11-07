import express from "express"
import { getWishlist, toggleWishlist, mergeWishlist } from "../controllers/wishlistController.js"
import { protect } from "../middlewares/authMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import { mergeWishlistSchema, toggleWishlistSchema } from "../validations/orderValidation.js"

const router = express.Router()

router.use(protect) // All wishlist routes are protected

router.get("/", getWishlist)
router.post("/toggle", validateRequest(toggleWishlistSchema), toggleWishlist)
router.post("/merge", validateRequest(mergeWishlistSchema), mergeWishlist)

export default router

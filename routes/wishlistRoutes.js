import express from "express"
import { getWishlist, toggleWishlist } from "../controllers/wishlistController.js"
import { protect } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.use(protect) // All wishlist routes are protected

router.get("/", getWishlist)
router.post("/toggle", toggleWishlist)

export default router

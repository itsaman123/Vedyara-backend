import express from "express"
import {
  getAdminProfile,
  loginAdmin,
} from "../controllers/adminAuthController.js"
import {
  addInventory,
  getInventoryList,
} from "../controllers/inventoryController.js"
import { adminOnly, protect } from "../middlewares/authMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import { adminLoginSchema } from "../validations/adminValidation.js"
import {
  addInventorySchema,
  inventoryListQuerySchema,
} from "../validations/inventoryValidation.js"

const router = express.Router()

router.post("/auth/login", validateRequest(adminLoginSchema), loginAdmin)
router.get("/auth/me", protect, adminOnly, getAdminProfile)

router.get(
  "/inventory",
  protect,
  adminOnly,
  validateRequest(inventoryListQuerySchema, "query"),
  getInventoryList
)
router.post(
  "/inventory/add",
  protect,
  adminOnly,
  validateRequest(addInventorySchema),
  addInventory
)

export default router

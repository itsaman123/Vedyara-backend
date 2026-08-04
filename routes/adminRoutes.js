import express from "express"
import {
  getAdminProfile,
  loginAdmin,
} from "../controllers/adminAuthController.js"
import {
  addInventory,
  getInventoryList,
} from "../controllers/inventoryController.js"
import {
  createProduct,
  deleteProduct,
  deleteProducts,
  getProductById,
  getProductSummary,
  getProducts,
  updateProduct,
} from "../controllers/adminProductController.js"
import {
  createVideo,
  deleteVideo,
  deleteVideos,
  getVideoById,
  getVideos as getAdminVideos,
  updateVideo,
} from "../controllers/adminVideoController.js"
import {
  createCombo,
  deleteCombo,
  deleteCombos,
  getComboById,
  getCombos as getAdminCombos,
  updateCombo,
} from "../controllers/adminComboController.js"
import {
  getOrderSummary,
  getOrders,
} from "../controllers/adminOrderController.js"
import {
  getCloudinarySignature,
  getVideoCloudinarySignature,
  uploadProductImages as uploadProductImagesController,
} from "../controllers/adminUploadController.js"
import { adminOnly, protect } from "../middlewares/authMiddleware.js"
import { uploadProductImages } from "../middlewares/uploadMiddleware.js"
import validateRequest from "../middlewares/validateRequest.js"
import { adminLoginSchema } from "../validations/adminValidation.js"
import {
  addInventorySchema,
  inventoryListQuerySchema,
} from "../validations/inventoryValidation.js"
import {
  createProductSchema,
  deleteProductsSchema,
  productListQuerySchema,
  updateProductSchema,
} from "../validations/productValidation.js"
import {
  createVideoSchema,
  deleteVideosSchema,
  updateVideoSchema,
  videoListQuerySchema,
} from "../validations/videoValidation.js"
import {
  createComboSchema,
  deleteCombosSchema,
  comboListQuerySchema,
  updateComboSchema,
} from "../validations/comboValidation.js"
import { orderListQuerySchema } from "../validations/orderValidation.js"

const router = express.Router()

router.post("/auth/login", validateRequest(adminLoginSchema), loginAdmin)
router.get("/auth/me", protect, adminOnly, getAdminProfile)

router.post(
  "/uploads/product-images",
  protect,
  adminOnly,
  uploadProductImages.array("images", 8),
  uploadProductImagesController
)

router.post(
  "/uploads/cloudinary-signature",
  protect,
  adminOnly,
  getCloudinarySignature
)

router.post(
  "/uploads/video-cloudinary-signature",
  protect,
  adminOnly,
  getVideoCloudinarySignature
)

router.get(
  "/products",
  protect,
  adminOnly,
  validateRequest(productListQuerySchema, "query"),
  getProducts
)
router.get("/products/summary", protect, adminOnly, getProductSummary)
router.get("/products/:id", protect, adminOnly, getProductById)
router.post(
  "/products",
  protect,
  adminOnly,
  validateRequest(createProductSchema),
  createProduct
)
router.put(
  "/products/:id",
  protect,
  adminOnly,
  validateRequest(updateProductSchema),
  updateProduct
)
router.delete(
  "/products",
  protect,
  adminOnly,
  validateRequest(deleteProductsSchema),
  deleteProducts
)
router.delete("/products/:id", protect, adminOnly, deleteProduct)

router.get(
  "/videos",
  protect,
  adminOnly,
  validateRequest(videoListQuerySchema, "query"),
  getAdminVideos
)
router.get("/videos/:id", protect, adminOnly, getVideoById)
router.post(
  "/videos",
  protect,
  adminOnly,
  validateRequest(createVideoSchema),
  createVideo
)
router.put(
  "/videos/:id",
  protect,
  adminOnly,
  validateRequest(updateVideoSchema),
  updateVideo
)
router.delete(
  "/videos",
  protect,
  adminOnly,
  validateRequest(deleteVideosSchema),
  deleteVideos
)
router.delete("/videos/:id", protect, adminOnly, deleteVideo)

router.get(
  "/combos",
  protect,
  adminOnly,
  validateRequest(comboListQuerySchema, "query"),
  getAdminCombos
)
router.get("/combos/:id", protect, adminOnly, getComboById)
router.post(
  "/combos",
  protect,
  adminOnly,
  validateRequest(createComboSchema),
  createCombo
)
router.put(
  "/combos/:id",
  protect,
  adminOnly,
  validateRequest(updateComboSchema),
  updateCombo
)
router.delete(
  "/combos",
  protect,
  adminOnly,
  validateRequest(deleteCombosSchema),
  deleteCombos
)
router.delete("/combos/:id", protect, adminOnly, deleteCombo)

router.get(
  "/orders",
  protect,
  adminOnly,
  validateRequest(orderListQuerySchema, "query"),
  getOrders
)
router.get("/orders/summary", protect, adminOnly, getOrderSummary)

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

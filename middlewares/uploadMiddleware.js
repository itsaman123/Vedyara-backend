import multer from "multer"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import cloudinary from "../config/cloudinary.js"
import { badRequest } from "../utils/apiError.js"

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "vedyara/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
})

const imageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(badRequest("Only image files are allowed"))
  }

  cb(null, true)
}

const uploadProductImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
})

export { uploadProductImages }

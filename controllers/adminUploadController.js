import asyncHandler from "express-async-handler"
import { sendSuccess } from "../utils/apiResponse.js"
import cloudinary from "../config/cloudinary.js"

const uploadProductImages = asyncHandler(async (req, res) => {
  const images = (req.files || []).map((file) => ({
    filename: file.filename,
    url: file.path,
  }))

  return sendSuccess(res, {
    statusCode: 201,
    message: "Product images uploaded successfully",
    data: { images },
  })
})

const getCloudinarySignature = asyncHandler(async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: "vedyara/products",
    },
    process.env.CLOUDINARY_API_SECRET
  )

  return sendSuccess(res, {
    message: "Cloudinary signature generated",
    data: {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: "vedyara/products",
    },
  })
})

const getVideoCloudinarySignature = asyncHandler(async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000)
  const folder = "vedyara/videos"
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET
  )

  return sendSuccess(res, {
    message: "Cloudinary signature generated",
    data: {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    },
  })
})

export { uploadProductImages, getCloudinarySignature, getVideoCloudinarySignature }

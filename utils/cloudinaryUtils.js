import cloudinary from "../config/cloudinary.js"

/**
 * Extracts public_id from a Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - public_id
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null
  
  // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567/sample.jpg
  // Or with folder: https://res.cloudinary.com/demo/image/upload/v1234567/folder/sample.jpg
  
  const parts = url.split("/")
  const uploadIndex = parts.indexOf("upload")
  if (uploadIndex === -1) return null
  
  // public_id is everything after the version (v\d+) or after "upload" if no version
  const afterUpload = parts.slice(uploadIndex + 1)
  
  // Remove version if it exists
  if (afterUpload[0].startsWith("v") && /v\d+/.test(afterUpload[0])) {
    afterUpload.shift()
  }
  
  // Join parts and remove extension
  const publicIdWithExtension = afterUpload.join("/")
  return publicIdWithExtension.split(".")[0]
}

/**
 * Deletes an asset from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - "image" (default) or "video"
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (error) {
    console.error(`Failed to delete ${resourceType} from Cloudinary: ${publicId}`, error)
  }
}

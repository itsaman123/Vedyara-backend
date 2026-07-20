import asyncHandler from "express-async-handler"
import Video from "../models/videoModel.js"
import { sendSuccess } from "../utils/apiResponse.js"

// @desc Get all active videos (public), ordered for the homepage carousel
// @route GET /api/v1/videos
const getVideos = asyncHandler(async (_req, res) => {
  const videos = await Video.find({ isActive: true }).sort({ order: 1, createdAt: 1 })

  return sendSuccess(res, {
    message: "Videos fetched successfully",
    data: { items: videos },
  })
})

export { getVideos }

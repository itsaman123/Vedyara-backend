import asyncHandler from "express-async-handler"
import Video from "../models/videoModel.js"
import { notFound } from "../utils/apiError.js"
import { sendSuccess } from "../utils/apiResponse.js"
import { deleteFromCloudinary, getPublicIdFromUrl } from "../utils/cloudinaryUtils.js"

const normalizeVideoBody = (body, existingVideo = null) => ({
  title: body.title ?? existingVideo?.title,
  description: body.description ?? existingVideo?.description ?? "",
  ytId: body.ytId ?? existingVideo?.ytId ?? "",
  videoSrc: body.videoSrc ?? existingVideo?.videoSrc ?? "",
  thumbnail: body.thumbnail ?? existingVideo?.thumbnail ?? "",
  order: body.order ?? existingVideo?.order ?? 0,
  isActive: body.isActive ?? existingVideo?.isActive ?? true,
})

const getVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Video.find().sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit),
    Video.countDocuments(),
  ])

  return sendSuccess(res, {
    message: "Videos fetched successfully",
    data: {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  })
})

const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id)

  if (!video) {
    throw notFound("Video not found")
  }

  return sendSuccess(res, {
    message: "Video fetched successfully",
    data: { video },
  })
})

const createVideo = asyncHandler(async (req, res) => {
  const videoBody = normalizeVideoBody(req.body)
  const video = await Video.create(videoBody)

  return sendSuccess(res, {
    statusCode: 201,
    message: "Video created successfully",
    data: { video },
  })
})

const updateVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id)

  if (!video) {
    throw notFound("Video not found")
  }

  const videoBody = normalizeVideoBody(req.body, video)

  // Clean up the previous uploaded asset from Cloudinary if it was replaced/removed
  if (video.videoSrc && video.videoSrc !== videoBody.videoSrc) {
    const publicId = getPublicIdFromUrl(video.videoSrc)
    if (publicId) await deleteFromCloudinary(publicId, "video")
  }
  if (video.thumbnail && video.thumbnail !== videoBody.thumbnail) {
    const publicId = getPublicIdFromUrl(video.thumbnail)
    if (publicId) await deleteFromCloudinary(publicId, "image")
  }

  Object.assign(video, videoBody)
  await video.save()

  return sendSuccess(res, {
    message: "Video updated successfully",
    data: { video },
  })
})

const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id)

  if (!video) {
    throw notFound("Video not found")
  }

  if (video.videoSrc) {
    const publicId = getPublicIdFromUrl(video.videoSrc)
    if (publicId) await deleteFromCloudinary(publicId, "video")
  }
  if (video.thumbnail) {
    const publicId = getPublicIdFromUrl(video.thumbnail)
    if (publicId) await deleteFromCloudinary(publicId, "image")
  }

  await video.deleteOne()

  return sendSuccess(res, {
    message: "Video deleted successfully",
    data: { videoId: req.params.id },
  })
})

const deleteVideos = asyncHandler(async (req, res) => {
  const { ids } = req.body

  const videos = await Video.find({ _id: { $in: ids } })

  for (const video of videos) {
    if (video.videoSrc) {
      const publicId = getPublicIdFromUrl(video.videoSrc)
      if (publicId) await deleteFromCloudinary(publicId, "video")
    }
    if (video.thumbnail) {
      const publicId = getPublicIdFromUrl(video.thumbnail)
      if (publicId) await deleteFromCloudinary(publicId, "image")
    }
  }

  const result = await Video.deleteMany({ _id: { $in: ids } })

  return sendSuccess(res, {
    message: "Videos deleted successfully",
    data: { deletedCount: result.deletedCount },
  })
})

export {
  createVideo,
  deleteVideo,
  deleteVideos,
  getVideoById,
  getVideos,
  updateVideo,
}

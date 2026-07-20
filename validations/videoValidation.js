import Joi from "joi"

const mongoId = Joi.string().hex().length(24)

const videoPayload = {
  title: Joi.string().trim().min(2).max(160),
  description: Joi.string().trim().max(500).allow("").default(""),
  ytId: Joi.string().trim().max(40).allow("").default(""),
  videoSrc: Joi.string().trim().max(2500000).allow("").default(""),
  thumbnail: Joi.string().trim().max(2500000).allow("").default(""),
  order: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
}

const createVideoSchema = Joi.object({
  ...videoPayload,
  title: videoPayload.title.required(),
})

const updateVideoSchema = Joi.object(videoPayload).min(1)

const videoListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
})

const deleteVideosSchema = Joi.object({
  ids: Joi.array().items(mongoId.required()).min(1).required(),
})

export {
  createVideoSchema,
  deleteVideosSchema,
  updateVideoSchema,
  videoListQuerySchema,
}

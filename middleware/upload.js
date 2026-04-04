const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('cloudinary').v2

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'PLEASE_ENTER_YOUR_CLOUD_NAME',
    api_key: process.env.CLOUDINARY_API_KEY || 'PLEASE_ENTER_YOUR_API_KEY',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'PLEASE_ENTER_YOUR_API_SECRET'
})

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Support for both image and video
        let folder = 'products'
        let resource_type = 'image'
        if (file.mimetype.startsWith('video/')) {
            resource_type = 'video'
        }
        
        return {
            folder: folder,
            resource_type: resource_type,
            // Format can be determined automatically by cloudinary if not specified
        }
    }
})

const fileFilter = (req, file, cb) => {
    // accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true)
    } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false)
    }
}

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size (videos can be large)
    }
})

module.exports = upload

const router = require('express').Router()
const productController = require('../controller/productController')
const { authenticate, authorize } = require('../middleware/auth')
const upload = require('../middleware/upload')

// Public routes
router.get('/', productController.getProducts)
router.get('/:id', productController.getProductById)

// Admin only routes
router.post('/', authenticate, authorize(['admin']), upload.array('files', 5), productController.createProduct)
router.put('/:id', authenticate, authorize(['admin']), upload.array('files', 5), productController.updateProduct)
router.delete('/:id', authenticate, authorize(['admin']), productController.deleteProduct)

module.exports = router

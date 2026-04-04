const Product = require('../model/product')
const logger = require('../logging/logger')

async function createProduct(req, res) {
    try {
        const { name, price, discountedPrice, summary, description, sku, category } = req.body
        const files = req.files || []

        if (files.length > 5) {
            return res.status(400).json({ message: 'Maximum 5 files can be uploaded' })
        }

        let videoCount = 0
        const filePaths = []

        for (const file of files) {
            if (file.mimetype.startsWith('video/')) {
                videoCount++
            }
            // Store file paths directly or just filenames
            filePaths.push(file.filename)
        }

        if (videoCount > 1) {
            return res.status(400).json({ message: 'Maximum 1 video can be uploaded' })
        }

        const product = new Product({
            name,
            price,
            discountedPrice,
            summary,
            description,
            sku,
            category,
            image: filePaths
        })

        await product.save()
        return res.status(201).json({ message: 'Product created successfully', product })
    } catch (err) {
        logger.error('Create product error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function getProducts(req, res) {
    try {
        const products = await Product.find({ is_deleted: false })
        return res.status(200).json(products)
    } catch (err) {
        logger.error('Get products error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function getProductById(req, res) {
    try {
        const product = await Product.findOne({ _id: req.params.id, is_deleted: false })
        if (!product) return res.status(404).json({ message: 'Product not found' })
        
        // Track the view count
        product.views = (product.views || 0) + 1
        await product.save()

        return res.status(200).json(product)
    } catch (err) {
        logger.error('Get product by ID error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function updateProduct(req, res) {
    try {
        const { name, price, discountedPrice, summary, description, sku, category } = req.body
        const product = await Product.findOne({ _id: req.params.id, is_deleted: false })

        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        // Handle new file uploads
        if (req.files && req.files.length > 0) {
            let files = req.files
            // When updating files, if user uploads new files we can either append or replace.
            // Assuming replacement of existing files to respect the max 5, max 1 video rule constraints
            let videoCount = 0
            const filePaths = []

            for (const file of files) {
                if (file.mimetype.startsWith('video/')) {
                    videoCount++
                }
                filePaths.push(file.path)
            }

            if (videoCount > 1) {
                return res.status(400).json({ message: 'Maximum 1 video can be uploaded' })
            }
            if (files.length > 5) {
                return res.status(400).json({ message: 'Maximum 5 files can be uploaded' })
            }
            
            product.image = filePaths
        }

        if (name) product.name = name
        if (price) product.price = price
        if (discountedPrice !== undefined) product.discountedPrice = discountedPrice
        if (summary) product.summary = summary
        if (description) product.description = description
        if (sku) product.sku = sku
        if (category) product.category = category

        await product.save()
        return res.status(200).json({ message: 'Product updated successfully', product })
    } catch (err) {
        logger.error('Update product error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function deleteProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id)
        if (!product || product.is_deleted) {
            return res.status(404).json({ message: 'Product not found' })
        }
        
        // Soft delete
        product.is_deleted = true
        await product.save()

        return res.status(200).json({ message: 'Product deleted successfully' })
    } catch (err) {
        logger.error('Delete product error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct }

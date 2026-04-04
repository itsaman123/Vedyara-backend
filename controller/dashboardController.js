const Product = require('../model/product')
const logger = require('../logging/logger')

async function getDashboardStats(req, res) {
    try {
        const products = await Product.find({ is_deleted: false })
        
        const totalViews = products.reduce((acc, p) => acc + (p.views || 0), 0)
        const totalSales = products.reduce((acc, p) => acc + (p.sales || 0), 0)
        const totalRevenue = products.reduce((acc, p) => acc + (p.revenue || 0), 0)

        // Find top 5 products by views
        const topViewedProducts = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
        // Find top 5 by sales
        const topSellingProducts = [...products].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5)

        return res.status(200).json({
            overall: {
                totalProducts: products.length,
                totalViews,
                totalSales,
                totalRevenue
            },
            topViewedProducts,
            topSellingProducts
        })
    } catch (err) {
        logger.error('Dashboard stats error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function getProductTraffic(req, res) {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ _id: id, is_deleted: false })
        if (!product) return res.status(404).json({ message: 'Product not found' })

        return res.status(200).json({
            id: product._id,
            name: product.name,
            views: product.views || 0,
            sales: product.sales || 0,
            revenue: product.revenue || 0,
            conversionRate: product.views > 0 ? ((product.sales / product.views) * 100).toFixed(2) + '%' : '0%'
        })
    } catch (err) {
        logger.error('Dashboard product traffic error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

module.exports = { getDashboardStats, getProductTraffic }

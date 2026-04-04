const router = require('express').Router()
const dashboardController = require('../controller/dashboardController')
const { authenticate, authorize } = require('../middleware/auth')

// Protect all dashboard routes, admin only.
router.use(authenticate, authorize(['admin']))

router.get('/stats', dashboardController.getDashboardStats)
router.get('/product/:id/traffic', dashboardController.getProductTraffic)

module.exports = router

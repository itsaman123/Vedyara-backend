const router = require('express').Router()
const userController = require('../controller/userController')
const { authenticate } = require('../middleware/auth')

router.post('/v1/login', userController.adminLogin)

module.exports = router

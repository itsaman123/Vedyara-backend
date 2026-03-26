const router = require('express').Router()
const userController = require('../controller/userController')
const { authenticate } = require('../middleware/auth')

router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/refresh', userController.refreshToken)
router.post('/logout', userController.logout)

router.get('/me', authenticate, userController.me)

module.exports = router

const jwt = require('jsonwebtoken')
const User = require('../model/user')
const logger = require('../logging/logger')

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret'

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const payload = jwt.verify(token, JWT_SECRET)
        const user = await User.findById(payload.sub).select('-password')
        if (!user) return res.status(401).json({ message: 'User not found' })
        req.user = user
        next()
    } catch (err) {
        logger.error('Auth error', err)
        return res.status(401).json({ message: 'Invalid or expired token' })
    }
}

function authorize(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        next()
    }
}

module.exports = { authenticate, authorize }

const User = require('../model/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const logger = require('../logging/logger')

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret'
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '15m'
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d'

function generateAccessToken(user) {
    return jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

function generateRefreshToken(user) {
    return jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

async function register(req, res) {
    try {
        const { name, email, password } = req.body
        if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
        const exists = await User.findOne({ email })
        if (exists) return res.status(409).json({ message: 'Email already in use' })
        const hashed = await bcrypt.hash(password, 10)
        const user = new User({ name, email, password: hashed })
        await user.save()
        return res.status(201).json({ message: 'User created' })
    } catch (err) {
        logger.error('Register error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body
        if (!email || !password) return res.status(400).json({ message: 'Missing fields' })
        const user = await User.findOne({ email })
        if (!user) return res.status(401).json({ message: 'Invalid credentials' })
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)
        user.refreshTokens = user.refreshTokens.concat([refreshToken])
        await user.save()

        return res.json({ accessToken, refreshToken })
    } catch (err) {
        logger.error('Login error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}
async function adminLogin(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
        const user = await User.findOne({ email, role: 'admin' })
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)
        user.refreshTokens = user.refreshTokens.concat([refreshToken])
        await user.save()
        return res.json({ accessToken, refreshToken })

    }
    catch (err) {
        logger.error('Admin login error', err);
        return res.status(500).json({ message: 'Server Error' });
    }
}

async function logout(req, res) {
    try {
        const { refreshToken } = req.body
        if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' })
        let payload
        try {
            payload = jwt.verify(refreshToken, JWT_SECRET)
        } catch (err) {
            return res.status(200).json({ message: 'Logged out' })
        }
        const user = await User.findById(payload.sub)
        if (user) {
            user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken)
            await user.save()
        }
        return res.status(200).json({ message: 'Logged out' })
    } catch (err) {
        logger.error('Logout error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body
        if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' })
        let payload
        try {
            payload = jwt.verify(refreshToken, JWT_SECRET)
        } catch (err) {
            return res.status(401).json({ message: 'Invalid refresh token' })
        }
        const user = await User.findById(payload.sub)
        if (!user) return res.status(401).json({ message: 'User not found' })
        if (!user.refreshTokens.includes(refreshToken)) {
            return res.status(401).json({ message: 'Refresh token revoked' })
        }

        // rotate tokens
        user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken)
        const newRefresh = generateRefreshToken(user)
        user.refreshTokens.push(newRefresh)
        await user.save()

        const accessToken = generateAccessToken(user)
        return res.json({ accessToken, refreshToken: newRefresh })
    } catch (err) {
        logger.error('Refresh error', err)
        return res.status(500).json({ message: 'Server error' })
    }
}

async function me(req, res) {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' })
    return res.json({ user: req.user })
}

module.exports = { register, login, adminLogin, refreshToken, logout, me }

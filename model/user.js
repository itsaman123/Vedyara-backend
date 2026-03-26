const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    address_line1: {
        type: String
    },
    address_line2: {
        type: String
    },
    userImage: {
        type: String
    },
    refreshTokens: {
        type: [String],
        default: []
    },
    role: {
        type: String,
        enum: ['admin', 'customer'],
        default: 'customer'
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)
module.exports = User
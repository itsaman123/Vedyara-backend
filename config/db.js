const mongoose = require('mongoose')
const logger = require('../logging/logger')
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI)
        logger.info('Connected to MongoDB')
    } catch (err) {
        logger.error('MongoDB connection error', err)
        process.exit(1)
    }
}

module.exports = { connectDB }

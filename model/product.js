const mongoose = require('mongoose')
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: Array
    },
    discountedPrice: {
        type: Number,
    },
    summary: {
        type: String,
    },
    description: {
        type: String,
    },
    sku: {
        type: String,
    },
    category: {
        type: String,
    },
    views: {
        type: Number,
        default: 0
    },
    sales: {
        type: Number,
        default: 0
    },
    revenue: {
        type: Number,
        default: 0
    },
    is_deleted: {
        type: Boolean,
        default: false
    },

}, { timestamps: true })

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
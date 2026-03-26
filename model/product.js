import mongoose from 'mongoose';
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
    is_deleted: {
        type: boolean,
        default: false
    },

}, { timestamps: true })

const Product = mongoose.model('Product', productSchema);
export default Product;
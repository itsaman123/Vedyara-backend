import mongoose from "mongoose"

const orderSchema = mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    itemsCount: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["awaiting", "paid", "refunded", "failed"],
      default: "awaiting",
    },
  },
  {
    timestamps: true,
  }
)

orderSchema.index({ orderNumber: "text", customerName: "text", customerEmail: "text" })

const Order = mongoose.model("Order", orderSchema)

export default Order

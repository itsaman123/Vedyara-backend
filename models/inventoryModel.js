import mongoose from "mongoose"

const inventorySchema = mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ["added", "removed", "sold"],
      required: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

inventorySchema.index({ createdAt: -1 })

const Inventory = mongoose.model("Inventory", inventorySchema)

export default Inventory

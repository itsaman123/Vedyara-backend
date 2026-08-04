import mongoose from "mongoose"

const comboSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    emoji: {
      type: String,
      default: "🎁",
      trim: true,
    },
    badge: {
      type: String,
      default: "",
      trim: true,
    },
    products: [
      {
        _id: false,
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    highlights: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

const Combo = mongoose.model("Combo", comboSchema)

export default Combo

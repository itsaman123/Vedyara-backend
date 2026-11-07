import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: false,
      minlength: 10,
      maxlength: 15,
    },
    resetPasswordToken: {
      type: String,
      required: false,
    },
    resetPasswordExpires: {
      type: Date,
      required: false,
    },
    // Set once the customer proves they own the email (OTP sign-in). Accounts
    // created at checkout start unverified.
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // Embedded in every JWT; bumping it signs out all existing sessions.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    otpHash: {
      type: String,
      required: false,
    },
    otpExpires: {
      type: Date,
      required: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpSentAt: {
      type: Date,
      required: false,
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, default: "" },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
      }
    ],
  },
  {
    timestamps: true,
  }
)

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  const salt = await bcrypt.genSalt(10)

  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Adds an address unless the same one is already saved. The first address,
// or one saved with makeDefault, becomes the default. Caller saves the user.
userSchema.methods.saveAddress = function (address, { makeDefault = false } = {}) {
  const normalize = (value) => String(value || "").trim().toLowerCase()
  const existing = this.addresses.find(
    (a) =>
      normalize(a.address) === normalize(address.address) &&
      normalize(a.pincode) === normalize(address.pincode) &&
      normalize(a.phone) === normalize(address.phone)
  )

  const target = existing || this.addresses.create(address)

  if (existing) {
    Object.assign(existing, {
      name: address.name,
      city: address.city,
      state: address.state || existing.state,
    })
  } else {
    this.addresses.push(target)
  }

  if (makeDefault || this.addresses.length === 1 || !this.addresses.some((a) => a.isDefault)) {
    this.addresses.forEach((a) => {
      a.isDefault = a._id.equals(target._id)
    })
  }

  return target
}

const User = mongoose.model("User", userSchema)

export default User

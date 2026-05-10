import dotenv from "dotenv"
import connectDB from "../config/db.js"
import User from "../models/userModel.js"

dotenv.config()

const adminUser = {
  name: process.env.SEED_ADMIN_NAME || "Vedyara Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@vedyara.com",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
  role: "admin",
}

const seedAdmin = async () => {
  try {
    await connectDB()

    const existingAdmin = await User.findOne({ email: adminUser.email })

    if (existingAdmin) {
      existingAdmin.name = adminUser.name
      existingAdmin.password = adminUser.password
      existingAdmin.role = "admin"
      await existingAdmin.save()

      console.log(`Admin user updated: ${adminUser.email}`)
    } else {
      await User.create(adminUser)
      console.log(`Admin user created: ${adminUser.email}`)
    }

    console.log(`Admin password: ${adminUser.password}`)
    process.exit(0)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

seedAdmin()

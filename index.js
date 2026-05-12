import express from "express"
import dotenv from "dotenv"
import morgan from 'morgan'
import path from "path"
import userRoutes from "./routes/userRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import wishlistRoutes from "./routes/wishlistRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js"
dotenv.config()
const PORT = process.env.PORT || 3000

import connectDB from "./config/db.js"

connectDB()

const app = express()

app.use(morgan('common'))
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

app.use(cookieParser())

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    data: null,
  })
})

app.use("/api/v1/users", userRoutes)
app.use("/api/v1/products", productRoutes)
app.use("/api/v1/cart", cartRoutes)
app.use("/api/v1/wishlist", wishlistRoutes)
app.use("/api/v1/orders", orderRoutes)
app.use("/api/admin", adminRoutes)
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log("Server listening on port: " + PORT)
})

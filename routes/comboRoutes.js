import express from "express"
import { getCombos } from "../controllers/comboController.js"

const router = express.Router()

router.get("/", getCombos)

export default router

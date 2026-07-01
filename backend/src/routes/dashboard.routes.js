import { Router } from 'express'
import { getStats, getCounts } from '../controllers/dashboard.controller.js'
const router = Router()
router.get('/stats',  getStats)
router.get('/counts', getCounts)
export default router

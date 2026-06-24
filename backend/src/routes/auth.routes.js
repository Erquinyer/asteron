import { Router } from 'express'
import { login }                              from '../controllers/auth.controller.js'
import { forgotPassword, resetPassword }      from '../controllers/recovery.controller.js'

const router = Router()

router.post('/login',           login)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password',  resetPassword)

export default router

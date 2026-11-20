import { Router } from 'express'
import { login }                              from '../controllers/auth.controller.js'
import { forgotPassword, resetPassword }      from '../controllers/recovery.controller.js'
import { limiteLogin, limiteRecuperacion }    from '../middlewares/limites.js'

const router = Router()

router.post('/login',           limiteLogin,        login)
router.post('/forgot-password', limiteRecuperacion, forgotPassword)
router.post('/reset-password',  limiteRecuperacion, resetPassword)

export default router

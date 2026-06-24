import { Router } from 'express'
import { getPerfil, updatePerfil, changePassword } from '../controllers/perfil.controller.js'
const router = Router()
router.get('/',              getPerfil)
router.put('/',              updatePerfil)
router.patch('/password',    changePassword)
export default router

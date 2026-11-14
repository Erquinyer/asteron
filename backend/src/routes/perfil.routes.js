import { Router } from 'express'
import { getPerfil, updatePerfil, changePassword, aceptarPoliticaDatos } from '../controllers/perfil.controller.js'
const router = Router()
router.get('/',              getPerfil)
router.put('/',              updatePerfil)
router.patch('/password',    changePassword)
router.post('/politica-datos', aceptarPoliticaDatos)
export default router

import { Router } from 'express'
import multer from 'multer'
import {
  getAll, getOcupados, getByFase, create, update, updateEstado, updateAvance, remove,
  getPlantilla, importar, previsualizarImportar,
} from '../controllers/programacion.controller.js'
import { requirePlantScheduler } from '../middlewares/requirePlantScheduler.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

const router = Router()
router.get('/ocupados',       getOcupados)
router.get('/plantilla',      requirePlantScheduler, getPlantilla)
router.get('/fase/:idFase',   getByFase)
router.get('/',               getAll)
router.post('/',              requirePlantScheduler, create)
router.post('/importar/preview', requirePlantScheduler, upload.single('archivo'), previsualizarImportar)
router.post('/importar',      requirePlantScheduler, upload.single('archivo'), importar)
router.put('/:id',            requirePlantScheduler, update)
router.patch('/:id/estado',   requirePlantScheduler, updateEstado)
router.patch('/:id/avance',   requirePlantScheduler, updateAvance)
router.delete('/:id',         requirePlantScheduler, remove)
export default router

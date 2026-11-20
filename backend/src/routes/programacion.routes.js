import { Router } from 'express'
import multer from 'multer'
import {
  getAll, getOcupados, getByFase, create, update, updateEstado, updateAvance, remove,
  getPlantilla, importar, previsualizarImportar, corregirTiempos, getCorrecciones,
} from '../controllers/programacion.controller.js'
import { requirePlantScheduler } from '../middlewares/requirePlantScheduler.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

const lectura  = requireModulo(['programacion', 'proyectos'])
const crear    = [requirePlantScheduler, requireAccion('programacion', 'crear')]
const editar   = [requirePlantScheduler, requireAccion('programacion', 'editar')]
const eliminar = [requirePlantScheduler, requireAccion('programacion', 'eliminar')]
// En la interfaz, cancelar un turno depende del permiso "eliminar"; el resto de
// cambios de estado (iniciar, completar, reprogramar) dependen de "editar".
const accionEstado = (req, res, next) =>
  requireAccion('programacion', req.body?.estado === 'cancelado' ? 'eliminar' : 'editar')(req, res, next)

const router = Router()
router.get('/ocupados',       lectura, getOcupados)
router.get('/plantilla',      crear, getPlantilla)
router.get('/fase/:idFase',   lectura, getByFase)
router.get('/',               lectura, getAll)
router.post('/',              crear, create)
router.post('/importar/preview', crear, upload.single('archivo'), previsualizarImportar)
router.post('/importar',      crear, upload.single('archivo'), importar)
router.put('/:id',            editar, update)
router.patch('/:id/estado',   requirePlantScheduler, accionEstado, updateEstado)
router.patch('/:id/avance',   editar, updateAvance)
router.patch('/:id/tiempos',  editar, corregirTiempos)
router.get('/:id/correcciones', lectura, getCorrecciones)
router.delete('/:id',         eliminar, remove)
export default router

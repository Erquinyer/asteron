import { Router } from 'express'
import multer from 'multer'
import { getAll, create, getArchivo, remove } from '../controllers/evidencias.controller.js'
import { requireModulo } from '../middlewares/requireModulo.js'
import { TAMANO_MAXIMO_MB } from '../utils/evidencias.js'

// En memoria: el controlador revisa la firma de la imagen antes de escribirla a disco.
// defParamCharset utf8: sin esto, un nombre como "soldadura_baño.jpg" llega con caracteres dañados.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024, files: 1 },
  defParamCharset: 'utf8',
})

// Los errores de multer se responden aquí: el manejador de app.js trae el mensaje
// de 2 MB de la importación de Programación.
const subirFoto = (req, res, next) => upload.single('foto')(req, res, (err) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: `La foto supera el tamaño máximo permitido (${TAMANO_MAXIMO_MB} MB)` })
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Envía una sola foto en el campo "foto"' })
  }
  next(err)
})

// El operario solo tiene acceso a Programación y también debe poder subir fotos de
// su actividad. El permiso fino (editar, autor, operario del turno) va en el controlador.
const lectura = requireModulo(['proyectos', 'programacion'])

const router = Router()
router.get('/',             lectura, getAll)
router.post('/',            lectura, subirFoto, create)
router.get('/:id/archivo',  lectura, getArchivo)
router.delete('/:id',       lectura, remove)
export default router

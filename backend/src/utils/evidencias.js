// Evidencia fotográfica (RF-25/RF-26): las fotos se guardan en disco y la base
// solo guarda el nombre del archivo (tabla evidencias_fotograficas).
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// backend/uploads/evidencias (en Docker: /app/uploads/evidencias, montado como volumen)
export const DIR_EVIDENCIAS = fileURLToPath(new URL('../../uploads/evidencias/', import.meta.url))
export const TAMANO_MAXIMO_MB = 5

// Reconoce la imagen por sus primeros bytes ("firma"), no por el tipo que declara
// el navegador: ese dato lo controla quien envía el archivo y se puede falsificar.
export const tipoImagen = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png'
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

// Borra los archivos del disco. El ON DELETE CASCADE de la base solo borra las filas,
// así que quien elimina una foto o un proyecto debe llamar esto después.
export const borrarArchivos = (archivos) => Promise.all(archivos.map(archivo =>
  unlink(path.join(DIR_EVIDENCIAS, archivo)).catch(err => {
    if (err.code !== 'ENOENT') console.error('[evidencias] No se pudo borrar', archivo, err)
  })))

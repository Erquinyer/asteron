// Migración para bases creadas antes de la bitácora de auditoría (RNF-22).
// Se puede ejecutar más de una vez: solo crea la tabla si no existe.
import pool from '../src/config/db.js'

const run = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS bitacora_auditoria (
  id_bitacora      INT          NOT NULL AUTO_INCREMENT,
  entidad          ENUM('usuario','maquinaria') NOT NULL,
  id_registro      INT          NOT NULL COMMENT 'Sin FK a propósito: el historial de un equipo eliminado debe seguir consultable',
  nombre_registro  VARCHAR(150) DEFAULT NULL COMMENT 'Nombre al momento del cambio, por si el registro se elimina',
  accion           ENUM('crear','editar','estado','contrasena','eliminar') NOT NULL,
  cambios          JSON         NOT NULL COMMENT '{ campo: { antes, despues } } — solo los campos que cambiaron',
  detalle          VARCHAR(255) DEFAULT NULL,
  id_autor         INT          DEFAULT NULL,
  fecha            DATETIME     NOT NULL,
  PRIMARY KEY (id_bitacora),
  KEY idx_bitacora_registro (entidad, id_registro),
  KEY idx_bitacora_fecha (fecha),
  CONSTRAINT fk_bitacora_autor FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla bitacora_auditoria creada / verificada')
  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

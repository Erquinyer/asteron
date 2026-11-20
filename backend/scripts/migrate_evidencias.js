// Migración para bases creadas antes de la evidencia fotográfica (RF-25/RF-26).
// Se puede ejecutar más de una vez: solo crea la tabla si no existe.
import pool from '../src/config/db.js'

const run = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS evidencias_fotograficas (
  id_evidencia      INT          NOT NULL AUTO_INCREMENT,
  id_proyecto       INT          NOT NULL,
  id_fase_proyecto  INT          DEFAULT NULL COMMENT 'Fase a la que corresponde la foto (opcional)',
  id_programacion   INT          DEFAULT NULL COMMENT 'Actividad/turno a la que corresponde la foto (opcional)',
  archivo           VARCHAR(255) NOT NULL     COMMENT 'Nombre generado en el servidor, no el original del usuario',
  nombre_original   VARCHAR(255) DEFAULT NULL,
  descripcion       VARCHAR(255) DEFAULT NULL,
  id_autor          INT          DEFAULT NULL,
  fecha             DATETIME     NOT NULL,
  PRIMARY KEY (id_evidencia),
  UNIQUE KEY uq_evidencia_archivo (archivo),
  KEY idx_evidencia_proyecto_fecha (id_proyecto, fecha),
  CONSTRAINT fk_evidencia_proyecto FOREIGN KEY (id_proyecto)      REFERENCES proyectos(id_proyecto)               ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_evidencia_fase     FOREIGN KEY (id_fase_proyecto) REFERENCES fases_proyecto(id_fase_proyecto)     ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_evidencia_prog     FOREIGN KEY (id_programacion)  REFERENCES programacion_planta(id_programacion) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_evidencia_autor    FOREIGN KEY (id_autor)         REFERENCES usuarios(id_usuario)                 ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla evidencias_fotograficas creada / verificada')
  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

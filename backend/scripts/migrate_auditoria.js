// Crea la tabla auditoria (RNF-22). Se puede correr varias veces.
import dotenv from 'dotenv'
dotenv.config()
import pool from '../src/config/db.js'

const run = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria INT          NOT NULL AUTO_INCREMENT,
    fecha        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario   INT          DEFAULT NULL COMMENT 'Quién hizo el cambio',
    rol          VARCHAR(80)  DEFAULT NULL COMMENT 'Rol que tenía al hacerlo',
    modulo       VARCHAR(30)  NOT NULL,
    accion       VARCHAR(30)  NOT NULL,
    id_registro  INT          DEFAULT NULL COMMENT 'Id del registro afectado',
    detalle      JSON         DEFAULT NULL COMMENT 'Datos enviados, sin contraseñas',
    ip           VARCHAR(45)  DEFAULT NULL,
    PRIMARY KEY (id_auditoria),
    KEY idx_auditoria_modulo_fecha (modulo, fecha),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla auditoria creada / verificada')
  await pool.end()
}

run().catch(e => { console.error(e); process.exit(1) })

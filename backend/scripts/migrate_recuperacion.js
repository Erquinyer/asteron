// Migración para bases creadas sin la tabla de recuperación de contraseña (RF-05).
// recovery.controller.js la usaba, pero ningún script la creaba: "Olvidé mi
// contraseña" respondía 500. Se puede ejecutar más de una vez.
import pool from '../src/config/db.js'

const run = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INT        NOT NULL AUTO_INCREMENT,
  id_usuario  INT        NOT NULL,
  token       CHAR(64)   NOT NULL COMMENT '32 bytes aleatorios en hexadecimal',
  expires_at  DATETIME   NOT NULL,
  usado       TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME   DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token),
  KEY idx_reset_usuario (id_usuario, usado),
  CONSTRAINT fk_reset_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla password_reset_tokens creada / verificada')
  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

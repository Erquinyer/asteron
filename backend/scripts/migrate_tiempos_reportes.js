// Migración para bases creadas antes de los módulos de tiempos y reportes.
// Se puede ejecutar más de una vez: solo agrega lo que falta.
import pool from '../src/config/db.js'

const columnaExiste = async (tabla, columna) => {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${tabla} LIKE ?`, [columna])
  return rows.length > 0
}

const run = async () => {
  if (!await columnaExiste('programacion_planta', 'hora_inicio')) {
    await pool.query(`ALTER TABLE programacion_planta
      ADD COLUMN hora_inicio DATETIME DEFAULT NULL COMMENT 'Se fija al iniciar la actividad' AFTER tiempo_real,
      ADD COLUMN hora_fin    DATETIME DEFAULT NULL COMMENT 'Se fija al completar o cancelar la actividad' AFTER hora_inicio`)
    // Las actividades existentes no guardaron sus horas: se estiman con updated_at,
    // que es el mismo dato que usaba el cronómetro de Programación.
    await pool.query(`UPDATE programacion_planta SET hora_inicio = updated_at WHERE estado = 'en_proceso'`)
    await pool.query(`UPDATE programacion_planta
      SET hora_fin = updated_at, hora_inicio = DATE_SUB(updated_at, INTERVAL tiempo_real MINUTE)
      WHERE estado = 'completado' AND tiempo_real IS NOT NULL`)
    console.log('✅ programacion_planta: hora_inicio y hora_fin')
  }

  if (!await columnaExiste('roles', 'valor_hora')) {
    await pool.query(`ALTER TABLE roles ADD COLUMN valor_hora DECIMAL(12,2) DEFAULT NULL
      COMMENT 'Valor hora del cargo en COP para el costo de mano de obra; NULL = sin definir' AFTER descripcion`)
    console.log('✅ roles: valor_hora')
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS correcciones_tiempo (
    id_correccion         INT      NOT NULL AUTO_INCREMENT,
    id_programacion       INT      NOT NULL,
    hora_inicio_anterior  DATETIME DEFAULT NULL,
    hora_fin_anterior     DATETIME DEFAULT NULL,
    tiempo_real_anterior  INT      DEFAULT NULL,
    hora_inicio_nueva     DATETIME NOT NULL,
    hora_fin_nueva        DATETIME NOT NULL,
    tiempo_real_nuevo     INT      NOT NULL,
    motivo                TEXT     NOT NULL,
    corregido_por         INT      DEFAULT NULL,
    corregido_en          DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_correccion),
    CONSTRAINT fk_correccion_prog    FOREIGN KEY (id_programacion) REFERENCES programacion_planta(id_programacion) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_correccion_usuario FOREIGN KEY (corregido_por)   REFERENCES usuarios(id_usuario)                  ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla correcciones_tiempo creada / verificada')

  // La interfaz siempre ofreció "Calibración", pero el ENUM no lo aceptaba y el registro fallaba.
  await pool.query(`ALTER TABLE mantenimientos
    MODIFY COLUMN tipo ENUM('preventivo','correctivo','predictivo','calibracion') NOT NULL`)

  if (!await columnaExiste('mantenimientos', 'estado')) {
    await pool.query(`ALTER TABLE mantenimientos
      ADD COLUMN estado ENUM('programado','realizado') NOT NULL DEFAULT 'realizado'
      COMMENT 'programado: fecha es la prevista; realizado: fecha es la de ejecución' AFTER realizado_por`)
    console.log('✅ mantenimientos: estado')
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS notificaciones_atendidas (
    id_usuario   INT         NOT NULL,
    clave        VARCHAR(60) NOT NULL,
    atendida_en  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, clave),
    CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
  console.log('✅ Tabla notificaciones_atendidas creada / verificada')

  await pool.query(`INSERT IGNORE INTO permisos (nombre, descripcion)
    VALUES ('reportes', 'Reportes de horas, costos, avance y mantenimientos')`)
  const conceder = (modulo, roles) => pool.query(
    `INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
     SELECT r.id_rol, p.id_permiso FROM roles r JOIN permisos p ON p.nombre = ?
     WHERE r.nombre IN (?)`, [modulo, roles])
  await conceder('reportes', ['Gerente General', 'Administrador Sistema', 'Coordinador de Producción', 'Coordinador de Planta'])
  // Consulta de avance en solo lectura para el área comercial (no se le dan acciones).
  await conceder('proyectos', ['Ejecutivo Comercial'])
  console.log('✅ Permisos: módulo reportes y proyectos en solo lectura para Ejecutivo Comercial')

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

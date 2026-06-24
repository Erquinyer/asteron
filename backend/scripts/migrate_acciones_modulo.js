import pool from '../src/config/db.js'

const DEFAULTS = [
  // Gerente General (1) — todo
  [1,'proyectos','crear'],[1,'proyectos','editar'],[1,'proyectos','eliminar'],
  [1,'pedidos','crear'],[1,'pedidos','editar'],[1,'pedidos','eliminar'],
  [1,'clientes','crear'],[1,'clientes','editar'],[1,'clientes','eliminar'],
  [1,'maquinaria','crear'],[1,'maquinaria','editar'],[1,'maquinaria','eliminar'],
  [1,'mantenimientos','crear'],[1,'mantenimientos','eliminar'],
  [1,'programacion','crear'],[1,'programacion','editar'],[1,'programacion','eliminar'],
  [1,'usuarios','crear'],[1,'usuarios','editar'],[1,'usuarios','eliminar'],

  // Consultor Estrategia (2) — solo lectura, sin acciones

  // Coordinador de Producción (3)
  [3,'proyectos','crear'],[3,'proyectos','editar'],[3,'proyectos','eliminar'],
  [3,'pedidos','crear'],[3,'pedidos','editar'],[3,'pedidos','eliminar'],
  [3,'programacion','crear'],[3,'programacion','editar'],[3,'programacion','eliminar'],

  // Coordinador de Planta (4)
  [4,'proyectos','editar'],
  [4,'maquinaria','crear'],[4,'maquinaria','editar'],[4,'maquinaria','eliminar'],
  [4,'mantenimientos','crear'],[4,'mantenimientos','eliminar'],
  [4,'programacion','crear'],[4,'programacion','editar'],[4,'programacion','eliminar'],

  // Ejecutivo Comercial (5)
  [5,'pedidos','crear'],[5,'pedidos','editar'],[5,'pedidos','eliminar'],
  [5,'clientes','crear'],[5,'clientes','editar'],[5,'clientes','eliminar'],

  // Jefe de Almacén (6)
  [6,'maquinaria','crear'],[6,'maquinaria','editar'],[6,'maquinaria','eliminar'],
  [6,'mantenimientos','crear'],[6,'mantenimientos','eliminar'],

  // Administrativo (7)
  [7,'pedidos','crear'],[7,'pedidos','editar'],[7,'pedidos','eliminar'],
  [7,'clientes','crear'],[7,'clientes','editar'],[7,'clientes','eliminar'],
  [7,'usuarios','crear'],[7,'usuarios','editar'],[7,'usuarios','eliminar'],

  // Operario (8) — solo puede iniciar/completar, sin crear/editar/eliminar

  // Administrador Sistema (9) — todo
  [9,'proyectos','crear'],[9,'proyectos','editar'],[9,'proyectos','eliminar'],
  [9,'pedidos','crear'],[9,'pedidos','editar'],[9,'pedidos','eliminar'],
  [9,'clientes','crear'],[9,'clientes','editar'],[9,'clientes','eliminar'],
  [9,'maquinaria','crear'],[9,'maquinaria','editar'],[9,'maquinaria','eliminar'],
  [9,'mantenimientos','crear'],[9,'mantenimientos','eliminar'],
  [9,'programacion','crear'],[9,'programacion','editar'],[9,'programacion','eliminar'],
  [9,'usuarios','crear'],[9,'usuarios','editar'],[9,'usuarios','eliminar'],
]

const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS acciones_modulo (
      id      INT NOT NULL AUTO_INCREMENT,
      id_rol  INT NOT NULL,
      modulo  VARCHAR(50) NOT NULL,
      accion  ENUM('crear','editar','eliminar') NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_rol_mod_acc (id_rol, modulo, accion),
      CONSTRAINT fk_am_rol FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `)
  console.log('✅ Tabla acciones_modulo creada / verificada')

  for (const [id_rol, modulo, accion] of DEFAULTS) {
    await pool.query(
      'INSERT IGNORE INTO acciones_modulo (id_rol, modulo, accion) VALUES (?,?,?)',
      [id_rol, modulo, accion])
  }
  console.log(`✅ ${DEFAULTS.length} acciones por defecto cargadas (INSERT IGNORE — no sobreescribe cambios existentes)`)

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })

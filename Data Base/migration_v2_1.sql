-- ============================================================
-- MIGRACIÓN v2.1 — Ejecutar si ya tienes la BD asteron instalada
-- Añade columnas faltantes en maquinaria y usuarios,
-- crea la vista v_maquinaria y siembra los permisos RBAC.
-- ============================================================

USE asteron;

-- 1. Columnas extra de maquinaria (agregadas originalmente via ALTER)
ALTER TABLE maquinaria
  ADD COLUMN IF NOT EXISTS codigo     VARCHAR(20)  DEFAULT NULL AFTER nombre,
  ADD COLUMN IF NOT EXISTS categoria  ENUM('maquinaria_pesada','equipo_mig','herramienta_electrica') DEFAULT 'maquinaria_pesada' AFTER codigo,
  ADD COLUMN IF NOT EXISTS marca      VARCHAR(80)  DEFAULT NULL AFTER categoria,
  ADD COLUMN IF NOT EXISTS referencia VARCHAR(80)  DEFAULT NULL AFTER marca,
  ADD COLUMN IF NOT EXISTS serial     VARCHAR(80)  DEFAULT NULL AFTER referencia,
  ADD COLUMN IF NOT EXISTS ubicacion  VARCHAR(100) DEFAULT NULL AFTER descripcion;

-- Ampliar el ENUM de estado de maquinaria
ALTER TABLE maquinaria
  MODIFY COLUMN estado ENUM('activa','inactiva','en_mantenimiento','sin_asignar','guardada','dado_de_baja') NOT NULL DEFAULT 'activa';

-- Índice único en codigo (si no existe)
ALTER TABLE maquinaria
  ADD UNIQUE KEY IF NOT EXISTS uq_maquina_codigo (codigo);

-- 2. Código numérico de empleado en usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS codigo_empleado VARCHAR(10) DEFAULT NULL AFTER id_usuario,
  ADD UNIQUE KEY IF NOT EXISTS uq_codigo_empleado (codigo_empleado);

-- 3. Vista de maquinaria para reportes
CREATE OR REPLACE VIEW v_maquinaria AS
  SELECT
    m.id_maquina, m.nombre, m.codigo, m.categoria,
    m.marca, m.referencia, m.serial, m.ubicacion,
    m.descripcion, m.estado,
    COUNT(mt.id_mantenimiento) AS total_mantenimientos,
    MAX(mt.fecha)              AS ultimo_mantenimiento
  FROM maquinaria m
  LEFT JOIN mantenimientos mt ON mt.id_maquina = m.id_maquina
  GROUP BY m.id_maquina;

-- 4. Permisos RBAC (solo inserta si no existen)
INSERT IGNORE INTO permisos (nombre, descripcion) VALUES
  ('dashboard',      'Acceso al panel principal con estadísticas'),
  ('proyectos',      'Gestión de proyectos y sus fases'),
  ('pedidos',        'Gestión de pedidos y detalle de pedido'),
  ('clientes',       'Gestión de clientes'),
  ('maquinaria',     'Gestión de inventario de maquinaria'),
  ('mantenimientos', 'Registro y consulta de mantenimientos'),
  ('programacion',   'Programación diaria de planta'),
  ('usuarios',       'Administración de usuarios del sistema');

-- Gerente General (id_rol = 1) — acceso total
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos;

-- Consultor Estrategia (2)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 2, id_permiso FROM permisos WHERE nombre IN ('dashboard','proyectos','pedidos','clientes');

-- Coordinador de Producción (3)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 3, id_permiso FROM permisos WHERE nombre IN ('dashboard','proyectos','pedidos','programacion');

-- Coordinador de Planta (4)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 4, id_permiso FROM permisos WHERE nombre IN ('dashboard','proyectos','maquinaria','mantenimientos','programacion');

-- Ejecutivo Comercial (5)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 5, id_permiso FROM permisos WHERE nombre IN ('dashboard','pedidos','clientes');

-- Jefe de Almacén (6)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 6, id_permiso FROM permisos WHERE nombre IN ('dashboard','maquinaria','mantenimientos');

-- Administrativo (7)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 7, id_permiso FROM permisos WHERE nombre IN ('dashboard','pedidos','clientes','usuarios');

-- Operario (8)
INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 8, id_permiso FROM permisos WHERE nombre IN ('dashboard','programacion');

-- 5. Fases de proyecto: id_fase_estandar e id_proyecto pasan a NOT NULL
--    (primero eliminar fases huérfanas sin estándar si existieran)
DELETE FROM fases_proyecto WHERE id_fase_estandar IS NULL OR id_proyecto IS NULL;
ALTER TABLE fases_proyecto
  MODIFY COLUMN id_proyecto      INT NOT NULL,
  MODIFY COLUMN id_fase_estandar INT NOT NULL;

-- 6. Para proyectos existentes sin fases, aplicar todas las fases estándar
INSERT INTO fases_proyecto (id_proyecto, id_fase_estandar, estado, porcentaje_avance)
  SELECT p.id_proyecto, fe.id_fase_estandar, 'pendiente', 0
  FROM proyectos p
  JOIN fases_estandar fe
  WHERE NOT EXISTS (
    SELECT 1 FROM fases_proyecto fp
    WHERE fp.id_proyecto = p.id_proyecto
  );

SELECT 'Migración v2.1 aplicada correctamente' AS resultado;

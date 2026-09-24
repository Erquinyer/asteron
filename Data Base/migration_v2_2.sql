-- ============================================================
-- MIGRACIÓN v2.2 — Ejecutar si ya tienes la BD asteron instalada
-- 1) Añade una relación saliente real en maquinaria (responsable/encargado).
-- 2) Normaliza las direcciones de clientes en una tabla propia
--    (dirección 1, dirección 2, ... en vez de un único campo de texto).
-- ============================================================

USE asteron;

-- ------------------------------------------------------------
-- 1. Maquinaria: encargado/responsable del equipo (FK a usuarios)
-- ------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asteron' AND TABLE_NAME = 'maquinaria' AND COLUMN_NAME = 'id_responsable'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE maquinaria ADD COLUMN id_responsable INT DEFAULT NULL AFTER estado',
  'SELECT ''maquinaria.id_responsable ya existe'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'asteron'
    AND TABLE_NAME = 'maquinaria'
    AND CONSTRAINT_NAME = 'fk_maquina_responsable'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE maquinaria ADD CONSTRAINT fk_maquina_responsable
     FOREIGN KEY (id_responsable) REFERENCES usuarios(id_usuario)
     ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_maquina_responsable ya existe'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2. Clientes: múltiples direcciones (Dirección 1, Dirección 2, ...)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direcciones_cliente (
  id_direccion INT          NOT NULL AUTO_INCREMENT,
  id_cliente   INT          NOT NULL,
  etiqueta     VARCHAR(40)  DEFAULT NULL COMMENT 'Ej: Dirección 1, Bodega, Sede principal',
  direccion    VARCHAR(255) NOT NULL,
  principal    TINYINT(1)   DEFAULT 0,
  PRIMARY KEY (id_direccion),
  CONSTRAINT fk_direccion_cliente FOREIGN KEY (id_cliente)
    REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migra el valor existente de clientes.direccion como "Dirección 1" / principal
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asteron' AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'direccion'
);

SET @sql := IF(@col_exists > 0,
  'INSERT INTO direcciones_cliente (id_cliente, etiqueta, direccion, principal)
     SELECT id_cliente, ''Dirección 1'', direccion, 1
     FROM clientes
     WHERE direccion IS NOT NULL AND direccion <> ''''
       AND id_cliente NOT IN (SELECT id_cliente FROM direcciones_cliente)',
  'SELECT ''clientes.direccion ya fue migrada'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@col_exists > 0,
  'ALTER TABLE clientes DROP COLUMN direccion',
  'SELECT ''clientes.direccion ya no existe'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migración v2.2 aplicada correctamente' AS resultado;

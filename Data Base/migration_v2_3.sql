-- ============================================================
-- MIGRACIÓN v2.3 — Ejecutar si ya tienes la BD asteron instalada
-- Ajusta el catálogo de fases_estandar al proceso real de producción:
-- 1) Agrega requiere_turno / categoria_equipo por fase (para que
--    Programación de planta sepa qué operario/equipo sugerir).
-- 2) Retira "Instalación de elementos" (no existe como paso real).
-- 3) Marca "Pintura y acabados" como control manual (la hace un tercero).
-- ============================================================

USE asteron;

-- ------------------------------------------------------------
-- 1. Columnas nuevas en fases_estandar
-- ------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asteron' AND TABLE_NAME = 'fases_estandar' AND COLUMN_NAME = 'requiere_turno'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE fases_estandar ADD COLUMN requiere_turno TINYINT(1) NOT NULL DEFAULT 1 AFTER orden',
  'SELECT ''fases_estandar.requiere_turno ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'asteron' AND TABLE_NAME = 'fases_estandar' AND COLUMN_NAME = 'categoria_equipo'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE fases_estandar ADD COLUMN categoria_equipo ENUM(''maquinaria_pesada'',''equipo_mig'',''herramienta_electrica'') DEFAULT NULL AFTER requiere_turno',
  'SELECT ''fases_estandar.categoria_equipo ya existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2. Retirar "Instalación de elementos" (sin turnos vinculados,
--    verificado antes de escribir esta migración)
-- ------------------------------------------------------------
DELETE fp FROM fases_proyecto fp
  JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
  WHERE fe.nombre = 'Instalación de elementos';

DELETE FROM fases_estandar WHERE nombre = 'Instalación de elementos';

-- Renumera orden 1-10 consecutivo (Ensamble final, Control de calidad y
-- Despacho e instalación quedan un lugar antes de lo que estaban)
UPDATE fases_estandar SET orden = 8  WHERE nombre = 'Ensamble final';
UPDATE fases_estandar SET orden = 9  WHERE nombre = 'Control de calidad';
UPDATE fases_estandar SET orden = 10 WHERE nombre = 'Despacho e instalación';

-- ------------------------------------------------------------
-- 3. requiere_turno / categoria_equipo por fase
-- ------------------------------------------------------------
UPDATE fases_estandar SET requiere_turno = 0, categoria_equipo = NULL
  WHERE nombre IN ('Diseño, render e ingeniería', 'Compra de materiales', 'Pintura y acabados');

UPDATE fases_estandar SET requiere_turno = 1, categoria_equipo = 'maquinaria_pesada'
  WHERE nombre IN ('Corte', 'Doblez y conformado');

UPDATE fases_estandar SET requiere_turno = 1, categoria_equipo = 'equipo_mig'
  WHERE nombre = 'Soldadura MIG';

UPDATE fases_estandar SET requiere_turno = 1, categoria_equipo = 'herramienta_electrica'
  WHERE nombre IN ('Lijado y preparación', 'Ensamble final');

UPDATE fases_estandar SET requiere_turno = 1, categoria_equipo = NULL
  WHERE nombre IN ('Control de calidad', 'Despacho e instalación');

SELECT 'Migración v2.3 aplicada correctamente' AS resultado;

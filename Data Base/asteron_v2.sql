-- ============================================================
-- BASE DE DATOS: asteron — versión 2.0 (esquema mejorado)
-- Generado: 2026-04-17
-- Cambios documentados al final del archivo
-- ============================================================

DROP DATABASE IF EXISTS asteron;
CREATE DATABASE asteron
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE asteron;

-- ============================================================
-- BLOQUE 1: CATÁLOGOS Y CONTROL DE ACCESO (RBAC)
-- ============================================================

CREATE TABLE roles (
  id_rol       INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla de permisos atómicos (RBAC completo)
CREATE TABLE permisos (
  id_permiso   INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL  COMMENT 'Ej: proyectos.crear, maquinaria.ver',
  descripcion  TEXT,
  PRIMARY KEY (id_permiso),
  UNIQUE KEY uq_permiso_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Pivote roles ↔ permisos
CREATE TABLE roles_permisos (
  id_rol      INT NOT NULL,
  id_permiso  INT NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  CONSTRAINT fk_rp_rol     FOREIGN KEY (id_rol)     REFERENCES roles(id_rol)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Fases estándar con campo de orden para secuencia lógica
CREATE TABLE fases_estandar (
  id_fase_estandar  INT          NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(120) NOT NULL,
  descripcion       TEXT,
  orden             TINYINT UNSIGNED DEFAULT 0  COMMENT 'Orden sugerido de ejecución',
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fase_estandar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 2: USUARIOS
-- ============================================================

CREATE TABLE usuarios (
  id_usuario       INT          NOT NULL AUTO_INCREMENT,
  codigo_empleado  VARCHAR(10)  DEFAULT NULL,
  nombre           VARCHAR(120) NOT NULL,
  correo           VARCHAR(255) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  id_rol           INT          DEFAULT NULL,
  estado           TINYINT(1)   DEFAULT 1,
  ultimo_login     DATETIME     DEFAULT NULL,
  created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_correo (correo),
  UNIQUE KEY uq_codigo_empleado (codigo_empleado),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 3: CLIENTES Y CONTACTOS
-- ============================================================

CREATE TABLE clientes (
  id_cliente      INT         NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(120) NOT NULL,
  nit             VARCHAR(20)  DEFAULT NULL,
  codigo_cliente  VARCHAR(20)  DEFAULT NULL,
  direccion       VARCHAR(255) DEFAULT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cliente),
  UNIQUE KEY uq_cliente_codigo (codigo_cliente),
  UNIQUE KEY uq_cliente_nit (nit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Resuelve 1FN: cada teléfono/correo en su propia fila
CREATE TABLE contactos_cliente (
  id_contacto  INT          NOT NULL AUTO_INCREMENT,
  id_cliente   INT          NOT NULL,
  tipo         ENUM('telefono','celular','correo','otro') NOT NULL,
  valor        VARCHAR(255) NOT NULL,
  principal    TINYINT(1)   DEFAULT 0  COMMENT '1 = contacto principal de ese tipo',
  PRIMARY KEY (id_contacto),
  CONSTRAINT fk_contacto_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 4: PEDIDOS
-- ============================================================

CREATE TABLE pedidos (
  id_pedido    INT          NOT NULL AUTO_INCREMENT,
  id_cliente   INT          DEFAULT NULL,
  fecha_pedido DATE         DEFAULT NULL,
  estado       ENUM('pendiente','en_proceso','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  descripcion  VARCHAR(255) DEFAULT NULL,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pedido),
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE detalle_pedido (
  id_detalle       INT          NOT NULL AUTO_INCREMENT,
  id_pedido        INT          DEFAULT NULL,
  producto         VARCHAR(120) DEFAULT NULL,
  cantidad         INT          DEFAULT NULL,
  punto_descargue  VARCHAR(150) DEFAULT NULL,
  estado           ENUM('pendiente','en_produccion','listo','entregado') NOT NULL DEFAULT 'pendiente',
  PRIMARY KEY (id_detalle),
  CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 5: MAQUINARIA Y MANTENIMIENTOS
-- ============================================================

CREATE TABLE maquinaria (
  id_maquina   INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(120) NOT NULL,
  codigo       VARCHAR(20)  DEFAULT NULL,
  categoria    ENUM('maquinaria_pesada','equipo_mig','herramienta_electrica') DEFAULT 'maquinaria_pesada',
  marca        VARCHAR(80)  DEFAULT NULL,
  referencia   VARCHAR(80)  DEFAULT NULL,
  serial       VARCHAR(80)  DEFAULT NULL,
  descripcion  VARCHAR(255) DEFAULT NULL,
  ubicacion    VARCHAR(100) DEFAULT NULL,
  estado       ENUM('activa','inactiva','en_mantenimiento','sin_asignar','guardada','dado_de_baja') NOT NULL DEFAULT 'activa',
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_maquina),
  UNIQUE KEY uq_maquina_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE mantenimientos (
  id_mantenimiento  INT  NOT NULL AUTO_INCREMENT,
  id_maquina        INT  NOT NULL,
  fecha             DATE NOT NULL,
  tipo              ENUM('preventivo','correctivo','predictivo') NOT NULL,
  descripcion       TEXT,
  realizado_por     INT  DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_mantenimiento),
  -- Cambiado de CASCADE a RESTRICT: no se puede eliminar una máquina con historial
  CONSTRAINT fk_mantenimiento_maquina  FOREIGN KEY (id_maquina)    REFERENCES maquinaria(id_maquina) ON DELETE RESTRICT  ON UPDATE CASCADE,
  CONSTRAINT fk_mantenimiento_usuario  FOREIGN KEY (realizado_por) REFERENCES usuarios(id_usuario)   ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 6: PROYECTOS
-- ============================================================

-- id_cliente eliminado: se deriva siempre desde pedidos.id_cliente
CREATE TABLE proyectos (
  id_proyecto             INT          NOT NULL AUTO_INCREMENT,
  nombre                  VARCHAR(255) NOT NULL,
  objetivo                VARCHAR(255) DEFAULT NULL,
  fecha_inicio            DATE         DEFAULT NULL,
  fecha_fin_estimada      DATE         DEFAULT NULL,
  id_usuario_responsable  INT          DEFAULT NULL,
  id_pedido               INT          DEFAULT NULL,
  prioridad               ENUM('alta','media','baja') NOT NULL DEFAULT 'media',
  created_at              DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by              INT          DEFAULT NULL  COMMENT 'Usuario que creó el proyecto',
  PRIMARY KEY (id_proyecto),
  CONSTRAINT fk_proyecto_responsable FOREIGN KEY (id_usuario_responsable) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_proyecto_pedido      FOREIGN KEY (id_pedido)               REFERENCES pedidos(id_pedido)  ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_proyecto_creado_por  FOREIGN KEY (created_by)              REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 7: FASES DE PROYECTO E HISTORIAL
-- ============================================================

CREATE TABLE fases_proyecto (
  id_fase_proyecto  INT           NOT NULL AUTO_INCREMENT,
  id_proyecto       INT           DEFAULT NULL,
  id_fase_estandar  INT           DEFAULT NULL,
  fecha_inicio      DATE          DEFAULT NULL,
  fecha_fin         DATE          DEFAULT NULL,
  estado            ENUM('pendiente','en_curso','completada','bloqueada') NOT NULL DEFAULT 'pendiente',
  porcentaje_avance TINYINT UNSIGNED DEFAULT 0,
  created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fase_proyecto),
  CONSTRAINT chk_porcentaje  CHECK (porcentaje_avance BETWEEN 0 AND 100),
  CONSTRAINT fk_fase_proyecto  FOREIGN KEY (id_proyecto)      REFERENCES proyectos(id_proyecto)              ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_fase_estandar  FOREIGN KEY (id_fase_estandar) REFERENCES fases_estandar(id_fase_estandar)    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Trazabilidad: registra cada cambio de estado en una fase
CREATE TABLE historial_fases (
  id_historial      INT          NOT NULL AUTO_INCREMENT,
  id_fase_proyecto  INT          NOT NULL,
  estado_anterior   VARCHAR(50)  DEFAULT NULL,
  estado_nuevo      VARCHAR(50)  NOT NULL,
  porcentaje        TINYINT UNSIGNED DEFAULT 0,
  cambiado_por      INT          DEFAULT NULL,
  cambiado_en       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  observacion       TEXT,
  PRIMARY KEY (id_historial),
  CONSTRAINT fk_historial_fase    FOREIGN KEY (id_fase_proyecto) REFERENCES fases_proyecto(id_fase_proyecto) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_historial_usuario FOREIGN KEY (cambiado_por)     REFERENCES usuarios(id_usuario)             ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 8: ACTIVIDADES (time-tracking)
-- ============================================================

CREATE TABLE actividades (
  id_actividad  INT      NOT NULL AUTO_INCREMENT,
  id_usuario    INT      DEFAULT NULL,
  id_fase       INT      NOT NULL,
  hora_inicio   DATETIME NOT NULL,
  hora_fin      DATETIME DEFAULT NULL,
  observacion   TEXT,
  -- duracion_minutos eliminado: campo derivado (TIMESTAMPDIFF(MINUTE, hora_inicio, hora_fin))
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_actividad),
  CONSTRAINT chk_actividad_horas CHECK (hora_fin IS NULL OR hora_fin >= hora_inicio),
  -- FK correctamente declarada (faltaba en v1)
  CONSTRAINT fk_actividad_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)              ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_actividad_fase    FOREIGN KEY (id_fase)    REFERENCES fases_proyecto(id_fase_proyecto)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 9: PROGRAMACIÓN DE PLANTA
-- ============================================================

CREATE TABLE programacion_planta (
  id_programacion   INT  NOT NULL AUTO_INCREMENT,
  fecha             DATE NOT NULL,
  id_operario       INT  DEFAULT NULL,
  id_maquina        INT  DEFAULT NULL,
  id_proyecto       INT  DEFAULT NULL,
  id_fase_proyecto  INT  DEFAULT NULL  COMMENT 'Fase del proyecto en ejecución en esta programación',
  tiempo_estimado   INT  DEFAULT NULL  COMMENT 'En minutos',
  tiempo_real       INT  DEFAULT NULL  COMMENT 'En minutos',
  estado            ENUM('programado','en_proceso','completado','cancelado') NOT NULL DEFAULT 'programado',
  observaciones     TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_programacion),
  -- Índice compuesto para consultas de disponibilidad de máquina por fecha
  KEY idx_fecha_maquina (fecha, id_maquina),
  CONSTRAINT fk_prog_operario     FOREIGN KEY (id_operario)      REFERENCES usuarios(id_usuario)              ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_prog_maquina      FOREIGN KEY (id_maquina)       REFERENCES maquinaria(id_maquina)            ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_prog_proyecto     FOREIGN KEY (id_proyecto)      REFERENCES proyectos(id_proyecto)            ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_prog_fase         FOREIGN KEY (id_fase_proyecto) REFERENCES fases_proyecto(id_fase_proyecto)  ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- BLOQUE 10: VISTA DE MAQUINARIA (para reportes y listados)
-- ============================================================

CREATE OR REPLACE VIEW v_maquinaria AS
  SELECT
    m.id_maquina,
    m.nombre,
    m.codigo,
    m.categoria,
    m.marca,
    m.referencia,
    m.serial,
    m.ubicacion,
    m.descripcion,
    m.estado,
    COUNT(mt.id_mantenimiento) AS total_mantenimientos,
    MAX(mt.fecha)              AS ultimo_mantenimiento
  FROM maquinaria m
  LEFT JOIN mantenimientos mt ON mt.id_maquina = m.id_maquina
  GROUP BY m.id_maquina;

-- ============================================================
-- FIN DEL ESQUEMA
-- Los datos iniciales (roles, permisos, usuarios, etc.)
-- se cargan ejecutando: node backend/scripts/seed.js
-- ============================================================

// Catálogos que el sistema necesita para funcionar: roles de Macromet, módulos
// (permisos), qué módulos ve cada rol y las fases estándar del proceso.
// Los usan seed.js (datos de prueba) e inicializar.js (producción, sin datos de
// prueba), así los dos cargan exactamente lo mismo.
//
// Los id son fijos: accionesPorDefecto.js y el código identifican algunos roles por
// su id. INSERT IGNORE hace que cargar dos veces no duplique ni pise cambios.
import { cargarAccionesPorDefecto } from './accionesPorDefecto.js'

export const ROLES = [
  [1, 'Gerente General',           'Dirección estratégica de la empresa'],
  [2, 'Consultor Estrategia',      'Consultoría en estrategia y negocios'],
  [3, 'Coordinador de Producción', 'Planificación y coordinación del proceso productivo'],
  [4, 'Coordinador de Planta',     'Supervisión directa de planta y equipos'],
  [5, 'Ejecutivo Comercial',       'Gestión de clientes, cotizaciones y pedidos'],
  [6, 'Jefe de Almacén',           'Control de inventarios y materiales'],
  [7, 'Administrativo',            'Gestión contable y administrativa'],
  [8, 'Operario',                  'Ejecución de tareas en planta'],
  [9, 'Administrador Sistema',     'Administrador del sistema con acceso total y gestión de permisos'],
]
export const ID_ADMINISTRADOR_SISTEMA = 9

export const PERMISOS = [
  [1, 'dashboard',      'Acceso al panel principal con estadísticas'],
  [2, 'proyectos',      'Gestión de proyectos y sus fases'],
  [3, 'pedidos',        'Gestión de pedidos y detalle de pedido'],
  [4, 'clientes',       'Gestión de clientes'],
  [5, 'maquinaria',     'Gestión de inventario de maquinaria'],
  [6, 'mantenimientos', 'Registro y consulta de mantenimientos'],
  [7, 'programacion',   'Programación diaria de planta'],
  [8, 'usuarios',       'Administración de usuarios del sistema'],
  [9, 'reportes',       'Reportes de horas, costos, avance y mantenimientos'],
]

const TODOS = PERMISOS.map(([, nombre]) => nombre)
// Módulos que ve cada rol (las acciones crear/editar/eliminar están en accionesPorDefecto.js)
export const MODULOS_POR_ROL = {
  1: TODOS,                                                                    // Gerente General
  2: ['dashboard', 'proyectos', 'pedidos', 'clientes'],                        // Consultor Estrategia
  3: ['dashboard', 'proyectos', 'pedidos', 'programacion', 'reportes'],        // Coordinador de Producción
  4: ['dashboard', 'proyectos', 'maquinaria', 'mantenimientos', 'programacion', 'reportes'], // Coordinador de Planta
  5: ['dashboard', 'proyectos', 'pedidos', 'clientes'],                        // Ejecutivo Comercial (proyectos en solo lectura)
  6: ['dashboard', 'maquinaria', 'mantenimientos'],                            // Jefe de Almacén
  7: ['dashboard', 'pedidos', 'clientes', 'usuarios'],                         // Administrativo
  8: ['dashboard', 'programacion'],                                            // Operario
  9: TODOS,                                                                    // Administrador Sistema
}

// Fase 1 (Diseño) y fase 2 (Compra) son "fases únicas": una sola por proyecto,
// asignadas a una persona por rol (resolveUsuarioPorRol), sin turno ni máquina.
// De la 3 en adelante, cada fase se repite una vez por ítem del pedido.
// requiere_turno=0: control manual, nunca recibe turnos de Programación (Pintura y
// acabados la hace un tercero). categoria_equipo: categoría de maquinaria que aplica
// a la fase; NULL cuando no hay equipo obligatorio.
export const FASES_ESTANDAR = [
  [1,  'Diseño, render e ingeniería', 'Diseño 3D, renderizado, aprobación por el cliente, planos técnicos y despiece', 0, null],
  [2,  'Compra de materiales',   'Adquisición de lámina, tubería, platina y demás insumos', 0, null],
  [3,  'Corte',                  'Tronzado, cizallado y corte de piezas según planos', 1, 'maquinaria_pesada'],
  [4,  'Doblez y conformado',    'Doblado de lámina y tubo según geometría del diseño', 1, 'maquinaria_pesada'],
  [5,  'Soldadura MIG',          'Unión de componentes metálicos en puestos de soldadura', 1, 'equipo_mig'],
  [6,  'Lijado y preparación',   'Esmerilado, lijado y preparación de superficies', 1, 'herramienta_electrica'],
  [7,  'Pintura y acabados',     'Pintura electrostática, anodizado o acabado final — la realiza un tercero', 0, null],
  [8,  'Ensamble final',         'Ensamble y ajuste de todos los componentes del exhibidor', 1, 'herramienta_electrica'],
  [9,  'Control de calidad',     'Revisión dimensional, visual y funcional del producto', 1, null],
  [10, 'Despacho e instalación', 'Empaque, transporte e instalación en el punto de venta', 1, null],
]

export const cargarRoles = (pool) =>
  pool.query('INSERT IGNORE INTO roles (id_rol, nombre, descripcion) VALUES ?', [ROLES])

// Permisos por módulo y acciones por defecto de cada rol
export const cargarPermisos = async (pool) => {
  await pool.query('INSERT IGNORE INTO permisos (id_permiso, nombre, descripcion) VALUES ?', [PERMISOS])
  const idPermiso = Object.fromEntries(PERMISOS.map(([id, nombre]) => [nombre, id]))
  const filas = Object.entries(MODULOS_POR_ROL)
    .flatMap(([idRol, modulos]) => modulos.map(m => [Number(idRol), idPermiso[m]]))
  await pool.query('INSERT IGNORE INTO roles_permisos (id_rol, id_permiso) VALUES ?', [filas])
  await cargarAccionesPorDefecto(pool)
}

export const cargarFasesEstandar = (pool) =>
  pool.query(
    `INSERT IGNORE INTO fases_estandar (id_fase_estandar, nombre, descripcion, requiere_turno, categoria_equipo, orden)
     VALUES ?`,
    [FASES_ESTANDAR.map(([id, nombre, descripcion, requiereTurno, categoria]) =>
      [id, nombre, descripcion, requiereTurno, categoria, id])])

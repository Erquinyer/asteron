import dotenv from 'dotenv'
dotenv.config()
import bcrypt from 'bcryptjs'
import pool from '../src/config/db.js'

const seed = async () => {
  console.log('🌱 Sembrando datos reales de Macromet...\n')

  // ── ROLES reales de Macromet ─────────────────────
  await pool.query(`DELETE FROM roles`)
  await pool.query(`ALTER TABLE roles AUTO_INCREMENT = 1`)
  await pool.query(`INSERT INTO roles (nombre, descripcion) VALUES
    ('Gerente General',            'Dirección estratégica de la empresa'),
    ('Consultor Estrategia',       'Consultoría en estrategia y negocios'),
    ('Coordinador de Producción',  'Planificación y coordinación del proceso productivo'),
    ('Coordinador de Planta',      'Supervisión directa de planta y equipos'),
    ('Ejecutivo Comercial',        'Gestión de clientes, cotizaciones y pedidos'),
    ('Jefe de Almacén',            'Control de inventarios y materiales'),
    ('Administrativo',             'Gestión contable y administrativa'),
    ('Operario',                   'Ejecución de tareas en planta')`)
  console.log('✅ Roles (8 roles reales de Macromet)')

  // ── USUARIOS reales de Macromet ───────────────────
  const hashAdmin = await bcrypt.hash('macromet2026', 10)
  const hashUser  = await bcrypt.hash('operario2026', 10)

  await pool.query(`DELETE FROM usuarios`)
  await pool.query(`ALTER TABLE usuarios AUTO_INCREMENT = 1`)
  await pool.query(`
    INSERT INTO usuarios (codigo_empleado, nombre, correo, password_hash, id_rol, estado) VALUES
    ('EMP-001', 'Alejandro Acuña',    'alejandro@macromet.com.co', ?, 1, 1),
    ('EMP-002', 'Felipe Acuña',       'felipe@macromet.com.co',    ?, 2, 1),
    ('EMP-003', 'Angie Abril',        'angie@macromet.com.co',     ?, 3, 1),
    ('EMP-004', 'Martín Forero',      'martin@macromet.com.co',    ?, 4, 1),
    ('EMP-005', 'Diego Triana',       'diego.t@macromet.com.co',   ?, 5, 1),
    ('EMP-006', 'Diego Acosta',       'diego.a@macromet.com.co',   ?, 6, 1),
    ('EMP-007', 'Cristina Barreto',   'cristina@macromet.com.co',  ?, 7, 1),
    ('EMP-008', 'Tatiana Acosta',     'tatiana@macromet.com.co',   ?, 7, 1),
    ('EMP-009', 'Soldador 1',         'soldador1@macromet.com.co', ?, 8, 1),
    ('EMP-010', 'Soldador 2',         'soldador2@macromet.com.co', ?, 8, 1),
    ('EMP-011', 'Soldador 3',         'soldador3@macromet.com.co', ?, 8, 1),
    ('EMP-012', 'Ayudante de Planta', 'ayudante@macromet.com.co',  ?, 8, 1)`,
    [hashAdmin, hashAdmin, hashUser, hashUser, hashUser,
     hashUser, hashUser, hashUser, hashUser, hashUser, hashUser, hashUser])

  const [users] = await pool.query('SELECT id_usuario, nombre, correo FROM usuarios')
  const uid = Object.fromEntries(users.map(u => [u.correo, u.id_usuario]))
  console.log('✅ Usuarios (12 personas reales del equipo Macromet)')

  // ── CLIENTES reales ────────────────────────────────
  await pool.query(`DELETE FROM contactos_cliente`)
  await pool.query(`DELETE FROM clientes`)
  await pool.query(`ALTER TABLE clientes AUTO_INCREMENT = 1`)
  await pool.query(`INSERT INTO clientes (nombre, nit, codigo_cliente, direccion) VALUES
    ('Castrol Colombia',         '900112233-1', 'CLI-001', 'Bogotá, Colombia'),
    ('Bosch Colombia',           '800223344-2', 'CLI-002', 'Bogotá, Colombia'),
    ('Alpina Productos Alimenticios','900334455-3','CLI-003','Sopó, Cundinamarca'),
    ('Juan Valdez Café',         '860034313-4', 'CLI-004', 'Bogotá, Colombia'),
    ('LEGO Colombia',            '900556677-5', 'CLI-005', 'Bogotá, Colombia'),
    ('Papa John''s Colombia',    '900667788-6', 'CLI-006', 'Bogotá, Colombia'),
    ('Makita Colombia',          '900778899-7', 'CLI-007', 'Bogotá, Colombia'),
    ('3M Colombia',              '860051234-8', 'CLI-008', 'Bogotá, Colombia')`)
  console.log('✅ Clientes (marcas reales de Macromet)')

  // ── PEDIDOS ────────────────────────────────────────
  await pool.query(`DELETE FROM detalle_pedido`)
  await pool.query(`DELETE FROM pedidos`)
  await pool.query(`ALTER TABLE pedidos AUTO_INCREMENT = 1`)
  await pool.query(`INSERT INTO pedidos (id_cliente, fecha_pedido, estado, descripcion) VALUES
    (1, '2026-01-08', 'en_proceso', 'Exhibidor de aceites lubricantes para talleres automotrices'),
    (2, '2026-01-15', 'en_proceso', 'Display para herramientas eléctricas Bosch - cadena Homecenter'),
    (3, '2026-02-03', 'pendiente',  'Nevera de exhibición para productos lácteos - tiendas de barrio'),
    (4, '2025-12-10', 'entregado',  'Módulo de exhibición Juan Valdez para aeropuerto El Dorado'),
    (5, '2026-02-20', 'en_proceso', 'Stand de exhibición LEGO para centro comercial')`)
  await pool.query(`INSERT INTO detalle_pedido (id_pedido, producto, cantidad, punto_descargue, estado) VALUES
    (1, 'Exhibidor metálico aceites Castrol',   12, 'Talleres Bogotá Norte', 'en_produccion'),
    (1, 'Base para garrafas 4L',                12, 'Talleres Bogotá Norte', 'pendiente'),
    (2, 'Display pared Bosch Power Tools',       5, 'Homecenter Calle 80',   'en_produccion'),
    (2, 'Gancho porta-taladro con seguro',       80,'Homecenter Calle 80',   'pendiente'),
    (3, 'Módulo frío exhibición lácteos',         3, 'Supermercados piloto', 'pendiente'),
    (4, 'Módulo café isla aeropuerto',            1, 'El Dorado - Puerta 12','listo'),
    (5, 'Stand interactivo LEGO modular',         2, 'C.C. Santafé - Piso 2','en_produccion')`)
  console.log('✅ Pedidos y detalles (proyectos reales Macromet)')

  // ── FASES ESTÁNDAR adaptadas a Macromet ───────────
  await pool.query(`DELETE FROM fases_estandar`)
  await pool.query(`ALTER TABLE fases_estandar AUTO_INCREMENT = 1`)
  await pool.query(`INSERT INTO fases_estandar (nombre, descripcion, orden) VALUES
    ('Diseño y render',          'Diseño 3D, renderizado y aprobación por el cliente',             1),
    ('Ingeniería y planos',      'Planos técnicos, despiece y especificaciones de fabricación',    2),
    ('Compra de materiales',     'Adquisición de lámina, tubería, platina y demás insumos',       3),
    ('Corte',                    'Tronzado, cizallado y corte de piezas según planos',             4),
    ('Doblez y conformado',      'Doblado de lámina y tubo según geometría del diseño',           5),
    ('Soldadura MIG',            'Unión de componentes metálicos en puestos de soldadura',        6),
    ('Lijado y preparación',     'Esmerilado, lijado y preparación de superficies',               7),
    ('Pintura y acabados',       'Pintura electrostática, anodizado o acabado final',             8),
    ('Instalación de elementos', 'Montaje de acrílico, viniles, branding e iluminación',          9),
    ('Ensamble final',           'Ensamble y ajuste de todos los componentes del exhibidor',     10),
    ('Control de calidad',       'Revisión dimensional, visual y funcional del producto',        11),
    ('Despacho e instalación',   'Empaque, transporte e instalación en el punto de venta',       12)`)
  console.log('✅ Fases estándar (adaptadas al proceso real de Macromet)')

  // ── MAQUINARIA REAL del inventario ────────────────
  await pool.query(`DELETE FROM mantenimientos`)
  await pool.query(`DELETE FROM maquinaria`)
  await pool.query(`ALTER TABLE maquinaria AUTO_INCREMENT = 1`)

  // Maquinaria pesada (hoja MAQUINARIA)
  await pool.query(`INSERT INTO maquinaria
    (nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado) VALUES
    ('Tronzadora',                  'TZ-01', 'maquinaria_pesada', 'WINWORK',  NULL,      NULL,         'Tronzadora 14" para corte de perfilería',        'PLANTA',   'activa'),
    ('Tronzadora',                  'TZ-02', 'maquinaria_pesada', 'WINWORK',  NULL,      NULL,         'Tronzadora 14" para corte de perfilería',        'PLANTA',   'activa'),
    ('Tronzadora',                  'TZ-03', 'maquinaria_pesada', 'ELITE',    NULL,      NULL,         'Tronzadora 14" - en almacén',                   'ALMACÉN',  'guardada'),
    ('Soldador de Punto',           'SP-01', 'maquinaria_pesada', 'CEAWELD',  'NKPL 48', 'PN301002',   'Soldador de punto para uniones de lámina',       'PLANTA',   'activa'),
    ('Dobladora Manual Lámina',     'DL-01', 'maquinaria_pesada', 'NIAGRA',   'U-250P',  'NA',         'Dobladora manual de lámina 2.50m',               'PLANTA',   'activa'),
    ('Cizalla Manual Lámina',       'CZ-01', 'maquinaria_pesada', 'NIAGRA',   NULL,      NULL,         'Cizalla manual para corte de lámina',            'PLANTA',   'activa'),
    ('Roladora Manual Lámina',      'RM-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Roladora manual para curvado de lámina',         'PLANTA',   'activa'),
    ('Dobladora Manual Tubo',       'DT-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Dobladora manual para tubería',                  'PLANTA',   'activa'),
    ('Taladro de Árbol',            'TA-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Taladro de árbol para perforación de piezas',    'PLANTA',   'activa'),
    ('Taladro de Banco',            'TB-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Taladro de banco para piezas pequeñas',          'PLANTA',   'activa'),
    ('Taladro de Árbol',            'TA-02', 'maquinaria_pesada', 'DELTA',    NULL,      NULL,         'Taladro de árbol - requiere revisión',           'PLANTA',   'en_mantenimiento'),
    ('Cizalla Varilla y Platina',   'CV-01', 'maquinaria_pesada', 'NIAGRA',   'CMF-16',  NULL,         'Cizalla para corte de varilla y platina',        'PLANTA',   'activa'),
    ('Compresor Bifásico',          'CB-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Compresor bifásico para pintura y herramientas', 'PLANTA',   'activa'),
    ('Ojaladora Manual',            'OJ-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Ojaladora manual - guardada para venta',         'ALMACÉN',  'guardada'),
    ('Ojaladora Manual',            'OJ-02', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Ojaladora manual - guardada para venta',         'ALMACÉN',  'guardada'),
    ('Esmeril 1',                   'ES-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Esmeril de banco para afilado y desbaste',       'PLANTA',   'activa'),
    ('Esmeril 2',                   'ES-02', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Esmeril frente a mesa de lámina',                'PLANTA',   'activa'),
    ('Prensa',                      'PR-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Prensa hidráulica de banco',                     'PLANTA',   'activa'),
    ('Torno 1',                     'TN-01', 'maquinaria_pesada', NULL,       NULL,      NULL,         'Torno mecánico para piezas cilíndricas',         'PLANTA',   'activa'),
    ('Torno 2',                     'TN-02', 'maquinaria_pesada', NULL,       'MECÁNICO',NULL,         'Torno mecánico auxiliar',                        'PLANTA',   'activa')`)

  // Equipos MIG (hoja EQUIPOS MIG)
  await pool.query(`INSERT INTO maquinaria
    (nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado) VALUES
    ('Equipo MIG',  'EM-01', 'equipo_mig', 'ÉLITE',      'SI8250MG',          NULL,          'Equipo MIG azul — Puesto 1',   'PUESTO 1', 'activa'),
    ('Equipo MIG',  'EM-02', 'equipo_mig', 'CEBORA',     'Jaguar 203',        '584-190A235B','Equipo MIG rojo — Puesto 2',   'PUESTO 2', 'activa'),
    ('Equipo MIG',  'EM-03', 'equipo_mig', 'ESAB',       'Smashweld 257',     'F1002540',    'Equipo MIG amarillo — Puesto 3','PUESTO 3', 'sin_asignar'),
    ('Equipo MIG',  'EM-04', 'equipo_mig', 'FIREPOWER',  'Welding System 260','500015F07',   'Equipo MIG rojo — Puesto 4',   'PUESTO 4', 'sin_asignar'),
    ('Equipo MIG',  'EM-05', 'equipo_mig', 'HOBART',     'Iron Man 250',      'LG0317754',   'Equipo MIG blanco — sin rueda','PLANTA',   'sin_asignar'),
    ('Equipo MIG',  'EM-06', 'equipo_mig', 'ESAB',       'Smashweld 252',     'F0419109',    'Equipo MIG amarillo — sin asignar','PLANTA','sin_asignar'),
    ('Equipo MIG',  'EM-06b','equipo_mig', 'THERMADYNE', 'FP-260',            NULL,          'DADO DE BAJA — equipo robado', 'N/A',      'dado_de_baja')`)

  // Herramienta eléctrica principal
  await pool.query(`INSERT INTO maquinaria
    (nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado) VALUES
    ('Taladro',               'TL-01','herramienta_electrica','MILWAUKEE',  'KIERO',       'C50AD15231505','120W color rojo','PLANTA','activa'),
    ('Taladro Pequeño',       'TL-03','herramienta_electrica','MAKITA',     '6413',        '909404K',      '120W color azul','PLANTA','activa'),
    ('Taladro Pequeño',       'TL-04','herramienta_electrica','MAKITA',     '6413',        '909485K',      '120W color azul','PLANTA','activa'),
    ('Taladro Inalámbrico',   'TL-05','herramienta_electrica','DEWALT',     'DCD778',      '26235',        '20V MAX','PLANTA','activa'),
    ('Atornillador de Impacto','TL-06','herramienta_electrica','DEWALT',    'DCF887',      '55626',        '20V MAX XR','PLANTA','activa'),
    ('Atornillador',          'TL-07','herramienta_electrica','BAUKER',     NULL,          NULL,           'Requiere cargador','PLANTA','en_mantenimiento'),
    ('Taladro Inalámbrico',   'TL-08','herramienta_electrica','BOSCH',      'GSB 120-LI',  '26235',        '12V percutor','PLANTA','activa'),
    ('Atornillador',          'TL-09','herramienta_electrica','BOSCH',      'GDR 120-LI',  '26235',        '12V','PLANTA','activa'),
    ('Motortool',             'MT-01','herramienta_electrica','DREMEL',     '3000-1',      'F013300PF',    'Motortool pequeño','PLANTA','activa'),
    ('Motortool',             'MT-02','herramienta_electrica','MAKITA',     'GD0600',      '10.10061522',  '120W','PLANTA','activa'),
    ('Lijadora Orbital',      'LO-01','herramienta_electrica','BOSCH',      'GSS 140 A',   '690000550',    'Color azul','PLANTA','activa'),
    ('Lijadora Orbital',      'LO-02','herramienta_electrica','BOSCH',      'GSS 140',     '127004235',    'Color azul','PLANTA','activa'),
    ('Lijadora Orbital',      'LO-03','herramienta_electrica','DEWALT',     '230W 2.4A',   '127004235',    'Color amarillo','PLANTA','activa')`)

  console.log('✅ Maquinaria real (40 equipos del inventario Macromet)')

  // ── PROYECTOS reales de Macromet ──────────────────
  await pool.query(`DELETE FROM actividades`)
  await pool.query(`DELETE FROM fases_proyecto`)
  await pool.query(`DELETE FROM programacion_planta`)
  await pool.query(`DELETE FROM proyectos`)
  await pool.query(`ALTER TABLE proyectos AUTO_INCREMENT = 1`)

  const coord_prod = uid['angie@macromet.com.co']
  const coord_planta = uid['martin@macromet.com.co']
  const admin = uid['alejandro@macromet.com.co']

  await pool.query(`INSERT INTO proyectos
    (nombre, objetivo, fecha_inicio, fecha_fin_estimada, id_usuario_responsable, id_pedido, prioridad, created_by) VALUES
    ('Exhibidor Aceites Castrol',      'Fabricar 12 exhibidores metálicos para talleres',              '2026-01-10','2026-03-15',?,1,'alta', ?),
    ('Display Herramientas Bosch',     'Display de pared para herramientas eléctricas Homecenter',    '2026-01-20','2026-04-01',?,2,'alta', ?),
    ('Módulo Exhibición Alpina',       'Nevera exhibidora para productos lácteos - tiendas de barrio','2026-02-05','2026-05-30',?,3,'media',?),
    ('Módulo Café Juan Valdez',        'Módulo isla para punto de venta en aeropuerto',               '2025-11-20','2026-01-30',?,4,'alta', ?),
    ('Stand Interactivo LEGO',         'Stand modular con zonas interactivas para centro comercial',  '2026-02-22','2026-05-15',?,5,'media',?),
    ('Exhibidor Multiproducto Makita', 'Exhibidor de pared para herramientas Makita en ferreterías',  '2026-03-01','2026-06-15',?,NULL,'media',?),
    ('Punto de Venta 3M Safety',       'Módulo de exhibición para productos de seguridad 3M',         '2026-03-10','2026-07-01',?,NULL,'baja', ?)`,
    [coord_prod,admin, coord_prod,admin, coord_prod,admin, coord_prod,admin,
     coord_prod,admin, coord_prod,admin, coord_prod,admin])
  console.log('✅ Proyectos (basados en clientes reales de Macromet)')

  // ── FASES DE PROYECTO ──────────────────────────────
  const fases = [
    // P1 Castrol — muy avanzado (fase 8 en curso)
    [1,1,'2026-01-10','2026-01-14','completada',100],[1,2,'2026-01-15','2026-01-20','completada',100],
    [1,3,'2026-01-21','2026-01-30','completada',100],[1,4,'2026-01-31','2026-02-08','completada',100],
    [1,5,'2026-02-09','2026-02-15','completada',100],[1,6,'2026-02-16','2026-02-28','completada',100],
    [1,7,'2026-03-01','2026-03-05','completada',100],[1,8,'2026-03-06','2026-03-12','en_curso',70],
    [1,9,'2026-03-13','2026-03-15','pendiente',0],
    // P2 Bosch — fase 6 soldadura en curso
    [2,1,'2026-01-20','2026-01-25','completada',100],[2,2,'2026-01-26','2026-02-03','completada',100],
    [2,3,'2026-02-04','2026-02-15','completada',100],[2,4,'2026-02-16','2026-02-25','completada',100],
    [2,5,'2026-02-26','2026-03-05','completada',100],[2,6,'2026-03-06','2026-03-20','en_curso',55],
    [2,7,'2026-03-21','2026-03-28','pendiente',0],
    // P3 Alpina — inicio, fase 2
    [3,1,'2026-02-05','2026-02-12','completada',100],[3,2,'2026-02-13','2026-02-24','en_curso',60],
    [3,3,'2026-02-25','2026-03-10','pendiente',0],
    // P4 Juan Valdez — COMPLETADO
    [4,1,'2025-11-20','2025-11-25','completada',100],[4,2,'2025-11-26','2025-12-03','completada',100],
    [4,3,'2025-12-04','2025-12-10','completada',100],[4,4,'2025-12-11','2025-12-18','completada',100],
    [4,5,'2025-12-19','2025-12-22','completada',100],[4,6,'2025-12-23','2026-01-05','completada',100],
    [4,7,'2026-01-06','2026-01-10','completada',100],[4,8,'2026-01-11','2026-01-15','completada',100],
    [4,9,'2026-01-16','2026-01-20','completada',100],[4,10,'2026-01-21','2026-01-23','completada',100],
    [4,11,'2026-01-24','2026-01-25','completada',100],[4,12,'2026-01-26','2026-01-30','completada',100],
    // P5 LEGO — fase 5 doblez
    [5,1,'2026-02-22','2026-02-27','completada',100],[5,2,'2026-02-28','2026-03-07','completada',100],
    [5,3,'2026-03-08','2026-03-18','completada',100],[5,4,'2026-03-19','2026-03-28','completada',100],
    [5,5,'2026-03-29','2026-04-08','en_curso',40],[5,6,'2026-04-09','2026-04-20','pendiente',0],
  ]
  for (const [p,f,fi,ff,est,av] of fases) {
    await pool.query(
      `INSERT INTO fases_proyecto (id_proyecto,id_fase_estandar,fecha_inicio,fecha_fin,estado,porcentaje_avance)
       VALUES (?,?,?,?,?,?)`, [p,f,fi,ff,est,av])
  }
  console.log('✅ Fases de proyecto')

  // ── PROGRAMACIÓN DE PLANTA (hoy) ──────────────────
  const today = new Date().toISOString().split('T')[0]
  await pool.query(`INSERT INTO programacion_planta
    (fecha, id_operario, id_maquina, id_proyecto, tiempo_estimado, tiempo_real, estado, observaciones) VALUES
    (?, ?, (SELECT id_maquina FROM maquinaria WHERE codigo='EM-01'), 1, 480, 460, 'completado', 'Soldadura marco base exhibidor Castrol'),
    (?, ?, (SELECT id_maquina FROM maquinaria WHERE codigo='EM-02'), 2, 480, NULL,'en_proceso', 'Soldadura laterales display Bosch'),
    (?, ?, (SELECT id_maquina FROM maquinaria WHERE codigo='TZ-01'), 2, 240, NULL,'programado', 'Corte de perfilería cuadrada 20x20'),
    (?, ?, (SELECT id_maquina FROM maquinaria WHERE codigo='TZ-02'), 5, 300, NULL,'programado', 'Corte tubería para estructura LEGO')`,
    [today, uid['soldador1@macromet.com.co'],
     today, uid['soldador2@macromet.com.co'],
     today, uid['soldador3@macromet.com.co'],
     today, uid['ayudante@macromet.com.co']])
  console.log('✅ Programación de planta (hoy)')

  // ── MANTENIMIENTOS ────────────────────────────────
  await pool.query(`INSERT INTO mantenimientos (id_maquina, fecha, tipo, descripcion, realizado_por)
    SELECT id_maquina, '2026-03-20', 'preventivo',
           'Mantenimiento preventivo — revisión de calibración y limpieza',
           ?
    FROM maquinaria WHERE codigo = 'TA-02'`, [uid['martin@macromet.com.co']])
  await pool.query(`INSERT INTO mantenimientos (id_maquina, fecha, tipo, descripcion, realizado_por)
    SELECT id_maquina, '2026-04-01', 'correctivo',
           'Reparación cargador y revisión de carbones',
           ?
    FROM maquinaria WHERE codigo = 'TL-07'`, [uid['martin@macromet.com.co']])
  console.log('✅ Mantenimientos')

  console.log('\n🎉 Seed Macromet completado')
  console.log('\n📋 Accesos de prueba:')
  console.log('   alejandro@macromet.com.co  /  macromet2026')
  console.log('   angie@macromet.com.co       /  operario2026')
  console.log('   martin@macromet.com.co      /  operario2026')
  console.log('   soldador1@macromet.com.co   /  operario2026')
  await pool.end()
}

seed().catch(err => { console.error('❌', err.message); process.exit(1) })

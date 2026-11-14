// ============================================================
// Documentación OpenAPI 3 del API de Asteron.
// Se sirve en /api/docs (Swagger UI) y en /api/docs.json (especificación).
// Cada ruta de src/routes/*.js tiene aquí su entrada: al agregar o cambiar
// un endpoint, actualiza también este archivo.
// ============================================================

// ── Esquemas reutilizables ───────────────────────────────────
const schemas = {
  Error: {
    type: 'object',
    properties: { message: { type: 'string', example: 'Mensaje que explica el error' } },
  },
  Mensaje: {
    type: 'object',
    properties: { message: { type: 'string', example: 'Operación realizada correctamente' } },
  },
  Login: {
    type: 'object',
    required: ['correo', 'contrasena'],
    properties: {
      correo:     { type: 'string', format: 'email', example: 'admin@macromet.com.co' },
      contrasena: { type: 'string', format: 'password', example: 'admin2026' },
    },
  },
  Sesion: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          correo: { type: 'string' },
          rol:    { type: 'string', example: 'Gerente General' },
          token:  { type: 'string', description: 'JWT con vencimiento de 8 horas' },
        },
      },
    },
  },
  Usuario: {
    type: 'object',
    required: ['nombre', 'correo', 'id_rol'],
    properties: {
      nombre:          { type: 'string', example: 'Laura Gómez' },
      correo:          { type: 'string', format: 'email', example: 'laura@macromet.com.co' },
      password:        { type: 'string', format: 'password', description: 'Obligatoria al crear; opcional al editar' },
      id_rol:          { type: 'integer', example: 8 },
      codigo_empleado: { type: 'string', example: 'EMP-014' },
      estado:          { type: 'boolean' },
    },
  },
  Rol: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre:      { type: 'string', example: 'Soldador' },
      descripcion: { type: 'string', example: 'Soldadura MIG en planta' },
      valor_hora:  { type: 'number', nullable: true, description: 'Valor hora del cargo en COP', example: 12000 },
    },
  },
  Cliente: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre:         { type: 'string', example: 'Postobón S.A.' },
      nit:            { type: 'string', example: '890903939-5' },
      codigo_cliente: { type: 'string', example: 'CLI-021' },
      direcciones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            etiqueta:  { type: 'string', example: 'Planta Bogotá' },
            direccion: { type: 'string', example: 'Cra 68 # 13-45' },
            principal: { type: 'boolean' },
          },
        },
      },
    },
  },
  Pedido: {
    type: 'object',
    required: ['id_cliente'],
    properties: {
      id_cliente:  { type: 'integer', example: 4 },
      descripcion: { type: 'string', example: 'Exhibidores para lanzamiento' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            producto:               { type: 'string', example: 'Góndola metálica' },
            cantidad:               { type: 'integer', example: 20 },
            fecha_entrega_estimada: { type: 'string', format: 'date' },
            ubicaciones: {
              type: 'array',
              items: { type: 'object', properties: { direccion: { type: 'string' }, cantidad: { type: 'integer' } } },
            },
          },
        },
      },
    },
  },
  Proyecto: {
    type: 'object',
    required: ['nombre', 'fecha_inicio'],
    properties: {
      nombre:                 { type: 'string', example: 'Góndolas Postobón 2026' },
      objetivo:               { type: 'string' },
      prioridad:              { type: 'string', enum: ['alta', 'media', 'baja'] },
      fecha_inicio:           { type: 'string', format: 'date', description: 'No puede ser una fecha pasada' },
      fecha_fin_estimada:     { type: 'string', format: 'date' },
      id_pedido:              { type: 'integer' },
      id_usuario_responsable: { type: 'integer' },
    },
  },
  Fase: {
    type: 'object',
    properties: {
      estado:            { type: 'string', enum: ['pendiente', 'en_proceso', 'completada'] },
      porcentaje_avance: { type: 'integer', minimum: 0, maximum: 100 },
    },
  },
  Maquina: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre:         { type: 'string', example: 'Dobladora hidráulica' },
      codigo:         { type: 'string', example: 'MAQ-03' },
      categoria:      { type: 'string', enum: ['maquinaria_pesada', 'equipo_mig', 'herramienta_electrica'] },
      marca:          { type: 'string' },
      referencia:     { type: 'string' },
      serial:         { type: 'string' },
      descripcion:    { type: 'string' },
      ubicacion:      { type: 'string' },
      estado:         { type: 'string', enum: ['activa', 'inactiva', 'en_mantenimiento', 'sin_asignar', 'guardada', 'dado_de_baja'] },
      id_responsable: { type: 'integer', nullable: true },
    },
  },
  Mantenimiento: {
    type: 'object',
    required: ['id_maquina', 'fecha', 'tipo'],
    properties: {
      id_maquina:  { type: 'integer', example: 3 },
      fecha:       { type: 'string', format: 'date' },
      tipo:        { type: 'string', enum: ['preventivo', 'correctivo', 'predictivo', 'calibracion'] },
      descripcion: { type: 'string' },
      estado:      { type: 'string', enum: ['programado', 'realizado'], description: '"programado" para una fecha futura' },
    },
  },
  Turno: {
    type: 'object',
    required: ['fecha', 'id_operario'],
    properties: {
      fecha:            { type: 'string', format: 'date', description: 'No puede ser una fecha pasada' },
      id_operario:      { type: 'integer', example: 5 },
      id_maquina:       { type: 'integer', example: 10 },
      id_proyecto:      { type: 'integer' },
      id_fase_proyecto: { type: 'integer' },
      tiempo_estimado:  { type: 'integer', description: 'Minutos' },
      observaciones:    { type: 'string' },
    },
  },
}

// ── Ayudas para no repetir lo mismo en cada ruta ─────────────
const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` })
const json = (schema) => ({ 'application/json': { schema } })
const cuerpo = (schema) => ({ required: true, content: json(schema) })
const idPath = (nombre = 'id') => ({ name: nombre, in: 'path', required: true, schema: { type: 'integer' } })
const query = (nombre, descripcion, tipo = 'string', formato) =>
  ({ name: nombre, in: 'query', required: false, description: descripcion, schema: { type: tipo, ...(formato && { format: formato }) } })
const rangoFechas = [query('desde', 'Fecha inicial (AAAA-MM-DD)', 'string', 'date'), query('hasta', 'Fecha final (AAAA-MM-DD)', 'string', 'date')]

const respuestas = (ok = 'Operación exitosa', extra = {}) => ({
  200: { description: ok, content: json({ type: 'object' }) },
  400: { description: 'Datos inválidos', content: json(ref('Error')) },
  401: { description: 'Sin token o token vencido', content: json(ref('Error')) },
  403: { description: 'El rol no tiene permiso', content: json(ref('Error')) },
  500: { description: 'Error interno (sin detalles del servidor)', content: json(ref('Error')) },
  ...extra,
})
const noEncontrado = { 404: { description: 'No existe', content: json(ref('Error')) } }
const creado = { 201: { description: 'Creado', content: json({ type: 'object' }) } }
const conflicto = { 409: { description: 'Conflicto con el estado actual', content: json(ref('Error')) } }

const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, responses: respuestas(), ...extra })

// CRUD estándar de un recurso: GET lista, GET uno, POST, PUT, DELETE
const crud = (base, tag, nombre, schema) => ({
  [base]: {
    get:  op(tag, `Listar ${nombre}`),
    post: op(tag, `Crear ${nombre.replace(/s$/, '')}`, { requestBody: cuerpo(ref(schema)), responses: respuestas('Creado', creado) }),
  },
  [`${base}/{id}`]: {
    parameters: [idPath()],
    get:    op(tag, `Consultar un registro de ${nombre}`, { responses: respuestas(undefined, noEncontrado) }),
    put:    op(tag, `Editar un registro de ${nombre}`, { requestBody: cuerpo(ref(schema)), responses: respuestas(undefined, noEncontrado) }),
    delete: op(tag, `Eliminar un registro de ${nombre}`, { responses: respuestas(undefined, { ...noEncontrado, ...conflicto }) }),
  },
})

// ── Rutas ────────────────────────────────────────────────────
const paths = {
  // Autenticación (pública)
  '/api/auth/login': {
    post: {
      tags: ['Autenticación'], summary: 'Iniciar sesión y obtener el token JWT', security: [],
      requestBody: cuerpo(ref('Login')),
      responses: {
        200: { description: 'Sesión iniciada', content: json(ref('Sesion')) },
        400: { description: 'Faltan correo o contraseña', content: json(ref('Error')) },
        401: { description: 'Credenciales incorrectas', content: json(ref('Error')) },
        403: { description: 'Usuario inactivo', content: json(ref('Error')) },
      },
    },
  },
  '/api/auth/forgot-password': {
    post: {
      tags: ['Autenticación'], summary: 'Enviar enlace de recuperación al correo', security: [],
      requestBody: cuerpo({ type: 'object', required: ['correo'], properties: { correo: { type: 'string', format: 'email' } } }),
      responses: { 200: { description: 'Si el correo existe, se envía el enlace', content: json(ref('Mensaje')) } },
    },
  },
  '/api/auth/reset-password': {
    post: {
      tags: ['Autenticación'], summary: 'Asignar una contraseña nueva con el token del correo', security: [],
      requestBody: cuerpo({ type: 'object', required: ['token', 'nuevaContrasena'], properties: { token: { type: 'string' }, nuevaContrasena: { type: 'string', format: 'password' } } }),
      responses: { 200: { description: 'Contraseña actualizada', content: json(ref('Mensaje')) }, 400: { description: 'Token inválido o vencido', content: json(ref('Error')) } },
    },
  },
  '/api/health': {
    get: { tags: ['Sistema'], summary: 'Estado del servidor', security: [], responses: { 200: { description: 'El API responde', content: json({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } }) } } },
  },

  // Panel principal y alertas
  '/api/dashboard/stats':  { get: op('Dashboard', 'Indicadores, producción programada vs. real y estado de proyectos') },
  '/api/dashboard/counts': { get: op('Dashboard', 'Conteos rápidos para el menú lateral') },
  '/api/notificaciones': { get: op('Alertas', 'Alertas accionables visibles para el rol del usuario') },
  '/api/notificaciones/{clave}/atender': {
    parameters: [{ name: 'clave', in: 'path', required: true, schema: { type: 'string' } }],
    post: op('Alertas', 'Marcar una alerta como atendida'),
  },

  // Recursos con CRUD completo
  ...crud('/api/clientes', 'Clientes', 'clientes', 'Cliente'),
  ...crud('/api/pedidos', 'Pedidos', 'pedidos', 'Pedido'),
  ...crud('/api/proyectos', 'Proyectos', 'proyectos', 'Proyecto'),
  ...crud('/api/maquinaria', 'Maquinaria', 'maquinaria', 'Maquina'),
  '/api/proyectos/{id}/fases/{faseId}': {
    parameters: [idPath(), idPath('faseId')],
    patch: op('Proyectos', 'Actualizar estado o avance de una fase', { requestBody: cuerpo(ref('Fase')), responses: respuestas(undefined, { ...noEncontrado, ...conflicto }) }),
  },

  // Mantenimientos
  '/api/mantenimientos': {
    get:  op('Mantenimientos', 'Listar mantenimientos realizados y programados'),
    post: op('Mantenimientos', 'Registrar o programar un mantenimiento', { requestBody: cuerpo(ref('Mantenimiento')), responses: respuestas('Creado', creado) }),
  },
  '/api/mantenimientos/maquina/{id}': { parameters: [idPath()], get: op('Mantenimientos', 'Historial de mantenimientos de una máquina') },
  '/api/mantenimientos/{id}/realizar': { parameters: [idPath()], patch: op('Mantenimientos', 'Marcar como realizado un mantenimiento programado', { responses: respuestas(undefined, noEncontrado) }) },
  '/api/mantenimientos/{id}': { parameters: [idPath()], delete: op('Mantenimientos', 'Eliminar un mantenimiento', { responses: respuestas(undefined, noEncontrado) }) },

  // Programación de planta y tiempos
  '/api/programacion': {
    get:  op('Programación', 'Listar turnos por fecha o rango', { parameters: [query('fecha', 'Un día (AAAA-MM-DD)', 'string', 'date'), ...rangoFechas] }),
    post: op('Programación', 'Programar un turno (valida fecha, fase y disponibilidad)', { requestBody: cuerpo(ref('Turno')), responses: respuestas('Creado', { ...creado, ...noEncontrado, ...conflicto }) }),
  },
  '/api/programacion/ocupados': { get: op('Programación', 'Operarios y máquinas ocupados en una fecha', { parameters: [query('fecha', 'AAAA-MM-DD', 'string', 'date')] }) },
  '/api/programacion/plantilla': { get: op('Programación', 'Descargar la plantilla .xlsx de importación') },
  '/api/programacion/fase/{idFase}': { parameters: [idPath('idFase')], get: op('Programación', 'Turnos de una fase de proyecto') },
  '/api/programacion/importar/preview': {
    post: op('Programación', 'Previsualizar la importación de un Excel o CSV', {
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary', description: 'Máximo 2 MB' } } } } } },
      responses: respuestas(undefined, { 413: { description: 'El archivo supera 2 MB', content: json(ref('Error')) } }),
    }),
  },
  '/api/programacion/importar': {
    post: op('Programación', 'Importar varios turnos desde Excel o CSV', {
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { archivo: { type: 'string', format: 'binary' } } } } } },
      responses: respuestas(undefined, { 413: { description: 'El archivo supera 2 MB', content: json(ref('Error')) } }),
    }),
  },
  '/api/programacion/{id}': {
    parameters: [idPath()],
    put:    op('Programación', 'Editar un turno', { requestBody: cuerpo(ref('Turno')), responses: respuestas(undefined, { ...noEncontrado, ...conflicto }) }),
    delete: op('Programación', 'Eliminar un turno', { responses: respuestas(undefined, noEncontrado) }),
  },
  '/api/programacion/{id}/estado': {
    parameters: [idPath()],
    patch: op('Programación', 'Iniciar, completar o cancelar un turno (registra hora de inicio y fin)', {
      requestBody: cuerpo({ type: 'object', properties: { estado: { type: 'string', enum: ['programado', 'en_proceso', 'completado', 'cancelado'] } } }),
      responses: respuestas(undefined, { ...noEncontrado, ...conflicto }),
    }),
  },
  '/api/programacion/{id}/avance': {
    parameters: [idPath()],
    patch: op('Programación', 'Actualizar el porcentaje de avance de un turno', { requestBody: cuerpo({ type: 'object', properties: { porcentaje_avance: { type: 'integer', minimum: 0, maximum: 100 } } }) }),
  },
  '/api/programacion/{id}/tiempos': {
    parameters: [idPath()],
    patch: op('Programación', 'Corregir hora de inicio y fin (motivo obligatorio, queda en el historial)', {
      requestBody: cuerpo({ type: 'object', required: ['hora_inicio', 'hora_fin', 'motivo'], properties: { hora_inicio: { type: 'string', format: 'date-time' }, hora_fin: { type: 'string', format: 'date-time' }, motivo: { type: 'string' } } }),
    }),
  },
  '/api/programacion/{id}/correcciones': { parameters: [idPath()], get: op('Programación', 'Historial de correcciones de tiempo de un turno') },

  // Reportes
  '/api/reportes/horas': { get: op('Reportes', 'Horas estimadas y reales por actividad, operario, OP y proyecto (incluye costo para gerencia)', { parameters: rangoFechas }) },
  '/api/reportes/avance': { get: op('Reportes', 'Avance de proyectos y fases', { parameters: rangoFechas }) },
  '/api/reportes/mantenimientos': { get: op('Reportes', 'Mantenimientos realizados, programados y vencidos', { parameters: rangoFechas }) },
  '/api/reportes/{tipo}/exportar': {
    parameters: [{ name: 'tipo', in: 'path', required: true, schema: { type: 'string', enum: ['horas', 'avance', 'mantenimientos'] } }],
    get: op('Reportes', 'Exportar un reporte a Excel o PDF', {
      parameters: [...rangoFechas, { name: 'formato', in: 'query', required: true, schema: { type: 'string', enum: ['xlsx', 'pdf'] } }],
      responses: { 200: { description: 'Archivo generado', content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {}, 'application/pdf': {} } }, 400: { description: 'Formato o tipo inválido', content: json(ref('Error')) } },
    }),
  },

  // Usuarios y perfil
  '/api/usuarios': {
    get:  op('Usuarios', 'Listar usuarios (lo usan los formularios de responsables y operarios)'),
    post: op('Usuarios', 'Crear un usuario (requiere la acción "crear" en usuarios)', { requestBody: cuerpo(ref('Usuario')), responses: respuestas('Creado', { ...creado, ...conflicto }) }),
  },
  '/api/usuarios/roles': { get: op('Usuarios', 'Roles disponibles para los formularios') },
  '/api/usuarios/{id}': { parameters: [idPath()], put: op('Usuarios', 'Editar un usuario', { requestBody: cuerpo(ref('Usuario')), responses: respuestas(undefined, noEncontrado) }) },
  '/api/usuarios/{id}/estado': { parameters: [idPath()], patch: op('Usuarios', 'Activar o desactivar un usuario', { responses: respuestas(undefined, noEncontrado) }) },
  '/api/perfil': {
    get: op('Perfil', 'Datos de la persona autenticada'),
    put: op('Perfil', 'Cambiar el nombre propio', { requestBody: cuerpo({ type: 'object', properties: { nombre: { type: 'string' } } }) }),
  },
  '/api/perfil/politica-datos': {
    post: op('Perfil', 'Aceptar la política de tratamiento de datos personales (Ley 1581 de 2012)', { responses: respuestas('Autorización registrada con su fecha', noEncontrado) }),
  },
  '/api/perfil/password': {
    patch: op('Perfil', 'Cambiar la contraseña propia (mínimo 6 caracteres)', {
      requestBody: cuerpo({ type: 'object', required: ['actual', 'nueva'], properties: { actual: { type: 'string', format: 'password' }, nueva: { type: 'string', format: 'password', minLength: 6 } } }),
    }),
  },

  // Administración (solo Administrador Sistema)
  '/api/admin/acciones': { get: op('Administración', 'Acciones por módulo de cada rol') },
  '/api/admin/permisos/lote': {
    put: op('Administración', 'Guardar varios cambios de permisos a la vez', { requestBody: cuerpo({ type: 'object', properties: { cambios: { type: 'array', items: { type: 'object' } } } }) }),
  },
  '/api/admin/roles': {
    get:  op('Administración', 'Listar roles con su número de usuarios'),
    post: op('Administración', 'Crear un rol', { requestBody: cuerpo(ref('Rol')), responses: respuestas('Creado', { ...creado, ...conflicto }) }),
  },
  '/api/admin/roles/{id}': {
    parameters: [idPath()],
    put:    op('Administración', 'Editar un rol', { requestBody: cuerpo(ref('Rol')), responses: respuestas(undefined, { ...noEncontrado, ...conflicto }) }),
    delete: op('Administración', 'Eliminar un rol sin usuarios', { responses: respuestas(undefined, { ...noEncontrado, ...conflicto }) }),
  },
  '/api/admin/usuarios': {
    get:  op('Administración', 'Listar usuarios con su rol'),
    post: op('Administración', 'Crear un usuario', { requestBody: cuerpo(ref('Usuario')), responses: respuestas('Creado', creado) }),
  },
  '/api/admin/usuarios/{id}': { parameters: [idPath()], put: op('Administración', 'Editar un usuario', { requestBody: cuerpo(ref('Usuario')) }) },
  '/api/admin/usuarios/{id}/rol': {
    parameters: [idPath()],
    patch: op('Administración', 'Cambiar el rol de un usuario', { requestBody: cuerpo({ type: 'object', properties: { id_rol: { type: 'integer' } } }) }),
  },
  '/api/admin/auditoria': {
    get: op('Administración', 'Bitácora de auditoría: quién cambió usuarios, roles, permisos y maquinaria', {
      parameters: [query('modulo', 'usuarios | roles | permisos | maquinaria'), query('limite', 'Máximo de entradas (200 por defecto, 500 como máximo)', 'integer')],
    }),
  },
  '/api/admin/usuarios/{id}/toggle': { parameters: [idPath()], patch: op('Administración', 'Activar o desactivar un usuario') },
}

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Asteron API',
    version: '2.0.0',
    description:
      'API REST del sistema de gestión de producción Asteron para Macromet S.A.S. ' +
      'Todas las respuestas son JSON. Las rutas protegidas exigen el encabezado ' +
      '`Authorization: Bearer <token>` con el token que entrega /api/auth/login.',
  },
  servers: [{ url: '/', description: 'Este mismo servidor' }],
  tags: [
    { name: 'Autenticación' }, { name: 'Sistema' }, { name: 'Dashboard' }, { name: 'Alertas' },
    { name: 'Clientes' }, { name: 'Pedidos' }, { name: 'Proyectos' }, { name: 'Maquinaria' },
    { name: 'Mantenimientos' }, { name: 'Programación' }, { name: 'Reportes' },
    { name: 'Usuarios' }, { name: 'Perfil' }, { name: 'Administración' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas,
  },
  security: [{ bearerAuth: [] }],
  paths,
}

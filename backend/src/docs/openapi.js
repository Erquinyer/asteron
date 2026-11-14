// ============================================================
// Especificación OpenAPI 3 de la API de Asteron (RNF-19).
// Se sirve en /api/docs (Swagger UI) y /api/docs.json (JSON crudo).
//
// Al agregar o quitar una ruta en routes/*.js hay que reflejarla aquí:
// `pnpm verificar-openapi` compara este archivo con las rutas registradas
// en Express y falla si alguna quedó sin documentar o sobra.
// ============================================================

// ── Ayudas para no repetir la misma estructura en cada operación ──
const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` })
const json = (schema) => ({ content: { 'application/json': { schema } } })
const lista = (nombre) => ({ type: 'array', items: ref(nombre) })

const pathId = (name = 'id', description = 'Identificador del registro') =>
  ({ name, in: 'path', required: true, description, schema: { type: 'integer' } })
const query = (name, description, schema = { type: 'string' }) =>
  ({ name, in: 'query', required: false, description, schema })

const ERRORES = {
  400: 'Datos inválidos o regla de negocio incumplida',
  401: 'Sin token, o token inválido o vencido',
  403: 'El rol no tiene permiso sobre este módulo o acción',
  404: 'Registro no encontrado',
  409: 'Conflicto con datos existentes (duplicado, registro en uso o recurso ocupado)',
  500: 'Error interno del servidor',
}

/**
 * Construye una operación con las respuestas de error comunes.
 * @param {string} tag      módulo al que pertenece (agrupa en Swagger UI)
 * @param {string} summary  qué hace, en una línea
 * @param {object} o        detalles: description, params, body, ok (código de éxito),
 *                          respuesta (schema de éxito), errores (códigos extra), publico
 */
const op = (tag, summary, o = {}) => {
  const codigos = new Set([...(o.publico ? [] : [401, 403]), ...(o.errores || []), 500])
  const responses = {
    [o.ok || 200]: {
      description: o.okDescripcion || 'Operación exitosa',
      ...(o.archivo ? { content: o.archivo } : json(o.respuesta || ref('Mensaje'))),
    },
  }
  for (const c of [...codigos].sort()) responses[c] = { description: ERRORES[c], ...json(ref('Error')) }

  return {
    tags: [tag],
    summary,
    ...(o.description && { description: o.description }),
    ...(o.params && { parameters: o.params }),
    ...(o.body && { requestBody: { required: true, ...(o.multipart ? o.body : json(o.body)) } }),
    ...(o.publico && { security: [] }),
    responses,
  }
}

// Archivo de importación de programación (Excel/CSV, máx. 2 MB)
const ARCHIVO_IMPORTACION = {
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['archivo'],
        properties: { archivo: { type: 'string', format: 'binary', description: '.xlsx o .csv con el formato de la plantilla' } },
      },
    },
  },
}

const ESTADO_FASE = { type: 'string', enum: ['pendiente', 'en_curso', 'completada', 'bloqueada'] }
const ESTADO_TURNO = { type: 'string', enum: ['programado', 'en_proceso', 'completado', 'cancelado'] }
const CATEGORIA_EQUIPO = { type: 'string', enum: ['maquinaria_pesada', 'equipo_mig', 'herramienta_electrica'] }
const FECHA = { type: 'string', format: 'date', example: '2026-11-20' }

// ── Esquemas reutilizables ──
const schemas = {
  Error: {
    type: 'object',
    properties: { message: { type: 'string', example: 'No tienes permiso para realizar esta acción' } },
  },
  Mensaje: {
    type: 'object',
    properties: { message: { type: 'string', example: 'Operación realizada' } },
  },
  Registro: {
    type: 'object',
    description: 'Registro de la tabla correspondiente con sus columnas y campos calculados',
    additionalProperties: true,
  },

  // Autenticación
  LoginEntrada: {
    type: 'object',
    required: ['correo', 'contrasena'],
    properties: {
      correo: { type: 'string', format: 'email', example: 'admin@macromet.com.co' },
      contrasena: { type: 'string', format: 'password', example: 'admin2026' },
    },
  },
  Sesion: {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id_usuario: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Administrador' },
          correo: { type: 'string', example: 'admin@macromet.com.co' },
          rol: { type: 'string', example: 'Administrador Sistema' },
          modulos: { type: 'array', items: { type: 'string' }, example: ['proyectos', 'pedidos'] },
          acciones: {
            type: 'object',
            additionalProperties: { type: 'array', items: { type: 'string' } },
            example: { proyectos: ['crear', 'editar', 'eliminar'] },
          },
          politica_pendiente: { type: 'boolean', description: 'true = debe autorizar la política de datos vigente' },
          token: { type: 'string', description: 'JWT para el encabezado Authorization: Bearer <token>' },
        },
      },
    },
  },

  // Clientes
  ClienteEntrada: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre: { type: 'string', example: 'Almacenes Éxito S.A.' },
      nit: { type: 'string', nullable: true, example: '890900608-9' },
      codigo_cliente: { type: 'string', nullable: true, example: 'CLI-001' },
      direcciones: {
        type: 'array',
        description: 'Reemplaza por completo las direcciones del cliente',
        items: {
          type: 'object',
          properties: {
            etiqueta: { type: 'string', example: 'Bodega principal' },
            direccion: { type: 'string', example: 'Calle 80 # 69-70, Bogotá' },
            principal: { type: 'boolean' },
          },
        },
      },
    },
  },

  // Pedidos
  PedidoEntrada: {
    type: 'object',
    required: ['id_cliente'],
    properties: {
      id_cliente: { type: 'integer', example: 1 },
      descripcion: { type: 'string', nullable: true, example: 'Exhibidores navideños 2026' },
      items: {
        type: 'array',
        description: 'Al editar, los ítems con id_detalle se actualizan, los nuevos se crean y los que falten se eliminan',
        items: {
          type: 'object',
          required: ['producto'],
          properties: {
            id_detalle: { type: 'integer', description: 'Solo al editar un ítem existente' },
            producto: { type: 'string', example: 'Exhibidor de piso en lámina CR' },
            cantidad: { type: 'integer', minimum: 1, example: 20 },
            estado: { type: 'string', example: 'pendiente' },
            fecha_entrega_estimada: { ...FECHA, description: 'No puede ser una fecha pasada' },
            ubicaciones: {
              type: 'array',
              description: 'Puntos de entrega; la suma de sus cantidades debe ser igual a la cantidad del ítem',
              items: {
                type: 'object',
                properties: {
                  direccion: { type: 'string', example: 'Éxito Calle 80' },
                  cantidad: { type: 'integer', example: 10 },
                },
              },
            },
          },
        },
      },
    },
  },

  // Proyectos
  ProyectoEntrada: {
    type: 'object',
    required: ['nombre', 'id_pedido'],
    properties: {
      nombre: { type: 'string', example: 'Exhibidores Éxito navidad' },
      objetivo: { type: 'string', nullable: true },
      prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
      fecha_inicio: { ...FECHA, description: 'No puede ser pasada al crear, ni al cambiarla en una edición' },
      fecha_fin_estimada: FECHA,
      id_pedido: { type: 'integer', description: 'Al crear, genera las fases estándar (por ítem si el pedido tiene 2 o más)' },
      id_usuario_responsable: { type: 'integer', nullable: true },
    },
  },
  FaseEntrada: {
    type: 'object',
    required: ['estado'],
    properties: {
      estado: ESTADO_FASE,
      porcentaje_avance: { type: 'integer', minimum: 0, maximum: 100 },
    },
  },

  // Maquinaria y mantenimientos
  MaquinaEntrada: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre: { type: 'string', example: 'Dobladora hidráulica' },
      codigo: { type: 'string', example: 'MQ-012' },
      categoria: CATEGORIA_EQUIPO,
      marca: { type: 'string' },
      referencia: { type: 'string' },
      serial: { type: 'string' },
      descripcion: { type: 'string' },
      ubicacion: { type: 'string' },
      estado: { type: 'string', enum: ['activa', 'inactiva', 'en_mantenimiento', 'sin_asignar', 'guardada', 'dado_de_baja'] },
      id_responsable: { type: 'integer', nullable: true, description: 'Encargado del equipo' },
    },
  },
  MantenimientoEntrada: {
    type: 'object',
    required: ['id_maquina', 'fecha', 'tipo'],
    properties: {
      id_maquina: { type: 'integer' },
      fecha: { ...FECHA, description: 'Si es programado, es la fecha prevista y no puede ser pasada' },
      tipo: { type: 'string', enum: ['preventivo', 'correctivo', 'predictivo', 'calibracion'] },
      descripcion: { type: 'string' },
      estado: { type: 'string', enum: ['programado', 'realizado'], default: 'realizado' },
    },
  },

  // Programación de planta
  TurnoEntrada: {
    type: 'object',
    required: ['fecha', 'id_operario', 'id_fase_proyecto'],
    properties: {
      fecha: { ...FECHA, description: 'No puede ser pasada' },
      id_operario: { type: 'integer', description: 'No puede tener otro turno ese día ni uno en proceso' },
      id_maquina: { type: 'integer', nullable: true, description: 'Obligatoria si la fase exige una categoría de equipo' },
      id_proyecto: { type: 'integer', description: 'Opcional: se deduce de la fase' },
      id_fase_proyecto: { type: 'integer', description: 'Solo fases que requieren turno y no están completadas' },
      tiempo_estimado: { type: 'integer', description: 'Minutos', example: 240 },
      observaciones: { type: 'string' },
    },
  },
  VistaPreviaImportacion: {
    type: 'object',
    properties: {
      columnas: { type: 'array', items: { type: 'string' } },
      filas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fila: { type: 'integer' },
            valores: { type: 'object', additionalProperties: true },
            estado: { type: 'string', enum: ['ok', 'error'] },
            motivo: { type: 'string', nullable: true },
          },
        },
      },
      total: { type: 'integer' },
      validas: { type: 'integer' },
    },
  },
  ResultadoImportacion: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      creados: { type: 'integer' },
      errores: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  },

  // Usuarios y administración
  UsuarioEntrada: {
    type: 'object',
    required: ['nombre', 'correo'],
    properties: {
      nombre: { type: 'string', example: 'Carlos Pérez' },
      correo: { type: 'string', format: 'email', example: 'soldador3@macromet.com.co' },
      password: { type: 'string', format: 'password', description: 'Obligatoria al crear; al editar, solo si se cambia' },
      id_rol: { type: 'integer' },
      codigo_empleado: { type: 'string', nullable: true },
      estado: { type: 'integer', enum: [0, 1], description: 'Solo al editar' },
    },
  },
  EntradaBitacora: {
    type: 'object',
    properties: {
      id_bitacora: { type: 'integer' },
      entidad: { type: 'string', enum: ['usuario', 'maquinaria'] },
      id_registro: { type: 'integer' },
      nombre_registro: { type: 'string', example: 'Dobladora hidráulica' },
      accion: { type: 'string', enum: ['crear', 'editar', 'estado', 'contrasena', 'eliminar'] },
      cambios: {
        type: 'object',
        description: 'Solo los campos que cambiaron',
        additionalProperties: { type: 'object', properties: { antes: {}, despues: {} } },
        example: { estado: { antes: 'activa', despues: 'en_mantenimiento' } },
      },
      detalle: { type: 'string', nullable: true, example: 'Mantenimiento correctivo #12' },
      fecha: { type: 'string', format: 'date-time' },
      autor: { type: 'string', nullable: true, example: 'Administrador' },
    },
  },
  RolEntrada: {
    type: 'object',
    required: ['nombre'],
    properties: {
      nombre: { type: 'string', example: 'Supervisor de calidad' },
      descripcion: { type: 'string' },
      valor_hora: { type: 'number', nullable: true, description: 'Valor hora del cargo en COP (costos desactivados en el MVP)' },
    },
  },
}

// ── Rutas ──
const paths = {
  // Autenticación (públicas)
  '/auth/login': {
    post: op('Autenticación', 'Iniciar sesión y obtener el token JWT', {
      publico: true, body: ref('LoginEntrada'), respuesta: ref('Sesion'), errores: [400, 401, 403],
      description: 'Responde 403 si el usuario está inactivo. El token vence según JWT_EXPIRES_IN (8 h por defecto).',
    }),
  },
  '/auth/forgot-password': {
    post: op('Autenticación', 'Enviar el enlace de recuperación de contraseña al correo', {
      publico: true, errores: [400],
      body: { type: 'object', required: ['correo'], properties: { correo: { type: 'string', format: 'email' } } },
      description: 'Responde lo mismo exista o no el correo, para no revelar qué cuentas existen.',
    }),
  },
  '/auth/reset-password': {
    post: op('Autenticación', 'Definir una contraseña nueva con el token del correo', {
      publico: true, errores: [400],
      body: {
        type: 'object',
        required: ['token', 'nuevaContrasena'],
        properties: { token: { type: 'string' }, nuevaContrasena: { type: 'string', format: 'password', minLength: 6 } },
      },
    }),
  },

  // Dashboard
  '/dashboard/stats': {
    get: op('Dashboard', 'Indicadores y datos de las gráficas del tablero', { respuesta: ref('Registro') }),
  },
  '/dashboard/counts': {
    get: op('Dashboard', 'Conteos rápidos por módulo', { respuesta: ref('Registro') }),
  },

  // Proyectos
  '/proyectos': {
    get: op('Proyectos', 'Listar proyectos con su avance y estado calculado', { respuesta: lista('Registro') }),
    post: op('Proyectos', 'Crear un proyecto para un pedido y generar sus fases', {
      body: ref('ProyectoEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 409],
    }),
  },
  '/proyectos/{id}': {
    get: op('Proyectos', 'Detalle del proyecto con sus fases (por ítem si aplica)', {
      params: [pathId()], respuesta: ref('Registro'), errores: [404],
    }),
    put: op('Proyectos', 'Editar un proyecto', {
      params: [pathId()], body: ref('ProyectoEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
    delete: op('Proyectos', 'Eliminar un proyecto', {
      params: [pathId()], errores: [404, 409],
      description: 'Responde 409 si el proyecto ya tiene actividades programadas.',
    }),
  },
  '/proyectos/{id}/fases/{faseId}': {
    patch: op('Proyectos', 'Cambiar el estado o avance de una fase', {
      params: [pathId(), pathId('faseId', 'Identificador de la fase del proyecto')],
      body: ref('FaseEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
      description: 'Requiere la acción editar, salvo para la persona asignada a una fase de Diseño o Compra.',
    }),
  },

  // Pedidos
  '/pedidos': {
    get: op('Pedidos', 'Listar pedidos (órdenes de producción)', { respuesta: lista('Registro') }),
    post: op('Pedidos', 'Crear un pedido con sus ítems y puntos de entrega', {
      body: ref('PedidoEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400],
    }),
  },
  '/pedidos/{id}': {
    get: op('Pedidos', 'Detalle del pedido con ítems y puntos de entrega', {
      params: [pathId()], respuesta: ref('Registro'), errores: [404],
    }),
    put: op('Pedidos', 'Editar un pedido y sincronizar sus ítems', {
      params: [pathId()], body: ref('PedidoEntrada'), respuesta: ref('Registro'), errores: [400, 404],
      description: 'Si el pedido ya tiene proyecto, a los ítems nuevos se les generan sus fases.',
    }),
    delete: op('Pedidos', 'Eliminar un pedido', {
      params: [pathId()], errores: [404, 409], description: 'Responde 409 si el pedido tiene un proyecto asociado.',
    }),
  },

  // Clientes
  '/clientes': {
    get: op('Clientes', 'Listar clientes con su dirección principal', { respuesta: lista('Registro') }),
    post: op('Clientes', 'Crear un cliente', {
      body: ref('ClienteEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 409],
    }),
  },
  '/clientes/{id}': {
    get: op('Clientes', 'Detalle del cliente con direcciones y pedidos', {
      params: [pathId()], respuesta: ref('Registro'), errores: [404],
    }),
    put: op('Clientes', 'Editar un cliente', {
      params: [pathId()], body: ref('ClienteEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
    delete: op('Clientes', 'Eliminar un cliente', { params: [pathId()], errores: [404, 409] }),
  },

  // Maquinaria
  '/maquinaria': {
    get: op('Maquinaria', 'Listar equipos con responsable y uso del día', { respuesta: lista('Registro') }),
    post: op('Maquinaria', 'Registrar un equipo', {
      body: ref('MaquinaEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400],
    }),
  },
  '/maquinaria/{id}': {
    get: op('Maquinaria', 'Detalle del equipo con su historial de mantenimientos', {
      params: [pathId()], respuesta: ref('Registro'), errores: [404],
    }),
    put: op('Maquinaria', 'Editar un equipo', {
      params: [pathId()], body: ref('MaquinaEntrada'), respuesta: ref('Registro'), errores: [400, 404],
    }),
    delete: op('Maquinaria', 'Eliminar un equipo', {
      params: [pathId()], errores: [404, 409],
      description: 'Responde 409 si el equipo tiene mantenimientos: en ese caso se marca como dado_de_baja.',
    }),
  },

  // Mantenimientos
  '/mantenimientos': {
    get: op('Mantenimientos', 'Listar mantenimientos realizados y programados', { respuesta: lista('Registro') }),
    post: op('Mantenimientos', 'Registrar o programar un mantenimiento', {
      body: ref('MantenimientoEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400],
      description: 'Un correctivo realizado deja la máquina en estado en_mantenimiento.',
    }),
  },
  '/mantenimientos/maquina/{id}': {
    get: op('Mantenimientos', 'Historial de mantenimientos de una máquina', {
      params: [pathId('id', 'Identificador de la máquina')], respuesta: lista('Registro'),
    }),
  },
  '/mantenimientos/{id}/realizar': {
    patch: op('Mantenimientos', 'Marcar como realizado un mantenimiento programado', {
      params: [pathId()], errores: [400, 404],
      body: { type: 'object', properties: { descripcion: { type: 'string', description: 'Opcional: reemplaza la descripción' } } },
      description: 'La fecha pasa a ser la de hoy y queda registrado quién lo realizó.',
    }),
  },
  '/mantenimientos/{id}': {
    delete: op('Mantenimientos', 'Eliminar un mantenimiento', { params: [pathId()], errores: [404] }),
  },

  // Programación de planta
  '/programacion': {
    get: op('Programación', 'Listar turnos de un día o de un rango de fechas', {
      params: [
        query('fecha', 'Un solo día (por defecto, hoy)', FECHA),
        query('desde', 'Inicio del rango', FECHA),
        query('hasta', 'Fin del rango', FECHA),
      ],
      respuesta: lista('Registro'),
    }),
    post: op('Programación', 'Programar un turno (operario + máquina + fase + fecha)', {
      body: ref('TurnoEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
  },
  '/programacion/ocupados': {
    get: op('Programación', 'Operarios y máquinas no disponibles en una fecha', {
      params: [query('fecha', 'Fecha a consultar', FECHA)],
      respuesta: {
        type: 'object',
        properties: {
          operarios: { type: 'array', items: { type: 'integer' } },
          maquinas: { type: 'array', items: { type: 'integer' } },
        },
      },
    }),
  },
  '/programacion/plantilla': {
    get: op('Programación', 'Descargar la plantilla Excel de importación', {
      archivo: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
    }),
  },
  '/programacion/fase/{idFase}': {
    get: op('Programación', 'Actividades de una fase de proyecto', {
      params: [pathId('idFase', 'Identificador de la fase del proyecto')], respuesta: lista('Registro'),
    }),
  },
  '/programacion/importar/preview': {
    post: op('Programación', 'Validar un archivo de importación sin guardar nada', {
      body: ARCHIVO_IMPORTACION, multipart: true, respuesta: ref('VistaPreviaImportacion'), errores: [400],
    }),
  },
  '/programacion/importar': {
    post: op('Programación', 'Importar turnos desde Excel/CSV', {
      body: ARCHIVO_IMPORTACION, multipart: true, respuesta: ref('ResultadoImportacion'), errores: [400],
      description: 'Crea las filas válidas con las mismas reglas que la creación individual y reporta las que fallaron.',
    }),
  },
  '/programacion/{id}': {
    put: op('Programación', 'Editar un turno', {
      params: [pathId()], body: ref('TurnoEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
    delete: op('Programación', 'Eliminar un turno', { params: [pathId()], errores: [404] }),
  },
  '/programacion/{id}/estado': {
    patch: op('Programación', 'Iniciar, completar o cancelar un turno', {
      params: [pathId()], errores: [400, 404, 409],
      body: {
        type: 'object',
        required: ['estado'],
        properties: {
          estado: ESTADO_TURNO,
          tiempo_real: { type: 'integer', description: 'Minutos; solo se usa si el turno nunca se inició' },
        },
      },
      description: 'El servidor fija hora_inicio y hora_fin y calcula tiempo_real. Solo roles de programación de planta.',
    }),
  },
  '/programacion/{id}/avance': {
    patch: op('Programación', 'Ajustar el avance de un turno en proceso', {
      params: [pathId()], errores: [400, 404],
      body: { type: 'object', required: ['porcentaje_avance'], properties: { porcentaje_avance: { type: 'integer', minimum: 0, maximum: 99 } } },
    }),
  },
  '/programacion/{id}/tiempos': {
    patch: op('Programación', 'Corregir las horas de un turno completado', {
      params: [pathId()], errores: [400, 404, 409],
      body: {
        type: 'object',
        required: ['hora_inicio', 'hora_fin', 'motivo'],
        properties: {
          hora_inicio: { type: 'string', format: 'date-time' },
          hora_fin: { type: 'string', format: 'date-time', description: 'Posterior al inicio y no futura' },
          motivo: { type: 'string', example: 'El operario olvidó finalizar la actividad' },
        },
      },
      description: 'No puede cruzarse con otra actividad del operario. Cada corrección queda registrada en correcciones_tiempo.',
    }),
  },
  '/programacion/{id}/correcciones': {
    get: op('Programación', 'Historial de correcciones de tiempo de un turno', {
      params: [pathId()], respuesta: lista('Registro'),
    }),
  },

  // Usuarios
  '/usuarios': {
    get: op('Usuarios', 'Listar el equipo de trabajo', { respuesta: lista('Registro') }),
    post: op('Usuarios', 'Crear un usuario', {
      body: ref('UsuarioEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 409],
    }),
  },
  '/usuarios/roles': {
    get: op('Usuarios', 'Catálogo de roles para asignar', { respuesta: lista('Registro') }),
  },
  '/usuarios/{id}': {
    put: op('Usuarios', 'Editar un usuario', {
      params: [pathId()], body: ref('UsuarioEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
  },
  '/usuarios/{id}/estado': {
    patch: op('Usuarios', 'Activar o desactivar un usuario', { params: [pathId()], respuesta: ref('Registro'), errores: [404] }),
  },

  // Perfil
  '/perfil': {
    get: op('Perfil', 'Datos del usuario autenticado', { respuesta: ref('Registro'), errores: [404] }),
    put: op('Perfil', 'Cambiar el nombre propio', {
      body: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string' } } },
      respuesta: ref('Registro'), errores: [400],
    }),
  },
  '/perfil/password': {
    patch: op('Perfil', 'Cambiar la contraseña propia', {
      errores: [400],
      body: {
        type: 'object',
        required: ['actual', 'nueva'],
        properties: { actual: { type: 'string', format: 'password' }, nueva: { type: 'string', format: 'password', minLength: 6 } },
      },
    }),
  },
  '/perfil/politica-datos': {
    post: op('Perfil', 'Autorizar el tratamiento de datos personales (Ley 1581)', {
      respuesta: {
        type: 'object',
        properties: { version: { type: 'string', example: '1.0' }, aceptada_en: { type: 'string', format: 'date-time' } },
      },
      description: 'Guarda la versión aceptada y la fecha como prueba de la autorización.',
    }),
  },

  // Alertas
  '/notificaciones': {
    get: op('Alertas', 'Alertas activas para el usuario según los módulos de su rol', { respuesta: lista('Registro') }),
  },
  '/notificaciones/{clave}/atender': {
    post: op('Alertas', 'Marcar una alerta como atendida', {
      params: [{ name: 'clave', in: 'path', required: true, description: 'Clave de la alerta', schema: { type: 'string' } }],
      errores: [400],
    }),
  },

  // Reportes
  '/reportes/horas': {
    get: op('Reportes', 'Horas estimadas y reales por actividad, trabajador, OP y proyecto', {
      params: [
        query('desde', 'Por defecto, el primer día del mes', FECHA),
        query('hasta', 'Por defecto, hoy', FECHA),
        query('id_proyecto', 'Filtrar por proyecto', { type: 'integer' }),
        query('id_operario', 'Filtrar por trabajador', { type: 'integer' }),
      ],
      respuesta: ref('Registro'),
    }),
  },
  '/reportes/avance': {
    get: op('Reportes', 'Avance de proyectos por fase', {
      params: [query('id_proyecto', 'Filtrar por proyecto', { type: 'integer' })], respuesta: ref('Registro'),
    }),
  },
  '/reportes/mantenimientos': {
    get: op('Reportes', 'Mantenimientos realizados en el rango y programados pendientes', {
      params: [
        query('desde', 'Por defecto, el primer día del mes', FECHA),
        query('hasta', 'Por defecto, hoy', FECHA),
        query('id_maquina', 'Filtrar por equipo', { type: 'integer' }),
        query('tipo', 'Filtrar por tipo', { type: 'string', enum: ['preventivo', 'correctivo', 'predictivo', 'calibracion'] }),
      ],
      respuesta: ref('Registro'),
    }),
  },
  '/reportes/{tipo}/exportar': {
    get: op('Reportes', 'Exportar un reporte a Excel o PDF', {
      params: [
        { name: 'tipo', in: 'path', required: true, schema: { type: 'string', enum: ['horas', 'avance', 'mantenimientos'] } },
        { name: 'formato', in: 'query', required: true, schema: { type: 'string', enum: ['xlsx', 'pdf'] } },
        query('desde', 'Mismos filtros que el reporte en JSON', FECHA),
        query('hasta', 'Mismos filtros que el reporte en JSON', FECHA),
      ],
      archivo: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } },
        'application/pdf': { schema: { type: 'string', format: 'binary' } },
      },
      errores: [400, 404],
    }),
  },

  // Administración (solo Administrador Sistema)
  '/admin/acciones': {
    get: op('Administración', 'Catálogo de acciones por módulo y lo asignado a cada rol', { respuesta: ref('Registro') }),
  },
  '/admin/bitacora': {
    get: op('Administración', 'Bitácora de auditoría de cambios en usuarios y maquinaria', {
      params: [
        query('entidad', 'Tipo de registro', { type: 'string', enum: ['usuario', 'maquinaria'] }),
        query('id_registro', 'Id del usuario o equipo', { type: 'integer' }),
        query('desde', 'Desde este día', FECHA),
        query('hasta', 'Hasta este día, incluido', FECHA),
      ],
      respuesta: lista('EntradaBitacora'), errores: [400],
      description: 'Devuelve los 300 cambios más recientes que cumplan los filtros. Las contraseñas nunca se registran.',
    }),
  },
  '/admin/permisos/lote': {
    put: op('Administración', 'Guardar en bloque los permisos y acciones de varios roles', {
      errores: [400],
      body: {
        type: 'object',
        required: ['cambios'],
        properties: {
          cambios: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id_rol', 'modulo'],
              properties: {
                id_rol: { type: 'integer' },
                modulo: { type: 'string', example: 'proyectos' },
                acceso: { type: 'boolean', description: 'Si es false, se quitan también todas las acciones' },
                crear: { type: 'boolean' },
                editar: { type: 'boolean' },
                eliminar: { type: 'boolean' },
              },
            },
          },
        },
      },
    }),
  },
  '/admin/roles': {
    get: op('Administración', 'Listar roles con sus módulos', { respuesta: lista('Registro') }),
    post: op('Administración', 'Crear un rol', { body: ref('RolEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 409] }),
  },
  '/admin/roles/{id}': {
    put: op('Administración', 'Editar un rol', {
      params: [pathId()], body: ref('RolEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
    delete: op('Administración', 'Eliminar un rol', {
      params: [pathId()], errores: [404, 409], description: 'El rol Administrador Sistema no se puede modificar ni eliminar.',
    }),
  },
  '/admin/usuarios': {
    get: op('Administración', 'Listar usuarios con su rol', { respuesta: lista('Registro') }),
    post: op('Administración', 'Crear un usuario', {
      body: ref('UsuarioEntrada'), ok: 201, respuesta: ref('Registro'), errores: [400, 409],
    }),
  },
  '/admin/usuarios/{id}': {
    put: op('Administración', 'Editar un usuario', {
      params: [pathId()], body: ref('UsuarioEntrada'), respuesta: ref('Registro'), errores: [400, 404, 409],
    }),
  },
  '/admin/usuarios/{id}/rol': {
    patch: op('Administración', 'Asignar un rol a un usuario', {
      params: [pathId()], errores: [400, 404],
      body: { type: 'object', required: ['id_rol'], properties: { id_rol: { type: 'integer' } } },
    }),
  },
  '/admin/usuarios/{id}/toggle': {
    patch: op('Administración', 'Activar o desactivar un usuario', { params: [pathId()], respuesta: ref('Registro'), errores: [404] }),
  },

  // Salud
  '/health': {
    get: op('Sistema', 'Comprobar que la API está en línea', {
      publico: true,
      respuesta: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, sistema: { type: 'string', example: 'Asteron' } } },
    }),
  },
}

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Asteron API',
    version: '1.0.0',
    description:
      'API REST del sistema de gestión de producción Asteron para Macromet. ' +
      'Todas las respuestas son JSON (salvo las descargas de Excel/PDF); los errores responden `{ message }`.\n\n' +
      '**Cómo probarla:** ejecuta `POST /auth/login`, copia el `token` de la respuesta y pégalo en el botón **Authorize**.',
  },
  servers: [{ url: '/api', description: 'Este servidor' }],
  tags: [
    'Autenticación', 'Dashboard', 'Proyectos', 'Pedidos', 'Clientes', 'Maquinaria', 'Mantenimientos',
    'Programación', 'Usuarios', 'Perfil', 'Alertas', 'Reportes', 'Administración', 'Sistema',
  ].map(name => ({ name })),
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token obtenido en POST /auth/login' },
    },
    schemas,
  },
  security: [{ bearerAuth: [] }],
  paths,
}

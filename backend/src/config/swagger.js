import swaggerJSDoc from 'swagger-jsdoc'

// ============================================================
// Configuración de Swagger/OpenAPI.
// Equivalente a la documentación automática que FastAPI genera
// por defecto en /docs — aquí se genera a partir de los
// comentarios @openapi en cada archivo de routes/*.js.
// ============================================================

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Asteron API',
      version:     '1.0.0',
      description: 'API REST del sistema de gestión de producción Asteron para Macromet. ' +
                   'Proyecto SENA — Tecnólogo en Análisis y Desarrollo de Software (ADSO).',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Servidor local de desarrollo' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Token JWT obtenido en /api/auth/login. Formato: Bearer <token>',
        },
      },
      schemas: {
        ApiResponseOk: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Operación exitosa' },
            data:    { type: 'object' },
          },
        },
        ApiResponseError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Mensaje de error' },
            data:    { type: 'object', nullable: true, example: null },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Lee los comentarios @openapi de todos los archivos de rutas
  apis: ['./src/routes/*.js'],
}

export const swaggerSpec = swaggerJSDoc(options)

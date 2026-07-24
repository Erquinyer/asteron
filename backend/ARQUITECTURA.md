# Arquitectura del Backend — Asteron API

> Este documento resume las decisiones de arquitectura del backend de Asteron,
> pensado como insumo directo para los capítulos 3, 4 y 5 de la Guía de Entrega
> (Diseño e Implementación de API REST). Aunque la guía usa terminología de
> FastAPI/Python, aquí se documenta el equivalente real implementado en
> Node.js + Express, explicando el porqué de cada decisión.

## 1. Estructura del proyecto (Capítulo 3)

```
backend/
├── server.js                  ← punto de entrada (equivalente a main.py)
├── src/
│   ├── app.js                 ← configuración de Express, montaje de rutas y middlewares globales
│   ├── config/
│   │   ├── db.js               ← pool de conexiones MySQL
│   │   ├── mailer.js            ← configuración de envío de correo (recuperación de contraseña)
│   │   └── swagger.js           ← configuración de documentación OpenAPI
│   ├── routes/                 ← define endpoints y los conecta con validación + controlador
│   ├── controllers/            ← lógica de negocio y acceso a datos por módulo
│   ├── schemas/                ← validación de datos de entrada (equivalente a los modelos Pydantic)
│   ├── middlewares/             ← autenticación JWT, autorización, validación, manejo de errores
│   └── utils/
│       └── apiResponse.js       ← helper de respuesta unificada {success, message, data}
└── scripts/                    ← seed y migraciones de base de datos
```

**Justificación de la organización:** cada carpeta agrupa una única responsabilidad
(rutas, lógica de negocio, validación, configuración), siguiendo el mismo principio
de separación de responsabilidades que exige una arquitectura por capas en FastAPI.
Un desarrollador nuevo en el equipo puede ubicar cualquier pieza de código sabiendo
solo "¿qué hace esto?" en lugar de tener que leer todo el proyecto.

## 2. Arquitectura por capas (Capítulo 4)

| Capa que pide la guía | Equivalente en Asteron (Express) | Justificación |
|---|---|---|
| Presentación | Swagger en `/api/docs` (vía `swagger-jsdoc`) + Postman | Documentación automática generada desde comentarios `@openapi` en cada archivo de rutas |
| Rutas | `src/routes/*.routes.js` con `express.Router()` | Cada módulo (clientes, proyectos, maquinaria...) tiene su propio router; se monta en `app.js` bajo su prefijo (`/api/clientes`, etc.) |
| Controladores | `src/controllers/*.controller.js` | Reciben la petición ya validada, ejecutan la regla de negocio y las consultas SQL, y devuelven la respuesta |
| Modelos | Tablas definidas en `Data Base/asteron_v2.sql` + consultas SQL directas con `mysql2` dentro de cada controlador | No se usa un ORM (como SQLAlchemy en FastAPI); se optó por SQL directo parametrizado por control total sobre las consultas y curva de aprendizaje más corta para el equipo. El "modelo" de cada entidad es el propio esquema de la tabla |
| Schemas | `src/schemas/*.schema.js` con **Zod** | Zod cumple el mismo rol que Pydantic: define la forma esperada de los datos, valida tipos, aplica valores por defecto y rechaza peticiones mal formadas antes de que lleguen al controlador |
| Configuración | `.env` + `src/config/db.js`, `mailer.js`, `swagger.js` | Centraliza credenciales y parámetros de conexión fuera del código fuente |

### ¿Por qué SQL directo y no un ORM?

Se evaluó usar un ORM (equivalente a SQLAlchemy en el mundo Python), pero se optó
por `mysql2` con consultas parametrizadas porque:
- El esquema de Asteron ya estaba definido en SQL puro (`asteron_v2.sql`) antes de
  decidir el stack del backend.
- Las consultas del sistema usan JOINs y agregaciones complejas (ej. cálculo de
  avance de proyecto por promedio de fases) que son más directas de expresar y
  optimizar en SQL crudo que a través de un ORM.
- El equipo ya tenía más experiencia con SQL que con la sintaxis de un ORM
  específico de Node.

## 3. Buenas prácticas implementadas (Capítulo 5)

### Variables de entorno
Todas las credenciales sensibles (host y contraseña de BD, `JWT_SECRET`, credenciales
de correo) viven en `.env`, nunca en el código fuente. El repositorio incluye
`.env.example` como plantilla sin valores reales.

### Respuesta unificada de la API
Todos los endpoints devuelven la misma forma de respuesta:

```json
// Éxito
{ "success": true, "message": "Cliente creado correctamente", "data": { "id_cliente": 5, "nombre": "Acme" } }

// Error
{ "success": false, "message": "El nombre es requerido", "data": null, "errors": [{ "campo": "nombre", "mensaje": "El nombre es requerido" }] }
```

Implementado en `src/utils/apiResponse.js` mediante dos funciones (`ok`, `fail`)
que se usan en absolutamente todos los controladores. Esto simplifica el consumo
desde el frontend: siempre se revisa `success` y siempre se lee `data` de la
misma forma, sin importar el endpoint.

### Validación de entrada (Zod)
Antes de esta iteración, cada controlador validaba manualmente sus campos con
`if (!campo) return res.status(400)...`. Ahora esa validación se declara una vez
como un schema de Zod (`src/schemas/`) y se aplica como middleware en la ruta:

```js
router.post('/', validate(clienteCreateSchema), create)
```

Beneficios: la regla de validación queda en un solo lugar, es reutilizable, y el
controlador nunca recibe datos inválidos — ya no necesita revisarlo él mismo.

### Manejo centralizado de excepciones
`src/middlewares/errorHandler.middleware.js` captura cualquier error no manejado
(usando `asyncHandler` como wrapper en cada controlador) y responde siempre con
el mismo formato unificado, evitando que cada controlador repita su propio
`try/catch` con mensajes inconsistentes.

### Separación de responsabilidades
- Las rutas **no** contienen lógica de negocio, solo declaran qué validación y
  qué controlador aplica a cada endpoint.
- Los controladores **no** validan entrada manualmente (ya llega validada).
- La configuración de infraestructura (BD, correo, swagger) vive aparte de la
  lógica de negocio.

### Código limpio
Nombres descriptivos en español consistente con el dominio del negocio
(`id_cliente`, `id_proyecto`), separación por módulo funcional (un archivo de
controlador/ruta/schema por entidad del sistema), y eliminación de duplicidad
al centralizar la respuesta y el manejo de errores.

## 4. Documentación interactiva

Con el servidor corriendo, la documentación completa (37 endpoints) está disponible en:

```
http://localhost:3000/api/docs
```

Generada automáticamente a partir de los comentarios `@openapi` en cada archivo
de `src/routes/`, sin necesidad de mantenerla a mano por separado.

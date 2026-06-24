# Metodología de Desarrollo — Proyecto Asteron

## Metodología aplicada: Desarrollo Ágil con Scrum adaptado

El proyecto Asteron fue desarrollado aplicando principios de la metodología **Scrum** adaptada al contexto académico de SENA, con iteraciones cortas (sprints) que permitieron entregar funcionalidad progresiva y validar cada módulo con el cliente (Macromet).

---

## Fases del desarrollo

### Fase 1 — Análisis de requisitos
- Reuniones con el equipo de Macromet para identificar necesidades
- Levantamiento de requerimientos funcionales por área (producción, comercial, planta, administración)
- Definición del alcance: 9 módulos funcionales
- Entregable: documento de requisitos y modelo de dominio del negocio

### Fase 2 — Diseño
- Diseño del modelo entidad-relación (MER) de la base de datos
- Definición de la arquitectura del sistema: cliente-servidor con API REST
- Selección del stack tecnológico: React + Node.js + MySQL
- Diseño de wireframes de las interfaces principales
- Definición del sistema de roles y permisos (RBAC)
- Entregable: esquema de BD `asteron_v2.sql`, diagrama de arquitectura

### Fase 3 — Implementación
Desarrollo iterativo por sprints de aproximadamente dos semanas:

| Sprint | Módulos entregados |
|---|---|
| Sprint 1 | Autenticación (login, JWT, recuperación de contraseña) |
| Sprint 2 | Dashboard con estadísticas y gráficas |
| Sprint 3 | Proyectos con fases y avance por porcentaje |
| Sprint 4 | Pedidos, Clientes |
| Sprint 5 | Maquinaria, Mantenimientos |
| Sprint 6 | Programación de Planta, Usuarios |
| Sprint 7 | Notificaciones, control de acceso por roles (RBAC), Landing Page, paginado |

- **Control de versiones:** Git con estrategia de ramas (main / develop / ramas personales)
- **Repositorio:** https://github.com/Erquinyer/asteron

### Fase 4 — Pruebas
- Pruebas funcionales de cada módulo tras su implementación
- Pruebas de integración entre frontend y backend
- Pruebas de control de acceso por rol (diferentes usuarios con distintos permisos)
- Corrección de errores identificados en la retroalimentación del instructor
- Validación de flujos críticos: login, creación de proyectos, programación de planta

### Fase 5 — Despliegue
- Generación del script de base de datos (`asteron_v2.sql`) reproducible
- Script de datos de prueba reales de Macromet (`seed.js`)
- Script de migración para actualizaciones incrementales (`migration_v2_1.sql`)
- Documentación de instrucciones para el equipo (`INSTRUCCIONES_REPOSITORIO.md`)

---

## Herramientas utilizadas

| Categoría | Herramienta |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Base de datos | MySQL 8, mysql2/promise |
| Autenticación | JWT (jsonwebtoken), bcryptjs |
| Control de versiones | Git, GitHub |
| Editor | Visual Studio Code |
| Pruebas de API | Postman |
| Gestión del proyecto | Trello / reuniones de seguimiento |

---

## Roles del equipo

| Integrante | Rol en el proyecto |
|---|---|
| Gabriel Alejandro Leal | Desarrollo fullstack, arquitectura del sistema, base de datos |
| Nixon Hernan Alejo Baracaldo | Desarrollo frontend, diseño de interfaces |
| David Esteban Alejo | Desarrollo backend, integración de módulos |

---

## Evidencias de la metodología

- Commits en el repositorio con historial trazable por iteración
- Ramas individuales por desarrollador (`gabriel/develop`, `nixon/develop`, `david/develop`)
- Pull Requests de integración hacia `develop` antes de pasar a `main`
- Documento de calificación con retroalimentación del instructor aplicada
- Script de semilla con datos reales del cliente (Macromet)

# Prueba de rendimiento y concurrencia — Asteron

Evidencia de **RNF-08** (consultas habituales en 2 s o menos en el 95 % de los casos) y **RNF-09** (al menos 30 usuarios concurrentes).

## Cómo se corre

Con el backend encendido:

```bash
cd backend
pnpm prueba-carga                                  # 30 usuarios durante 30 s
USUARIOS=100 DURACION=20 pnpm prueba-carga         # escenario de holgura
API_URL=https://servidor/api pnpm prueba-carga     # contra otro servidor
```

El script es `backend/scripts/pruebaCarga.js`. No usa librerías externas, solo el `fetch` de Node.

## Qué simula

- Cada usuario virtual inicia su propia sesión (su propio JWT), igual que una persona en su equipo.
- Todos los usuarios recorren sin pausa las 12 consultas más usadas: dashboard (`stats` y `counts`), alertas, lista y detalle de proyecto, pedidos, clientes, maquinaria, mantenimientos, programación del día, disponibilidad de operarios y máquinas, y reporte de horas.
- Se usa el rol **Administrador Sistema**, que ve todos los datos y todas las alertas. Es el caso más pesado.
- No hay pausas entre peticiones. Una persona real hace mucho menos de una consulta por segundo, así que la carga de la prueba es mucho mayor que el uso normal de 30 personas.

**Criterios de aceptación:**

| Requisito | Criterio | Cómo se mide |
|---|---|---|
| RNF-08 | 95 % de las consultas en ≤ 2 s | Percentil 95 (p95) de todas las respuestas ≤ 2000 ms |
| RNF-09 | 30 usuarios concurrentes | 30 sesiones activas a la vez con 0 % de respuestas con error |

## Resultados (13 de noviembre de 2026)

**Entorno:** Apple M1, Node.js 26.7, MySQL 9.6 local, pool de 10 conexiones. Datos: la carga inicial de Macromet (8 proyectos, 6 pedidos, 96 fases, 40 equipos, 13 usuarios).

### Escenario 1: 30 usuarios durante 30 s

| Consulta | Peticiones | p50 (ms) | p95 (ms) | Máx (ms) | Errores |
|---|---:|---:|---:|---:|---:|
| `/dashboard/stats` | 10 546 | 32 | 44 | 106 | 0 |
| `/dashboard/counts` | 10 534 | 3 | 5 | 47 | 0 |
| `/notificaciones` | 10 534 | 14 | 22 | 74 | 0 |
| `/proyectos` | 10 537 | 3 | 6 | 49 | 0 |
| `/proyectos/:id` | 10 540 | 6 | 9 | 54 | 0 |
| `/pedidos` | 10 543 | 3 | 6 | 48 | 0 |
| `/clientes` | 10 545 | 3 | 6 | 46 | 0 |
| `/maquinaria` | 10 546 | 4 | 6 | 46 | 0 |
| `/mantenimientos` | 10 548 | 3 | 6 | 45 | 0 |
| `/programacion?fecha=` | 10 548 | 3 | 6 | 45 | 0 |
| `/programacion/ocupados?fecha=` | 10 547 | 3 | 6 | 45 | 0 |
| `/reportes/horas` | 10 547 | 3 | 6 | 46 | 0 |
| **Total** | **126 515** | **4** | **31** | **106** | **0** |

Rendimiento: 4216 peticiones/s. El 100 % de las consultas respondió en ≤ 2 s.

- ✅ **RNF-08:** p95 = 31 ms (criterio ≤ 2000 ms).
- ✅ **RNF-09:** 30 usuarios concurrentes con 0 errores.

### Escenario 2 (holgura): 100 usuarios durante 20 s

p95 = 106 ms, 4278 peticiones/s y 0 errores. El sistema soporta más de 3 veces la concurrencia exigida y sigue muy por debajo del límite de 2 s.

## Limitaciones

- La prueba corrió con backend y base en el mismo equipo, sin la latencia de red de un servidor real. En producción conviene repetirla con `API_URL` apuntando al servidor desplegado.
- El volumen de datos es el de la carga inicial. La consulta más costosa es `/dashboard/stats`, y es la primera que habría que vigilar cuando la base tenga meses de programación acumulada.

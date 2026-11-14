# Prueba de carga del API — 2026-11-13

- **Usuarios concurrentes:** 30 (RNF-09: al menos 30)
- **Duración:** 10 s por endpoint, sin pausas entre peticiones
- **Criterio RNF-08:** el 95 % de las respuestas en 2000 ms o menos (se verifica con el percentil 97,5, que es más exigente) y cero errores
- **Servidor:** http://localhost:3000
- **Herramienta:** autocannon (`pnpm test:carga`, script `backend/scripts/carga/prueba-carga.js`)

| Endpoint | Ruta | Peticiones | Pet./s | Promedio (ms) | p50 (ms) | p97,5 (ms) | Máx. (ms) | Errores | Resultado |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Lista de proyectos | `/api/proyectos` | 69446 | 6945 | 4 | 4 | 5 | 31 | 0 | Cumple |
| Lista de pedidos | `/api/pedidos` | 83094 | 7554 | 3 | 3 | 4 | 29 | 0 | Cumple |
| Lista de clientes | `/api/clientes` | 81072 | 7370 | 3 | 3 | 4 | 14 | 0 | Cumple |
| Programación del día | `/api/programacion?fecha=2026-11-13` | 72561 | 6597 | 4 | 4 | 5 | 32 | 0 | Cumple |
| Indicadores del dashboard | `/api/dashboard/stats` | 24396 | 2218 | 13 | 13 | 15 | 37 | 0 | Cumple |
| Alertas | `/api/notificaciones` | 41550 | 3778 | 7 | 7 | 8 | 21 | 0 | Cumple |

**Resultado general:** cumple RNF-08 y RNF-09.

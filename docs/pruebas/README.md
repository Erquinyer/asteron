# Pruebas de software — Asteron

| Documento | Qué tiene |
|---|---|
| [Plan de pruebas](plan-de-pruebas.md) | Alcance, niveles, ambientes (el de pruebas separado del de desarrollo), criterios y gestión de defectos |
| [Matriz de casos](matriz-casos-prueba.md) | 49 casos positivos y negativos con datos, pasos y resultado esperado y obtenido |
| [Reporte de ejecución](reporte-ejecucion.md) | Resultados del 20 nov 2026, cobertura, defectos con severidad y ciclos detectar → corregir → verificar |
| [`postman/`](postman/) | Colección Postman con tests (29 casos) y su ambiente |
| [`preparar-ambiente.sh`](preparar-ambiente.sh) | Crea la BD de pruebas `asteron_test` desde cero |

## Correr todo

```bash
# Unitarias + API (BD simulada) y cobertura
cd backend  && pnpm test:coverage
cd frontend && pnpm test:coverage

# Ambiente de pruebas + Postman (Newman) + E2E
bash docs/pruebas/preparar-ambiente.sh
cd backend && DB_NAME=asteron_test PORT=3001 node server.js        # terminal aparte
cd docs/pruebas && pnpm dlx newman@6.2.1 run postman/asteron.postman_collection.json \
  -e postman/asteron-pruebas.postman_environment.json
cd e2e && FRONT_PORT=5174 E2E_API_URL=http://localhost:3001/api pnpm test

# Integración con MySQL real
docker compose up -d mysql-test && cd backend && pnpm test:integration
```

## Usar la colección en Postman

1. Postman → **Import** → `postman/asteron.postman_collection.json` y `postman/asteron-pruebas.postman_environment.json`.
2. Elige el ambiente **"Asteron — ambiente de pruebas"** (arriba a la derecha).
3. Clic derecho en la colección → **Run collection**. Las peticiones van en orden: las primeras guardan los tokens y los ids que usan las siguientes.

`resultados/` guarda el JSON de cada corrida de Newman. Está en `.gitignore` porque incluye los tokens JWT de la sesión de prueba.

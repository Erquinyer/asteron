# Capa API — reglas de negocio de Programación

> Última capa que me faltaba por pasar (ya hice E2E, Front y BD). Tomé `programacion.controller.js`: la lógica más densa del backend (disponibilidad de operario/máquina, reglas de fase, no-backdating) y la única sin ningún test todavía — David cubrió auth/clientes/mantenimientos/pedidos/proyectos/notificaciones/maquinaria/recovery/admin en sus PRs, pero no Programación.

## ¿Qué prueba este PR?

12 tests de API con `supertest` + pool de MySQL simulado (`vi.mock`), sobre `validarTurnoInterno`/`crearTurnoInterno` (vía `POST /api/programacion`) y la regla de `update` documentada en `CLAUDE.md`:

- Validaciones de entrada: fecha/operario requeridos, no-backdating, fase específica cuando hay proyecto.
- Reglas de fase: no existe (404), no requiere turno (400), ya completada (409), requiere equipo y no se envía (400).
- Disponibilidad: operario ocupado (409), máquina reservada (409).
- Caso feliz: 201 sin conflictos.
- La regla "la fecha solo se revalida si cambió" de `update()`: edita un turno con fecha ya pasada sin tocar la fecha (200, no bloquea) vs. cambiarla a una fecha pasada (400, sí bloquea).

## 🔎 Hallazgo en mi propio test (no en la app)

Al mutar la regla de `fechaCambio` para confirmar que el test la detecta, el test **equivocado** falló (uno distinto al que debía fallar, con un 404 en vez de un 400). La causa: mis `beforeEach` usaban `vi.clearAllMocks()`, que **no limpia** las respuestas encoladas con `mockResolvedValueOnce` que un test anterior dejó sin consumir (pasa cuando el código corta antes de agotarlas, como con un `return` temprano). Esos mocks sobrantes se filtraban al siguiente test y desalineaban toda la secuencia.

Cambié a `vi.resetAllMocks()` (sí limpia implementaciones encoladas) y repetí la mutación: ahora falla exactamente el test que debía fallar, ninguno más. Lo dejo anotado porque es un error fácil de cometer con pools simulados por secuencia de llamadas, y los síntomas (un test que no es el mutado falla) pueden confundirse con un bug real de la app.

## Mutante probado

Quité el `fechaCambio &&` de `if (fechaCambio && esFechaPasada(fecha))` en `update()` — con `vi.resetAllMocks()` ya en su lugar, el único test que falla es `"200: no bloquea editar otros campos de un turno cuya fecha ya quedó en el pasado..."`, exactamente el que documenta esa regla. Restauré el controller después (sin diff).

## Capas

- **Capa del autor esta semana**: API
- **Capa del revisor esta semana**: _(distinta — @DavidAlejo99 o @nixonhalejo, ninguno ha tocado Programación)_

## Checklist

- [x] Los tests siguen el patrón AAA (Arrange, Act, Assert)
- [x] Los nombres de los tests describen el comportamiento esperado
- [x] Hice fallar el test del mutante (dos veces: primero encontré el bug de aislamiento, lo arreglé, y confirmé que el mutante real se detecta solo)
- [x] Los tests pasan en local (12/12)
- [x] No hay credenciales ni datos reales en los tests

## ¿Cómo lo ejecuto?

```bash
cd backend && pnpm test
```

# Retrospectiva — Sprint __ · ____________________

> **Cómo usar esta plantilla:** copia este archivo como `sprint-NN.md` (por ejemplo `sprint-06.md`) y llénalo **entre los tres** al cerrar el sprint. Escriban con sus palabras: el jurado de T6 evalúa la **reflexión explícita sobre el proceso de pruebas** (sección 4), así que esa sección no puede quedar vacía. La lista T6 pide **al menos 2 sprints** con retrospectiva.
>
> Borra estas notas en gris (las líneas que empiezan con `>`) cuando termines.

**Fechas del sprint:** ___ / ___ / 2026 al ___ / ___ / 2026
**Fecha de la retrospectiva:** ___ / ___ / 2026 · **Duración:** ___ min
**Facilitador (Scrum Master):** ____________________
**Asistentes:** ☐ Gabriel Leal (Product Owner) ☐ Nixon Alejo (Scrum Master) ☐ David Alejo (Desarrollador)

---

## 1. Objetivo del sprint y resultado

**Objetivo (Sprint Goal):** ______________________________________________

**¿Se cumplió?** ☐ Sí ☐ Parcialmente ☐ No

| Historia / tarea | Responsable | Estado al cierre | Evidencia (PR, commit, captura) |
|---|---|---|---|
| | | ☐ Terminada ☐ Parcial ☐ No iniciada | |
| | | ☐ Terminada ☐ Parcial ☐ No iniciada | |
| | | ☐ Terminada ☐ Parcial ☐ No iniciada | |

**Puntos o horas planeados vs. logrados:** ____ / ____

## 2. ¿Qué salió bien? (mantener)

> Cosas concretas que funcionaron y que vale la pena repetir. Ejemplo de nivel de detalle: "revisar los PR el mismo día evitó conflictos de merge", no "trabajamos bien".

- Gabriel:
- Nixon:
- David:

## 3. ¿Qué salió mal o se puede mejorar? (cambiar)

> Problemas reales, sin culpar a personas: qué pasó, por qué y qué efecto tuvo.

| Problema | Causa | Efecto en el sprint |
|---|---|---|
| | | |
| | | |

## 4. Reflexión sobre el proceso de pruebas ⭐

> Esta es la sección que pide la lista T6 (ítem 2). Respondan cada pregunta con hechos del sprint: números, nombres de tests, defectos.

**4.1 ¿Qué probamos este sprint y en qué capa?** (Front, API, BD/integración, E2E; ver `docs/matriz-rotacion.md`)

| Integrante | Capa | Qué probó | PR |
|---|---|---|---|
| Gabriel | | | |
| Nixon | | | |
| David | | | |

**4.2 Cobertura al inicio y al cierre del sprint**

| App | Inicio | Cierre | ¿Subió el umbral del CI? |
|---|---|---|---|
| Backend | ___ % | ___ % | ☐ Sí ☐ No |
| Frontend | ___ % | ___ % | ☐ Sí ☐ No |

**4.3 Defectos que encontraron las pruebas**

| Defecto | ¿Qué prueba lo encontró? | Severidad | ¿Se corrigió y se volvió a ejecutar? |
|---|---|---|---|
| | | ☐ Alta ☐ Media ☐ Baja | ☐ Sí ☐ No |

**4.4 ¿Qué aprendimos sobre cómo probar?**

> Ejemplos del tipo de reflexión que se espera (son hallazgos reales de este proyecto; usen los suyos):
> - "Un doble de la BD (`vi.mock`) responde lo que uno le dice: los 2 defectos de clientes solo aparecieron contra MySQL real."
> - "`vi.clearAllMocks()` no limpia las respuestas encoladas; un test ajeno fallaba por eso. Cambiamos a `vi.resetAllMocks()`."
> - "La cobertura del frontend decía 97 % pero era 3 %: faltaba medir `src/**`."
> - "Una prueba que pasa no prueba nada si no la vemos fallar: hicimos mutaciones para confirmarlo."

-
-

**4.5 ¿Qué fue difícil de probar y por qué?**

-

**4.6 ¿Las pruebas nos ahorraron trabajo o nos lo dieron?** (algo que se detectó antes de llegar a `develop`, o una prueba frágil que hubo que arreglar)

-

## 5. Acciones para el próximo sprint

> Pocas y concretas, cada una con responsable. En la próxima retrospectiva se revisa si se cumplieron.

| Acción | Responsable | Cómo sabremos que se cumplió |
|---|---|---|
| | | |
| | | |

**Revisión de las acciones del sprint anterior:**

| Acción anterior | ¿Se cumplió? | Comentario |
|---|---|---|
| | ☐ Sí ☐ Parcial ☐ No | |

## 6. Firmas

| Integrante | Rol | Firma |
|---|---|---|
| Gabriel Alejandro Leal | Product Owner | |
| Nixon Hernán Alejo | Scrum Master | |
| David Esteban Alejo | Desarrollador | |

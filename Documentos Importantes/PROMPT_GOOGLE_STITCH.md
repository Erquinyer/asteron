# Prompt para Google Stitch: nuevo aspecto visual de Asteron (Macromet S.A.S.)

## Cómo usarlo

1. Crea un proyecto nuevo en Stitch, en modo **Web**.
2. Pega el **Bloque 0 junto con el Bloque 1** en el primer mensaje. El Bloque 0 fija el contexto y el sistema visual.
3. Revisa el resultado y corrige el estilo **antes de seguir**. Es más barato corregirlo aquí que en 30 pantallas.
4. Pega los bloques 2 a 7 uno por uno, en el mismo proyecto. Si Stitch pierde el estilo, vuelve a pegar la sección "Dirección visual" del Bloque 0.
5. Pega el Bloque 8 para generar las versiones de celular y modo oscuro.
6. Comprueba el resultado con la lista de cobertura del final.

Cada bloque tiene 6 pantallas o menos porque las guías de la comunidad recomiendan ese máximo por petición. No encontré una cifra oficial de Google, así que si Stitch acepta más, puedes unir bloques.

---

## Bloque 0: brief maestro

```text
Eres un diseñador de producto senior. Vas a crear un NUEVO lenguaje visual para Asteron, una aplicación web de gestión de producción que YA existe y funciona. Esto es un rediseño visual, no un producto nuevo: conserva todos los módulos, campos, estados, reglas y textos descritos aquí. No inventes módulos, no quites funciones y no simplifiques formularios. Toda la interfaz va en español de Colombia.

## LA EMPRESA: MACROMET S.A.S.
Macromet es una empresa colombiana del sector metalmecánico, con sede en Bogotá. Diseña y fabrica a la medida exhibidores y material POP (displays de punto de venta), estructuras metálicas y mobiliario industrial para marcas. Trabaja por proyecto: cada producto se fabrica según las especificaciones técnicas del cliente, lo que exige coordinar con precisión diseño, producción, supervisión, calidad y logística.

Su proceso real, en orden:
1. Diseño, render e ingeniería (diseño 3D, aprobación del cliente, planos y despiece)
2. Compra de materiales (lámina, tubería, platina)
3. Corte (tronzado y cizallado)
4. Doblez y conformado
5. Soldadura MIG
6. Lijado y preparación
7. Pintura y acabados (pintura electrostática; la hace un tercero)
8. Ensamble final
9. Control de calidad
10. Despacho e instalación en el punto de venta

Antes de Asteron, Macromet trabajaba con planillas, hojas de cálculo, fotos sueltas y comunicación verbal. Eso causaba poca trazabilidad, tiempos reales sin medir, programación de planta confusa y recursos mal asignados.

## EL PRODUCTO: ASTERON
Asteron es el sistema de ejecución de manufactura (MES) interno de Macromet. Sigue todo el recorrido: cliente → pedido → proyecto → fases por producto → turnos de planta con operario y máquina → tiempos reales → reportes. Promesa de marca: "Control total de tu producción" y "Tu operación, bajo control".

Quién lo usa y qué necesita:
- Gerente General: panorama, riesgos y reportes.
- Consultor Estrategia: consulta proyectos, pedidos y clientes, en solo lectura.
- Coordinador de Producción: proyectos, pedidos, programación y reportes.
- Coordinador de Planta: programación, maquinaria, mantenimientos, reportes.
- Ejecutivo Comercial: clientes y pedidos; consulta proyectos en solo lectura.
- Jefe de Almacén: maquinaria y mantenimientos.
- Administrativo: pedidos, clientes y usuarios.
- Operario: consulta su programación del día desde el celular, en un entorno de taller.
- Administrador Sistema: todo, más roles y permisos.

Cada rol ve solo sus módulos y sus botones. Por eso los botones de crear, editar y eliminar deben poder desaparecer sin romper la composición de la pantalla.

## DIRECCIÓN VISUAL
Personalidad: precisión de taller metalmecánico, sobriedad, confianza y claridad operativa. Debe sentirse como un instrumento de medición bien hecho, no como una plantilla SaaS genérica.
Inspiración: lámina de acero, planos técnicos, trazos de corte, marcas de cota, placas de identificación de máquinas y señalización industrial. Úsala con moderación y en detalles: alguna retícula de plano, numeración técnica, etiquetas tipo placa. Nada de texturas metálicas realistas, ni engranajes decorativos, ni ilustraciones de obreros.
Evita: el degradado violeta o índigo típico de SaaS, el glassmorphism, los brillos, las tarjetas idénticas repetidas sin jerarquía y el exceso de sombras. El sistema actual usa índigo #4F46E5 con tipografía Geist: propón una identidad claramente distinta.

Propón y aplica de forma consistente:
- Paleta: neutros fríos tipo acero y UN color de marca con personalidad. Define versiones clara y oscura desde el principio.
- Tipografía: una familia sans muy legible para la interfaz, y una monoespaciada o técnica para códigos, cifras, fechas y etiquetas pequeñas. Las cifras deben ser tabulares.
- Radios, bordes y elevación: sobrios y con un criterio único. Prefiere bordes finos a sombras.
- Densidad: alta pero respirable. Es una herramienta de uso diario con tablas y muchos datos.

## LOGO
Asteron tiene un logo aprobado que NO se rediseña: dos anillos circulares del mismo tamaño, entrelazados horizontalmente (el anillo derecho pasa por encima del izquierdo, dejando un pequeño corte), en un solo color, seguidos de la palabra ASTERON en mayúsculas con espaciado amplio. Debe funcionar en claro y en oscuro. Macromet aparece como texto: "Macromet S.A.S."

## SIGNIFICADO DE LOS COLORES DE ESTADO
Los tonos pueden cambiar, pero el significado no. Combina siempre color con texto o ícono; nunca dependas solo del color.
- Éxito (verde): activa, completado, completada, entregado, listo.
- En curso (color de marca): en proceso, en curso, avance. Lleva indicador animado si está en vivo.
- Programado o informativo (cian o azul claro): programado, sin asignar.
- Advertencia (ámbar): prioridad media, en mantenimiento, por vencer, datos incompletos.
- Error (rojo): prioridad alta, vencido, cancelado, correctivo, eliminar.
- Neutro (gris): pendiente, inactiva, guardada, dado de baja, solo lectura.

Catálogos de estado exactos:
- Fase: Pendiente, En curso, Completada, Bloqueada.
- Turno de planta: Programado, En proceso, Completado, Cancelado.
- Pedido: Pendiente, En proceso, Entregado, Cancelado.
- Ítem de pedido: Pendiente, En producción, Listo, Entregado.
- Máquina: Activa, Inactiva, En mantenimiento, Sin asignar, Guardada, Dado de baja.
- Prioridad de proyecto: Alta, Media, Baja.
- Mantenimiento: Preventivo, Correctivo, Calibración.
- Categoría de equipo: Maquinaria pesada, Equipo MIG, Herramienta eléctrica.

## ESTRUCTURA COMÚN DE LA APLICACIÓN (todas las pantallas internas)
Barra lateral de 248 px, colapsable a 74 px solo con íconos (botón "Colapsar" abajo). En celular se abre como panel sobre la pantalla con fondo oscurecido. Logo arriba. Grupos de navegación:
- PRINCIPAL: Dashboard, Proyectos (contador), Programación, Pedidos (contador), Reportes.
- RECURSOS: Maquinaria, Mantenimientos, Clientes.
- SISTEMA: Administración (solo Administrador Sistema).
El ítem activo debe distinguirse con claridad.

Barra superior: título de la página con subtítulo "MES · Macromet S.A.S."; botón de modo claro/oscuro; campana de notificaciones con punto rojo; y menú de usuario con avatar de iniciales, nombre y rol (opciones: Mi perfil y Cerrar sesión).
Desplegable de notificaciones, tres niveles (error, advertencia, información). Tipos: proyectos vencidos, proyectos por vencer en 7 días, máquinas en mantenimiento, pedidos activos sin proyecto, tiempo excedido en una actividad, fases retrasadas y mantenimientos vencidos o próximos. Cada alerta tiene un botón "Marcar como atendida". Vacío: "Sin alertas activas".

## COMPONENTES QUE DEBES DEFINIR (y reutilizar en todo)
Botones (primario, secundario, peligro, ícono); campos de texto, fecha y fecha-hora; selector simple; selector con buscador (cada opción con texto secundario y opciones deshabilitadas); filtro combinado (un selector "Todo / Cliente / Responsable…" pegado al buscador); pestañas; alternador Lista / Kanban; insignia de estado; barra de avance con porcentaje; tarjeta de indicador (KPI); tabla densa con encabezado fijo y paginación; acordeón; tablero Kanban con tarjetas arrastrables; modal con encabezado, cuerpo con scroll y pie de acciones; modal de confirmación; notificación emergente (toast) de éxito y error; aviso en línea; estado vacío; esqueleto de carga; estado de error por bloque; sello de "solo lectura" y candado para elementos bloqueados.
Todo campo tiene etiqueta visible, y los obligatorios llevan asterisco. Muestra estados de foco, hover, deshabilitado y error. Contraste mínimo WCAG AA y objetivos táctiles de al menos 44 px en celular.

## DATOS DE EJEMPLO (úsalos, nunca lorem ipsum)
Clientes: Castrol Colombia, Bosch Colombia, Alpina, Juan Valdez Café, LEGO Colombia, Papa John's Colombia, Makita Colombia, 3M Colombia.
Proyectos: Exhibidor Aceites Castrol, Display Herramientas Bosch, Módulo Café Juan Valdez, Stand Interactivo LEGO.
Ítems: Exhibidor metálico aceites Castrol (12), Base para garrafas 4L (12), Display pared Bosch Power Tools (5), Gancho porta-taladro con seguro (80), Módulo café isla aeropuerto (1).
Puntos de entrega: Talleres Bogotá Norte, Talleres Bogotá Sur, Homecenter Calle 80, El Dorado - Puerta 12, C.C. Santafé - Piso 2.
Equipos: [TZ-01] Tronzadora WINWORK, [DL-01] Dobladora Manual Lámina NIAGRA U-250P, [CZ-01] Cizalla Manual Lámina, [SP-01] Soldador de Punto CEAWELD, [EM-01] Equipo MIG ÉLITE, [EM-03] Equipo MIG ESAB Smashweld 257.
Personas (ficticias): Laura Méndez, Andrés Rojas, Carolina Díaz; operarios: Soldador 1, Soldador 2, Soldador 3, Ayudante de Planta. Códigos: EMP-001. Correos: nombre@macromet.com.co.
Formatos: fechas dd/mm/aaaa, moneda "$ 1.250.000" (COP), horas "4,5 h" o "4h 30min", NIT 900112233-1, códigos CLI-001 y OP-12.

No uses máquinas que Macromet no tiene, como corte láser o CNC.
```

---

## Bloque 1: pantallas públicas (5)

```text
Con el sistema visual anterior, genera estas 5 pantallas públicas de escritorio. Son la cara más expresiva de la marca; muestra la identidad metalmecánica con más libertad que en la aplicación interna.

1. LANDING (página de inicio)
- Navegación: logo y botón "Iniciar sesión".
- Hero: titular "Control total de tu producción", con una etiqueta superior y una vista previa de la interfaz con datos de planta en vivo (un turno de Soldadura MIG en [EM-01] con su avance y cronómetro).
- Sección "Plataforma": "Construido para la planta real". Texto: "Asteron no es una herramienta genérica. Cada flujo, cada campo y cada alerta responde a los procesos productivos de Macromet." Tres pilares:
  a) Trazabilidad de extremo a extremo: desde que un cliente hace un pedido hasta que el último operario completa su turno, cada acción queda registrada, fechada y vinculada.
  b) Acceso por rol, no por persona: permisos por módulo y acción para cada cargo.
  c) Decisiones con datos en tiempo real: proyectos críticos, equipos en mantenimiento, pedidos sin proyecto y programación del día.
- Sección "Módulos": "Todo lo que necesita tu operación", con: Dashboard Analítico, Gestión de Proyectos, Control de Pedidos, Clientes, Inventario Maquinaria, Programación de Planta, Reportes, Gestión de Usuarios y Seguridad RBAC.
- Sección "Changelog": "Historial de versiones", línea de tiempo con versión, fecha, etiqueta y lista de mejoras.
- Tecnologías: React, Tailwind CSS, Node.js + MySQL, JWT + RBAC, Git + GitHub, Express.
- Llamado final: "Tu operación, bajo control". Texto: "Inicia sesión con tus credenciales para acceder al sistema de gestión de producción de Macromet." Botón a iniciar sesión.
- Pie: "© 2026 Asteron · Macromet S.A.S. · Bogotá, Colombia".

2. INICIAR SESIÓN
Título "Bienvenido". Campos: correo (ejemplo@correo.com) y contraseña, con botón para mostrarla. Enlace "¿Olvidaste tu contraseña?". Muestra también la variante con error en línea ("Credenciales incorrectas") y el botón en estado de carga. No hay registro público: los usuarios los crea un administrador.

3. RECUPERAR CONTRASEÑA
"¿Olvidaste tu contraseña?": campo de correo y botón de enviar enlace. Incluye el estado de confirmación "Revisa tu correo" y un enlace para volver al inicio de sesión.

4. NUEVA CONTRASEÑA
"Nueva contraseña": campos Nueva contraseña y Confirmar contraseña. Incluye la variante de error "Enlace inválido o incompleto."

5. PÁGINA NO ENCONTRADA (404)
"Página no encontrada. La ruta que buscas no existe en el sistema." Botón para volver.
```

---

## Bloque 2: Dashboard y Proyectos (5)

```text
Mantén exactamente el mismo sistema visual. Genera estas 5 pantallas con la estructura común (barra lateral y barra superior).

1. DASHBOARD
Es el puesto de mando; debe responder en segundos "¿qué necesita mi atención hoy?". Se actualiza solo y tiene un botón "Actualizar ahora".
- Cuatro KPI clicables, cada uno con cifra, barra de progreso y nota inferior:
  Turnos de hoy (nota: cuántos sin operario) · Cumplimiento planta (nota: "38 de 52 horas-máquina") · Proyectos en riesgo (nota: "2 vencidos · 3 por vencer") · Capacidad disponible (nota: "4 inactivos o en mantenimiento").
- "Carga de producción": gráfica de barras de horas-máquina programadas contra reales, con selector 7 días / 2 semanas y la desviación.
- "Proyectos por estado": distribución de proyectos.
- "Requiere atención": lista priorizada de alertas con enlace a cada caso; vacío: "Todo en orden".
- "Proyectos en curso": lista con filtros (Por urgencia, Prioridad alta, En riesgo), con prioridad, nombre, cliente, barra de avance y fecha de entrega ("Sin fecha" si no tiene).
- "Programación de hoy": turnos con máquina, operario, proyecto, estado y filtros (Todos, Programado, En proceso, Completado, Cancelado). Vacío: "No hay turnos programados para hoy".
Cada bloque tiene su propio estado de carga y de error ("No se pudieron cargar los indicadores"): un fallo no tumba la página.

2. MODAL "DETALLE DE ACTIVIDAD" (sobre el Dashboard)
Proyecto, fase, ítem, operario, máquina con código, tiempo estimado, tiempo real, observaciones y estado.

3. PROYECTOS (lista)
Título, contador, filtros de prioridad (Todas, Alta, Media, Baja), filtro combinado (Todo, Cliente, Responsable) con buscador y botón "Nuevo proyecto". Tabla paginada: Proyecto, Cliente, Prioridad, Responsable, Avance (barra y %), Entrega, Acciones (editar, eliminar). Marca en rojo los vencidos. Al hacer clic en una fila se abre el detalle. Incluye estado vacío.

4. MODAL "NUEVO PROYECTO / EDITAR PROYECTO"
Pedido asociado (selector con buscador, "Sin pedido") · Nombre del proyecto * (Ej: Display POP Bavaria Q3) · Objetivo (área de texto) · Prioridad (Alta, Media, Baja) · Responsable ("Sin asignar") · Fecha inicio · Fecha límite. La fecha de inicio no puede ser anterior a hoy: muestra ese error. Botones Cancelar y Crear / Guardar cambios.

5. DETALLE DE PROYECTO, vista Lista
Es la pantalla más densa; cuida mucho su jerarquía.
- Encabezado: volver, nombre, objetivo; insignias de prioridad y estado; botones "Ver pedido #1" y "Actividades en curso".
- Cuatro datos: Responsable, Cliente, Inicio, Entrega estimada.
- "Avance general": porcentaje grande, "9 de 18 fases completadas · 2 en curso", barra y conteo por estado.
- Dos tarjetas de fases únicas del proyecto: "Diseño, render e ingeniería" y "Compra de materiales", con persona asignada y botones de avance (Compra en curso / Compra finalizada). Si la persona que mira no es la asignada, solo ve el estado y un candado.
- Panel "Fases del proyecto" con alternador Lista / Kanban.
- Si hay 2 o más productos, "Resumen por fase (2 productos)": una tarjeta por fase con cuántos productos están completados, en curso, pendientes o bloqueados, con ícono y número.
- Acordeón por producto (ej. "Exhibidor metálico aceites Castrol": estado, barra, 46%). Dentro, las 8 fases por producto (Corte → Despacho). Cada fila: número, ícono de estado, nombre, selector de estado, barra con campo de %, botón Guardar (solo si hubo cambios) y fechas inicio → fin.
- Fases con turnos vinculadas: bloqueadas, indicando que se actualizan solas desde Programación, con "Ver actividades (2)", que despliega los turnos ahí mismo, y "Ver en Programación →".
- Pintura y acabados la hace un tercero: se controla a mano, sin turnos; márcalo.
```

---

## Bloque 3: detalle de proyecto y Programación (6)

```text
Mantén exactamente el mismo sistema visual. Programación es el módulo central de la planta: debe leerse de un vistazo.

1. DETALLE DE PROYECTO, vista Kanban
Mismo encabezado y resumen del bloque anterior. Por cada producto, un acordeón con su tablero de tres columnas: Pendiente, En curso, Completada, con contador. Tarjetas con fase, avance y enlaces a actividades. Las bloqueadas por turnos llevan candado y no se arrastran. Muestra el error: "Corte no tiene actividades programadas — prográmale un turno desde Programación de planta antes de marcarla en curso".
Incluye la variante de SOLO LECTURA (Ejecutivo Comercial): sin arrastre, sin botón guardar, controles deshabilitados y sin enlaces a Programación.

2. PROGRAMACIÓN DE PLANTA, vista Lista
- Encabezado: "Programación de planta", "5 ACTIVIDADES · 2 EN PROCESO".
- Barra de herramientas: flechas anterior/siguiente con la fecha ("Vie 6 nov"), que abre "Ver por" Día / Semana / Mes e "Ir a una fecha"; filtro combinado (Todo, Operario, Proyecto, Cliente) con buscador; alternador Lista / Kanban; botón "Importar"; botón principal "Programar actividad".
- Una etiqueta removible cuando llega filtrada por proyecto: "Proyecto: Exhibidor Aceites Castrol ×".
- Cuatro indicadores: Turnos hoy, En curso, Completados, Sin operario.
- Pestañas con contador: Todas, En curso, Programadas, Completadas.
- Acordeón por proyecto ("Exhibidor Aceites Castrol · 2 turnos"). Cada fila de turno: fase e ítem, operario con avatar, máquina con código, tiempo (cronómetro en vivo si está en proceso), estado, barra de avance y acciones (Iniciar, Completar, Editar, Cancelar, Eliminar). El operario no tiene acciones: solo consulta.
Incluye el estado vacío y las agrupaciones por semana y por mes.

3. PROGRAMACIÓN DE PLANTA, vista Kanban
Columnas Programado, En proceso, Completado y Cancelado, con contador. Tarjetas con proyecto (enlace), fase, ítem, operario, máquina y tiempo; el cronómetro se ve en las que están en proceso. Se arrastran solo si el rol gestiona la planta.

4. MODAL "PROGRAMAR ACTIVIDAD / EDITAR"
Fecha (no puede ser pasada) · Proyecto (selector con buscador por #, nombre o cliente; cada opción: "#12 · Exhibidor Aceites Castrol", y debajo "Pedido #3 · Castrol Colombia") · Fase del proyecto * (selector con buscador; texto secundario "Ítem: Base para garrafas 4L · pendiente"; las completadas se ven pero no se eligen) · Operario * (solo los disponibles ese día) · Máquina / Equipo (filtrado por la categoría de la fase; obligatorio en Corte, Doblez, Soldadura, Lijado y Ensamble; opcional en Control de calidad y Despacho) · Tiempo estimado en minutos (480) con su equivalencia "= 8,0h" · Tarea / Observaciones. Diseño, Compra y Pintura no aparecen como fases programables.

5. MODAL "DETALLE DE ACTIVIDAD" en dos estados
a) En proceso: proyecto, fase e ítem; operario y máquina; tiempo estimado; cronómetro grande en vivo; deslizador "Avance de la actividad" de 0 a 99% con Guardar; pie con editar, cancelar, eliminar y "Marcar completada". Incluye la confirmación "¿Confirmar finalización?".
b) Completada: tiempo real en verde; bloque "Horas registradas" ("06/11/26, 7:00 a. m. → 06/11/26, 11:30 a. m.") con enlace "Corregir". El formulario de corrección pide Inicio, Fin y Motivo de la corrección * (obligatorio). Debajo, "Historial de correcciones": quién, cuándo, "255 → 270 min" y motivo. Aviso final: "Actividad completada. El avance de la fase se recalculó automáticamente."

6. MODAL "IMPORTAR PROGRAMACIÓN"
"Carga varios turnos a la vez desde Excel/CSV". Paso 1: descargar plantilla y subir archivo (arrastrar o elegir; máximo 2 MB). Paso 2: vista previa fila por fila con Fila, Estado (válida o con error y su motivo), Fecha, Proyecto, Fase, Operario y Máquina, con un resumen de filas válidas y con error. Paso 3: confirmar la importación y resultado.
```

---

## Bloque 4: Pedidos y Clientes (5)

```text
Mantén exactamente el mismo sistema visual.

1. PEDIDOS (lista)
Filtro combinado (Todo, Cliente, N.º OP) con buscador, selector de estado, rango de fechas Desde/Hasta, enlace "Limpiar" y botón "Nuevo pedido". Tabla paginada: #, Cliente, Descripción, Estado, Ítems, Fecha, Acciones (editar, eliminar). Clic en la fila: abre el detalle.

2. MODAL "NUEVO PEDIDO / EDITAR"
Es un formulario anidado; que no se sienta abrumador.
- Cliente * · Estado · Descripción del pedido.
- Sección "Productos / Ítems", con botón para agregar. Cada producto es una tarjeta con: Producto / descripción, Cantidad, Fecha entrega y quitar.
- Dentro de cada producto, "Puntos de entrega" con "Agregar punto": cada fila tiene una dirección (selector con las direcciones del cliente, formato "Etiqueta — dirección") y su cantidad. Un mismo producto puede ir a varios destinos. Si no tiene: "Sin punto de entrega asignado todavía."
- Validación visible en vivo: "8 / 12 unidades asignadas — no coincide con la cantidad del producto" en rojo, y "12 / 12 unidades asignadas" en verde. No deja guardar si no cuadra.
- Después de crear un pedido, ofrece crear el proyecto asociado.

3. MODAL "DETALLE DEL PEDIDO" (solo lectura)
Cliente, fecha, estado, enlace "Ver proyecto asociado →" y descripción. Tabla de ítems: Producto, Cant., Punto entrega (varias líneas, como "8 · Talleres Bogotá Norte" y "4 · Talleres Bogotá Sur"), Entrega est., Estado (Pendiente, En producción, Listo, Entregado).

4. CLIENTES (lista)
Filtro combinado (Todo, Nombre, Documento) con buscador ("Buscar por nombre o código…") y botón "Nuevo cliente". Cada cliente: nombre, NIT, código CLI-001, dirección principal ("Sin dirección" si no tiene) y acciones (editar, eliminar).

5. MODAL "NUEVO CLIENTE / EDITAR"
Dos pestañas. "Datos generales": Nombre * (Ej: Castrol Colombia), NIT (Ej: 900112233-1), Código cliente (Ej: CLI-009). "Direcciones (2)": lista editable con etiqueta (Ej: Sede principal), dirección (Ej: Calle 10 # 5-20, Bogotá) y marca de principal; agregar y quitar; vacío: "Sin direcciones registradas".
```

---

## Bloque 5: Maquinaria y Mantenimientos (4)

```text
Mantén exactamente el mismo sistema visual. Aquí encaja bien el recurso de "placa de identificación de máquina" para los códigos.

1. MAQUINARIA E INVENTARIO
Encabezado: "27 equipos · 18 activos · 2 en mantenimiento". Indicadores: Activos, En uso hoy, Disponibles sin uso, En mantenimiento. Filtros por categoría (Todas, Maquinaria pesada, Equipo MIG, Herramienta eléctrica) y por estado, buscador "Buscar por código o serial…" y botón "Nueva máquina". Tabla paginada: Código, Equipo (nombre y marca), Categoría, Referencia, Serial, Ubicación, Encargado, Estado con punto de color, insignia "En uso hoy" y acciones (editar, dar de baja o eliminar).

2. MODAL "NUEVA MÁQUINA / EDITAR"
Nombre *, Código (TZ-01), Categoría, Marca, Referencia, Serial, Ubicación, Estado (los 6), Encargado / Responsable ("Sin asignar"), Descripción.

3. MANTENIMIENTOS
"Historial de intervención de equipo". Encabezado: "4 en historial · 2 programados · 1 vencidos". Buscador "Buscar por equipo, técnico…", filtros de tipo (Todos, Preventivo, Correctivo, Calibración), vistas "Historial" y "Programados (2)", y botón "Registrar mantenimiento". Tabla: Equipo (con código), Tipo (insignia con ícono), Descripción, Técnico, Fecha, acciones. En Programados, bajo la fecha va "Vencido hace 2 d" en rojo o "En 4 d" en ámbar, y un botón "Marcar como realizado". Los registros no se editan: se crean, se cierran o se eliminan.

4. MODAL "REGISTRAR MANTENIMIENTO"
Selector superior "Ya realizado" / "Programar a futuro". Equipo * (selector), Fecha * (o Fecha prevista *, que no puede ser pasada), Tipo * (Preventivo, Correctivo, Calibración), Descripción / Trabajo realizado. Si es Correctivo ya realizado, aviso de advertencia: el equipo quedará marcado como "En mantenimiento".
```

---

## Bloque 6: Reportes (3)

```text
Mantén exactamente el mismo sistema visual. Reportes es para gerencia y coordinación: debe verse sólido, listo para presentar.

El costo de mano de obra está fuera del alcance actual: no muestres cifras de dinero en ninguna pantalla.

Elementos comunes: pestañas "Horas", "Avance" y "Mantenimientos"; barra de filtros con etiquetas; botones "Excel" y "PDF", con estado "Generando…".

1. REPORTE "HORAS"
Filtros: Desde, Hasta (por defecto el mes en curso), Proyecto, Trabajador.
KPI: Actividades ("4 sin tiempo real registrado"), Horas reales, Horas estimadas ("Desviación en lo terminado: -0,33 h").
Cuatro tablas: Por trabajador (Trabajador, Cargo, Actividades, Horas est., Horas reales); Por OP (OP-1, Proyecto y cifras); Por proyecto; Por actividad (Fecha, Trabajador, Proyecto, Fase con ítem, Horas est., Horas reales). Cifras alineadas a la derecha.

2. REPORTE "AVANCE"
Filtro: Proyecto. KPI: Proyectos, Completados, Vencidos. Tabla: Proyecto, Cliente, Estado, Avance (barra y %), Fases ("9 / 18"), Entrega estimada, en rojo con "· vencido" si aplica.

3. REPORTE "MANTENIMIENTOS"
Filtros: Desde, Hasta, Equipo, Tipo. KPI: Total, Preventivos, Correctivos, Calibraciones. Tabla "Realizados": Fecha, Equipo con código, Tipo, Técnico, Descripción. Tabla "Programados": Fecha prevista (en rojo con "· vencido" si aplica), Equipo, Tipo, Descripción.
```

---

## Bloque 7: Administración, Usuarios y Perfil (6)

```text
Mantén exactamente el mismo sistema visual.

1. PANEL DE ADMINISTRACIÓN, pestaña "Permisos"
Encabezado "Panel de Administración" con el aviso de acceso restringido. Pestañas Permisos, Usuarios y Roles. A la izquierda, "Roles": lista con buscador y selección múltiple ("Selecciona uno o más roles para configurar sus permisos."). A la derecha, "Permisos por Rol": matriz con una fila por módulo (Dashboard, Proyectos, Pedidos, Clientes, Maquinaria, Mantenimientos, Programación de Planta, Usuarios, Reportes) y columnas Acceso, Crear, Editar, Eliminar. No todos los módulos tienen todas las acciones: Dashboard y Reportes solo Acceso; Mantenimientos no tiene Editar. Quitar el acceso apaga sus acciones. Administrador Sistema aparece bloqueado (inmutable). Una barra inferior aparece con cambios sin guardar: contador, Deshacer, Descartar y Guardar.

2. PESTAÑA "USUARIOS"
"Gestión de Usuarios": buscador, botón nuevo y tabla con código, nombre, correo, rol (cambiable), estado y acciones (editar, activar/desactivar).

3. PESTAÑA "ROLES"
"Roles del Sistema": botón "Nuevo rol". Tabla: rol con ícono de color, descripción ("Sin descripción"), barra de cuántos módulos tiene permitidos, número de usuarios y acciones (ver permisos, editar, eliminar). No se puede eliminar un rol con usuarios ni modificar Administrador Sistema.
Incluye el modal de rol: Nombre del rol * (Ej: Coordinador de Calidad) y Descripción.

4. EQUIPO MACROMET (Usuarios)
"Equipo Macromet": buscador "Buscar por nombre, correo, código o rol…" y botón nuevo. Tarjetas de persona: avatar de iniciales, nombre, código EMP-001, correo, rol, estado Activo/Inactivo y acciones (editar, desactivar).

5. MODAL "NUEVO USUARIO / EDITAR"
Código empleado (placeholder "Auto (EMP-XXX)"), Nombre completo *, Correo electrónico * (nombre@macromet.com.co), Contraseña * (solo al crear), Rol ("Sin rol"), Estado (Activo, Inactivo).

6. MI PERFIL
Tarjeta con avatar, nombre, Correo, Rol, Último acceso y Miembro desde. Formulario para editar el nombre. Formulario "Cambiar contraseña": contraseña actual, nueva ("Mínimo 6 caracteres") y confirmación ("Repite la nueva contraseña"), con error en línea si la actual es incorrecta.
```

---

## Bloque 8: celular y modo oscuro (6)

```text
Mantén exactamente el mismo sistema visual.

Asteron también se empaqueta como aplicación para iOS y Android, y el operario la usa en el taller. Genera en CELULAR (390 px):
1. Dashboard: KPI en 2 columnas y bloques apilados.
2. Programación del operario: su día, sin acciones de gestión, turnos grandes y legibles a distancia, con el cronómetro destacado.
3. Detalle de proyecto: acordeones por producto y filas de fase reorganizadas sin scroll horizontal.
4. Barra lateral abierta como panel sobre el contenido, respetando las áreas seguras de la pantalla.
Reglas: las tablas pasan a tarjetas o tienen scroll horizontal dentro de su contenedor (la página nunca se desplaza de lado); los modales ocupan toda la pantalla; objetivos táctiles de 44 px.

Genera en MODO OSCURO, escritorio:
5. Dashboard.
6. Programación de planta, vista Kanban.
Reglas: el modo oscuro es un tema completo, no una inversión. Mantén la jerarquía, comprueba el contraste de los colores de estado y distingue superficies por tono y borde, no por sombra.
```

---

## Lista de cobertura

Marca cada punto antes de dar el diseño por completo.

**Pantallas**
- [ ] Landing, inicio de sesión, recuperar y nueva contraseña, 404
- [ ] Dashboard y su modal de actividad
- [ ] Proyectos, su modal y el detalle en Lista, Kanban y solo lectura
- [ ] Programación en Lista y Kanban, por día, semana y mes
- [ ] Modales de actividad, detalle (en proceso y completada), corrección de tiempos e importación
- [ ] Pedidos, su modal y su detalle; Clientes y su modal
- [ ] Maquinaria y Mantenimientos con sus modales
- [ ] Reportes de horas, avance y mantenimientos (realizados y programados), sin dinero
- [ ] Administración (permisos, usuarios, roles), Equipo y Perfil
- [ ] Celular y modo oscuro

**Detalles que se pierden con facilidad**
- [ ] Logo sin rediseñar: dos anillos entrelazados
- [ ] Reparto por varios puntos de entrega con la validación "12 / 12 unidades"
- [ ] Fases bloqueadas por turnos y fases únicas con candado
- [ ] Pintura y acabados como fase manual de un tercero
- [ ] Selectores con buscador, texto secundario y opciones deshabilitadas
- [ ] Barra de cambios sin guardar en permisos
- [ ] Filtros de pedidos por estado, fechas y N.º OP
- [ ] Mantenimientos programados, vencidos y "Marcar como realizado"
- [ ] "Marcar como atendida" en cada alerta
- [ ] Cronómetro en vivo y deslizador de avance hasta 99%
- [ ] Notificaciones, estados vacíos, de carga y de error
- [ ] Pantallas sin botones de acción cuando el rol no tiene permiso

## Fuentes de esta información

- Empresa y proceso: `Documentos Importantes/Sustentación_Proyecto_Asteron.docx` y `backend/scripts/seed.js`.
- Sede en Bogotá: pie de la landing y [EMIS](https://www.emis.cn/php/company-profile/CO/Macromet_Sas_en_4927142.html). Actividad de displays de punto de venta: [ZoomInfo](https://www.zoominfo.com/c/macromet/507416226), un tercero. Conviene confirmarlo con Macromet.
- Tamaño de los bloques: recomendación de la comunidad ([guía de prompts para Stitch](https://skillselion.com/skills/joaquimscosta/arkhe-claude-plugins/authoring-stitch-prompts) y [análisis no verificado](https://www.baoyu.io/blog/google-stitch-system-prompt)), no un límite oficial de Google.
- Pantallas, campos y textos: código actual de `frontend/src`.

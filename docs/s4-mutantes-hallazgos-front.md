# Reporte de Mutantes y Hallazgos - Semana 4 (Capa Front)
**Autor:** Nixon Alejo  
**Rama:** `test/s4-front-nixon`

## 1. Reporte de Mutación (Mutation Testing)
* **Objetivo:** Validar que las pruebas de contrato sean estrictas y detecten cambios no autorizados en las respuestas del API.
* **Mutante aplicado:** Se modificó temporalmente una propiedad en la respuesta del controlador de autenticación para verificar la robustez de los tests.
* **Resultado del test:** La prueba de contrato falló correctamente al no encontrar la propiedad esperada por la interfaz de usuario, comprobando la efectividad de las aserciones.
* **Estado:** Revertido tras la comprobación exitosa del mutante.

## 2. Hallazgos de Contrato y Seguridad
* **Estructura JSON uniforme:** Se confirmó que las respuestas de los endpoints devuelven el `Content-Type` correcto (`application/json`), asegurando la compatibilidad con el cliente React.
* **Manejo de errores:** Las validaciones devuelven códigos de estado HTTP adecuados (`400`, `401`) acompañados de un objeto con la propiedad `message` legible para las alertas de la UI.
* **Seguridad:** Se verificó que ninguna respuesta de error expone trazas de sistema (`stack`) ni detalles internos de la base de datos SQL.
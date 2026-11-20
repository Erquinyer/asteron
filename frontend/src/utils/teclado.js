// Accesibilidad (RNF-14): props para una fila o tarjeta que se abre con clic, de modo
// que también se pueda alcanzar con Tab y activar con Enter o Espacio.
//
//   <div {...clicConTeclado(() => abrir(item))}>…</div>
//   <tr {...clicConTeclado(() => navigate(url), { fila: true })}>…</tr>
//
// En una fila de tabla no se pone role="button": cambiaría la semántica de la tabla
// y el lector de pantalla dejaría de leer sus celdas.
export const clicConTeclado = (accion, { fila = false } = {}) => ({
  ...(fila ? {} : { role: 'button' }),
  tabIndex: 0,
  onClick: accion,
  onKeyDown: (e) => {
    // Enter/Espacio sobre un botón interno (editar, eliminar) no debe abrir la fila
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      accion(e)
    }
  },
})

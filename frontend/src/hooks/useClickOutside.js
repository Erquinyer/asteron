import { useEffect } from 'react'

// Cierra un panel (popover/menú) cuando se hace clic fuera del elemento referenciado.
// Extraído del patrón que ya usaba TopBar.jsx para el menú de notificaciones/usuario.
export function useClickOutside(ref, handler) {
  useEffect(() => {
    const onMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [ref, handler])
}

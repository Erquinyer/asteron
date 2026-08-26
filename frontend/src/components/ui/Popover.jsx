import { useRef, useState } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'

// Popover genérico: trigger + panel posicionado, con cierre por clic-afuera.
// Mismo estilo visual que ya usan los menús de TopBar (notificaciones/usuario).
export default function Popover({ trigger, children, align = 'left', panelClassName = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  const close  = () => setOpen(false)
  const toggle = () => setOpen(o => !o)

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle, close })}
      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] ${align === 'right' ? 'right-0' : 'left-0'}
            min-w-[220px] bg-surface border border-border rounded-card shadow-modal
            z-50 overflow-hidden animate-md-in ${panelClassName}`}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  )
}

import { Undo2, RotateCcw, Save, Lock } from 'lucide-react'

const PermisosDraftBar = ({ changeCount, canUndo, saving, isInmutableOnly, onUndo, onDiscard, onSave }) => {
  const statusText = isInmutableOnly
    ? 'ROL INMUTABLE · SIN CAMBIOS POSIBLES'
    : changeCount > 0
      ? `${changeCount} CAMBIO${changeCount !== 1 ? 'S' : ''} SIN GUARDAR · APLICAN EN EL PRÓXIMO INICIO DE SESIÓN`
      : 'SIN CAMBIOS PENDIENTES'

  return (
    <div className="sticky bottom-0 mt-4 bg-surface border border-border rounded-card shadow-modal
      px-5 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-medium text-faint uppercase tracking-[.04em]">
        {isInmutableOnly && <Lock size={11} />}
        {statusText}
      </p>
      <div className="flex items-center gap-2">
        <button onClick={onUndo} disabled={!canUndo || isInmutableOnly}
          className="h-9 flex items-center gap-1.5 px-3 border border-border rounded-control
            text-[12px] font-medium text-muted hover:text-ink hover:bg-hover
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={13} /> Deshacer
        </button>
        <button onClick={onDiscard} disabled={changeCount === 0 || isInmutableOnly}
          className="h-9 flex items-center gap-1.5 px-3 border border-border rounded-control
            text-[12px] font-medium text-muted hover:text-error hover:border-error/40
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw size={13} /> Descartar
        </button>
        <button onClick={onSave} disabled={changeCount === 0 || saving || isInmutableOnly}
          className="h-9 flex items-center gap-1.5 px-4 bg-primary hover:bg-primary-hover
            disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-[12px] font-semibold rounded-control shadow-btn transition-colors"
        >
          <Save size={13} /> {saving ? 'Guardando…' : `Guardar ${changeCount > 0 ? changeCount : ''} cambio${changeCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

export default PermisosDraftBar

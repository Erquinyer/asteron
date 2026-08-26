import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { getAcciones, guardarPermisosLote } from '../api/admin.service'

export const MODULE_ORDER = [
  'dashboard', 'proyectos', 'pedidos', 'clientes',
  'maquinaria', 'mantenimientos', 'programacion', 'usuarios',
]
export const MODULE_LABELS = {
  dashboard:      'Dashboard',
  proyectos:      'Proyectos',
  pedidos:        'Pedidos',
  clientes:       'Clientes',
  maquinaria:     'Maquinaria',
  mantenimientos: 'Mantenimientos',
  programacion:   'Programación de Planta',
  usuarios:       'Usuarios',
}
export const MODULO_ACCIONES = {
  dashboard:      [],
  proyectos:      ['crear', 'editar', 'eliminar'],
  pedidos:        ['crear', 'editar', 'eliminar'],
  clientes:       ['crear', 'editar', 'eliminar'],
  maquinaria:     ['crear', 'editar', 'eliminar'],
  mantenimientos: ['crear', 'eliminar'],
  programacion:   ['crear', 'editar', 'eliminar'],
  usuarios:       ['crear', 'editar', 'eliminar'],
}
export const ACCION_LABELS = { crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
export const ROL_INMUTABLE = 'Administrador Sistema'

const UNDO_LIMIT = 30
const emptyFlags = () => ({ acceso: false, crear: false, editar: false, eliminar: false })
const clone = (state) => JSON.parse(JSON.stringify(state))
const sameFlags = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Forma cruda de la API ({modulos:[], acciones:{modulo:[]}}) -> mapa por id_rol
// con flags booleanos explícitos por módulo, más fáciles de comparar/mutar.
const normalize = (roles) => {
  const out = {}
  for (const r of roles) {
    const modulos = {}
    for (const m of MODULE_ORDER) {
      const acc = r.acciones?.[m] ?? []
      modulos[m] = {
        acceso:   r.modulos.includes(m),
        crear:    acc.includes('crear'),
        editar:   acc.includes('editar'),
        eliminar: acc.includes('eliminar'),
      }
    }
    out[r.id_rol] = { id_rol: r.id_rol, nombre: r.nombre, descripcion: r.descripcion, modulos }
  }
  return out
}

export function getModuleLevel(flags, modulo) {
  const supported = MODULO_ACCIONES[modulo]
  if (!flags.acceso) return 'ninguno'
  const activas = supported.filter(a => flags[a])
  if (activas.length === 0) return 'ver'
  if (supported.length > 0 && activas.length === supported.length) return 'total'
  if (supported.includes('crear') && supported.includes('editar') &&
      flags.crear && flags.editar && !flags.eliminar) return 'editar'
  return 'personalizado'
}

export function levelFlags(level, modulo) {
  const supported = MODULO_ACCIONES[modulo]
  switch (level) {
    case 'ninguno': return emptyFlags()
    case 'ver':     return { acceso: true, crear: false, editar: false, eliminar: false }
    case 'editar':  return { acceso: true, crear: true, editar: true, eliminar: false }
    case 'total':   return {
      acceso: true,
      crear:    supported.includes('crear'),
      editar:   supported.includes('editar'),
      eliminar: supported.includes('eliminar'),
    }
    default: return null
  }
}

// Un nivel puede no ser representable para un módulo dado (p. ej. "Editar"
// requiere que el módulo soporte crear+editar; "Total" requiere ≥1 acción).
export function levelDisabled(level, modulo) {
  const supported = MODULO_ACCIONES[modulo]
  if (level === 'editar') return !(supported.includes('crear') && supported.includes('editar'))
  if (level === 'total')  return supported.length === 0
  return false
}

export function usePermisosDraft() {
  const [serverState, setServerState] = useState(null)
  const [draftState,  setDraftState]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const undoStack = useRef([])
  const [undoCount, setUndoCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getAcciones()
      const norm = normalize(data.roles)
      setServerState(norm)
      setDraftState(clone(norm))
      undoStack.current = []
      setUndoCount(0)
    } catch {
      toast.error('Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pushUndo = useCallback(() => {
    setDraftState(current => {
      if (current) {
        undoStack.current.push(clone(current))
        if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift()
        setUndoCount(undoStack.current.length)
      }
      return current
    })
  }, [])

  const mutate = useCallback((roleIds, fn) => {
    pushUndo()
    setDraftState(prev => {
      const next = clone(prev)
      for (const id of roleIds) {
        if (!next[id] || next[id].nombre === ROL_INMUTABLE) continue
        fn(next[id])
      }
      return next
    })
  }, [pushUndo])

  const setLevel = useCallback((roleIds, modulo, level) => {
    const flags = levelFlags(level, modulo)
    if (!flags) return
    mutate(roleIds, (role) => { role.modulos[modulo] = { ...flags } })
  }, [mutate])

  const toggleAction = useCallback((roleIds, modulo, accion) => {
    setDraftState(prev => {
      if (!prev) return prev
      const editableIds = roleIds.filter(id => prev[id] && prev[id].nombre !== ROL_INMUTABLE)
      if (editableIds.length === 0) return prev
      const allHaveIt = editableIds.every(id => prev[id].modulos[modulo][accion])
      const target = !allHaveIt

      undoStack.current.push(clone(prev))
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift()
      setUndoCount(undoStack.current.length)

      const next = clone(prev)
      for (const id of editableIds) {
        const current = next[id].modulos[modulo]
        const updated = { ...current, [accion]: target }
        updated.acceso = updated.acceso || updated.crear || updated.editar || updated.eliminar
        next[id].modulos[modulo] = updated
      }
      return next
    })
  }, [])

  const applyTemplate = useCallback((roleIds, template) => {
    mutate(roleIds, (role) => {
      for (const modulo of MODULE_ORDER) {
        const supported = MODULO_ACCIONES[modulo]
        let flags
        switch (template) {
          case 'solo_lectura':
            flags = { acceso: true, crear: false, editar: false, eliminar: false }
            break
          case 'operativo':
            flags = {
              acceso: true,
              crear:  supported.includes('crear'),
              editar: supported.includes('editar'),
              eliminar: false,
            }
            break
          case 'acceso_total':
            flags = {
              acceso: true,
              crear:    supported.includes('crear'),
              editar:   supported.includes('editar'),
              eliminar: supported.includes('eliminar'),
            }
            break
          case 'revocar_todo':
          default:
            flags = emptyFlags()
        }
        role.modulos[modulo] = flags
      }
    })
  }, [mutate])

  const copyFromRole = useCallback((sourceId, targetIds) => {
    setDraftState(prev => {
      if (!prev || !prev[sourceId]) return prev
      const filtered = targetIds.filter(id => id !== sourceId)
      if (filtered.length === 0) return prev

      undoStack.current.push(clone(prev))
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift()
      setUndoCount(undoStack.current.length)

      const next = clone(prev)
      const sourceModulos = clone(next[sourceId].modulos)
      for (const id of filtered) {
        if (!next[id] || next[id].nombre === ROL_INMUTABLE) continue
        next[id].modulos = clone(sourceModulos)
      }
      return next
    })
  }, [])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop()
    setUndoCount(undoStack.current.length)
    setDraftState(prev)
  }, [])

  const discard = useCallback(() => {
    setServerState(server => {
      if (server) setDraftState(clone(server))
      return server
    })
    undoStack.current = []
    setUndoCount(0)
  }, [])

  const diff = useMemo(() => {
    const cambios = []
    if (!serverState || !draftState) return cambios
    for (const id of Object.keys(draftState)) {
      for (const modulo of MODULE_ORDER) {
        const a = draftState[id].modulos[modulo]
        const b = serverState[id]?.modulos[modulo]
        if (!sameFlags(a, b)) cambios.push({ id_rol: Number(id), modulo, ...a })
      }
    }
    return cambios
  }, [draftState, serverState])

  const isModuleDirty = useCallback((roleIds, modulo) => {
    if (!serverState || !draftState) return false
    return roleIds.some(id => !sameFlags(draftState[id]?.modulos[modulo], serverState[id]?.modulos[modulo]))
  }, [draftState, serverState])

  const save = useCallback(async () => {
    if (diff.length === 0) return
    setSaving(true)
    try {
      await guardarPermisosLote(diff)
      setDraftState(current => {
        setServerState(clone(current))
        return current
      })
      undoStack.current = []
      setUndoCount(0)
      toast.success(`${diff.length} cambio${diff.length !== 1 ? 's' : ''} guardado${diff.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar permisos')
    } finally {
      setSaving(false)
    }
  }, [diff])

  return {
    loading, saving,
    roles: draftState, serverRoles: serverState,
    setLevel, toggleAction, applyTemplate, copyFromRole,
    undo, discard, save,
    canUndo: undoCount > 0, changeCount: diff.length, isModuleDirty,
    refresh: load,
  }
}

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook genérico para llamadas GET a la API.
 * @param {Function} fetchFn  - función del servicio que retorna la promesa axios
 * @param {Array}    deps     - dependencias que disparan un re-fetch (opcional)
 * @param {Object}   options  - { intervalMs } refresco automático en segundo plano (opcional)
 *
 * Ejemplo de uso:
 *   const { data, loading, error, refresh } = useFetch(() => getProyectos())
 *   const { data } = useFetch(getDashboard, [], { intervalMs: 45000 })
 */
export function useFetch(fetchFn, deps = [], { intervalMs } = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const hasLoadedOnce = useRef(false)

  const load = useCallback(async () => {
    // Solo la primera carga (o un refresh explícito antes de tener datos) muestra loading;
    // los refrescos automáticos de fondo no deben producir parpadeo de skeleton.
    if (!hasLoadedOnce.current) setLoading(true)
    setError(null)
    try {
      const res = await fetchFn()
      setData(res.data)
      hasLoadedOnce.current = true
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    hasLoadedOnce.current = false
    load()
  }, [load])

  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(load, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, load])

  return { data, loading, error, refresh: load }
}

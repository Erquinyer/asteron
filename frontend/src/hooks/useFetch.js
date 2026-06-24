import { useState, useEffect, useCallback } from 'react'

/**
 * Hook genérico para llamadas GET a la API.
 * @param {Function} fetchFn  - función del servicio que retorna la promesa axios
 * @param {Array}    deps     - dependencias que disparan un re-fetch (opcional)
 *
 * Ejemplo de uso:
 *   const { data, loading, error, refresh } = useFetch(() => getProyectos())
 */
export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn()
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refresh: load }
}

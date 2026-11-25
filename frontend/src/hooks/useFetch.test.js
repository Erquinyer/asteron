import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFetch } from './useFetch'

// Promesa que el test resuelve cuando quiere: simula una respuesta del API
// que llega en el momento exacto que interesa.
const diferida = () => {
  let resolver, rechazar
  const promesa = new Promise((res, rej) => { resolver = res; rechazar = rej })
  return { promesa, resolver, rechazar }
}

describe('useFetch', () => {
  it('debe entregar los datos y dejar de cargar cuando el API responde', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: [{ id: 1 }] })

    const { result } = renderHook(() => useFetch(fetchFn))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(result.current.error).toBeNull()
  })

  it('debe mostrar el mensaje del API cuando la petición falla', async () => {
    const fetchFn = vi.fn().mockRejectedValue({ response: { data: { message: 'Sin permiso' } } })

    const { result } = renderHook(() => useFetch(fetchFn))

    await waitFor(() => expect(result.current.error).toBe('Sin permiso'))
    expect(result.current.loading).toBe(false)
  })

  // Defecto de tiempos encontrado con e2e/tests/pedidos-tiempos.spec.js
  it('debe descartar una respuesta vieja que llega después de una más nueva', async () => {
    // Arrange: carga inicial rápida; luego dos recargas, y la primera llega tarde
    const vieja = diferida()
    const nueva = diferida()
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ data: ['A'] })
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa)
    const { result } = renderHook(() => useFetch(fetchFn))
    await waitFor(() => expect(result.current.data).toEqual(['A']))

    // Act
    let recargas
    act(() => { recargas = [result.current.refresh(), result.current.refresh()] })
    await act(async () => { nueva.resolver({ data: ['A', 'B'] }) })
    await act(async () => { vieja.resolver({ data: ['A'] }); await Promise.all(recargas) })

    // Assert: se queda con la respuesta más nueva
    expect(result.current.data).toEqual(['A', 'B'])
  })

  it('debe ignorar el error de una respuesta vieja si ya llegó una más nueva', async () => {
    const vieja = diferida()
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ data: ['A'] })
      .mockReturnValueOnce(vieja.promesa)
      .mockResolvedValueOnce({ data: ['A', 'B'] })
    const { result } = renderHook(() => useFetch(fetchFn))
    await waitFor(() => expect(result.current.data).toEqual(['A']))

    let recargas
    act(() => { recargas = [result.current.refresh(), result.current.refresh()] })
    await act(async () => { vieja.rechazar(new Error('timeout')); await Promise.allSettled(recargas) })

    expect(result.current.data).toEqual(['A', 'B'])
    expect(result.current.error).toBeNull()
  })
})

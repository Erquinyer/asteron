import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Render compartido para los tests de componentes del grupo.
// Envuelve el componente en un router en memoria (sin navegador real) y permite
// declarar rutas de destino para comprobar a dónde navega el componente.
//
// Uso:
//   renderWithProviders(<Login />, {
//     route: '/login',
//     rutas: { '/dashboard': <h1>Panel principal</h1> },
//   })
export function renderWithProviders(ui, { route = '/', rutas = {} } = {}) {
  const user = userEvent.setup()
  const resultado = render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={route} element={ui} />
        {Object.entries(rutas).map(([path, element]) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
  return { user, ...resultado }
}

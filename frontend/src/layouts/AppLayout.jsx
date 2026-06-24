import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
import { getUser } from '../utils/auth'

// Contenedor principal de todas las páginas protegidas.
// Renderiza el sidebar, la topbar, y el <Outlet /> donde
// React Router inyecta la página activa según la URL.
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = getUser()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout

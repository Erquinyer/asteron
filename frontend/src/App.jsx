import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Login          from './components/Login'
import Landing        from './pages/Landing'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import AppLayout      from './layouts/AppLayout'
import ProtectedRoute from './router/ProtectedRoute'
import RoleRoute      from './router/RoleRoute'
import PublicRoute    from './router/PublicRoute'
import NotFound       from './pages/NotFound'

import Dashboard       from './pages/Dashboard'
import Proyectos       from './pages/Proyectos'
import ProyectoDetalle from './pages/ProyectoDetalle'
import Pedidos         from './pages/Pedidos'
import Clientes        from './pages/Clientes'
import Maquinaria      from './pages/Maquinaria'
import Mantenimientos  from './pages/Mantenimientos'
import Programacion    from './pages/Programacion'
import Usuarios        from './pages/Usuarios'
import Perfil          from './pages/Perfil'

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Landing pública — siempre visible */}
        <Route path="/" element={<Landing />} />

        {/* Rutas públicas — redirigen al dashboard si ya hay sesión */}
        <Route element={<PublicRoute />}>
          <Route path="/login"            element={<Login />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
        </Route>

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />


            {/* Accesible para todos los roles autenticados */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil"    element={<Perfil />} />

            {/* Rutas con control de acceso por rol */}
            <Route path="/proyectos" element={
              <RoleRoute module="proyectos"><Proyectos /></RoleRoute>
            } />
            <Route path="/proyectos/:id" element={
              <RoleRoute module="proyectos"><ProyectoDetalle /></RoleRoute>
            } />
            <Route path="/pedidos" element={
              <RoleRoute module="pedidos"><Pedidos /></RoleRoute>
            } />
            <Route path="/clientes" element={
              <RoleRoute module="clientes"><Clientes /></RoleRoute>
            } />
            <Route path="/maquinaria" element={
              <RoleRoute module="maquinaria"><Maquinaria /></RoleRoute>
            } />
            <Route path="/mantenimientos" element={
              <RoleRoute module="mantenimientos"><Mantenimientos /></RoleRoute>
            } />
            <Route path="/programacion" element={
              <RoleRoute module="programacion"><Programacion /></RoleRoute>
            } />
            <Route path="/usuarios" element={
              <RoleRoute module="usuarios"><Usuarios /></RoleRoute>
            } />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

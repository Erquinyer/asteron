import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center space-y-5">
        <p className="text-8xl font-black text-slate-200">404</p>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Página no encontrada</h1>
          <p className="text-slate-500 mt-2 text-sm">La ruta que buscas no existe en el sistema.</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            <ArrowLeft size={16}/> Volver
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium">
            <Home size={16}/> Ir al dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

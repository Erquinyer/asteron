import { useState } from 'react'
import { User, Mail, Shield, Clock, Key, Save, Eye, EyeOff } from 'lucide-react'
import { useFetch }   from '../hooks/useFetch'
import { getPerfil, updatePerfil, changePassword } from '../api/perfil.service'
import { login, getUser } from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const initials = (n) => n?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

const fmtFecha = (d) => d
  ? new Date(d).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
  : 'Nunca'

export default function Perfil() {
  const { data: perfil, loading, error, refresh } = useFetch(getPerfil)

  const [nombre,   setNombre]   = useState('')
  const [savingN,  setSavingN]  = useState(false)

  const [pass,     setPass]     = useState({ actual: '', nueva: '', confirmar: '' })
  const [showPass, setShowPass] = useState({ actual: false, nueva: false, confirmar: false })
  const [savingP,  setSavingP]  = useState(false)

  const toggleShow = (field) => setShowPass(s => ({ ...s, [field]: !s[field] }))

  if (perfil && nombre === '') setNombre(perfil.nombre)

  const handleNombre = async e => {
    e.preventDefault()
    if (!nombre.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSavingN(true)
    try {
      const { data } = await updatePerfil({ nombre: nombre.trim() })
      const session = getUser()
      login({ ...session, nombre: data.nombre })
      toast.success('Nombre actualizado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar')
    } finally { setSavingN(false) }
  }

  const handlePassword = async e => {
    e.preventDefault()
    if (pass.nueva !== pass.confirmar) { toast.error('Las contraseñas nuevas no coinciden'); return }
    if (pass.nueva.length < 6)        { toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return }
    setSavingP(true)
    try {
      await changePassword({ actual: pass.actual, nueva: pass.nueva })
      toast.success('Contraseña cambiada correctamente')
      setPass({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña')
    } finally { setSavingP(false) }
  }

  if (loading) return <Spinner text="Cargando perfil..."/>
  if (error)   return <EmptyState title="Error" description={error}/>

  const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

  const PasswordField = ({ field, label, placeholder }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={showPass[field] ? 'text' : 'password'}
          value={pass[field]}
          onChange={e => setPass(p => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className={`${inputCls} pr-10`}
        />
        <button type="button" onClick={() => toggleShow(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {showPass[field] ? <EyeOff size={15}/> : <Eye size={15}/>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona tu información y seguridad</p>
      </div>

      {/* Card de información */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-slate-800 dark:bg-slate-600 flex items-center justify-center text-white font-bold text-xl">
            {initials(perfil.nombre)}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">{perfil.nombre}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{perfil.correo}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              {perfil.rol}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { icon: <Mail   size={15}/>, label: 'Correo',          value: perfil.correo },
            { icon: <Shield size={15}/>, label: 'Rol',             value: perfil.rol },
            { icon: <Clock  size={15}/>, label: 'Último acceso',   value: fmtFecha(perfil.ultimo_login) },
            { icon: <User   size={15}/>, label: 'Miembro desde',   value: fmtFecha(perfil.created_at) },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
              <span className="mt-0.5 text-slate-400 dark:text-slate-500">{item.icon}</span>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{item.label}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editar nombre */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <User size={16} className="text-slate-400"/> Editar nombre
        </h2>
        <form onSubmit={handleNombre} className="flex gap-3">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            className={inputCls}
          />
          <button type="submit" disabled={savingN || nombre === perfil?.nombre}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
            <Save size={15}/>
            {savingN ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Key size={16} className="text-slate-400"/> Cambiar contraseña
        </h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <PasswordField field="actual"    label="Contraseña actual *"   placeholder="Tu contraseña actual"/>
          <PasswordField field="nueva"     label="Nueva contraseña *"     placeholder="Mínimo 6 caracteres"/>
          <PasswordField field="confirmar" label="Confirmar contraseña *" placeholder="Repite la nueva contraseña"/>
          <button type="submit" disabled={savingP || !pass.actual || !pass.nueva}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
            <Key size={15}/>
            {savingP ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

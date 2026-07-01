import { useState } from 'react'
import { User, Mail, Shield, Clock, Key, Save, Eye, EyeOff } from 'lucide-react'
import { useFetch }   from '../hooks/useFetch'
import { getPerfil, updatePerfil, changePassword } from '../api/perfil.service'
import { login, getUser } from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const initials = (n) =>
  (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

const fmtFecha = (d) => d
  ? new Date(d).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  : 'Nunca'

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

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
      login({ ...getUser(), nombre: data.nombre })
      toast.success('Nombre actualizado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar')
    } finally { setSavingN(false) }
  }

  const handlePassword = async e => {
    e.preventDefault()
    if (pass.nueva !== pass.confirmar) {
      toast.error('Las contraseñas nuevas no coinciden'); return
    }
    if (pass.nueva.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return
    }
    setSavingP(true)
    try {
      await changePassword({ actual: pass.actual, nueva: pass.nueva })
      toast.success('Contraseña cambiada correctamente')
      setPass({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña')
    } finally { setSavingP(false) }
  }

  if (loading) return <Spinner text="Cargando perfil..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const PasswordField = ({ field, label, placeholder }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={showPass[field] ? 'text' : 'password'}
          value={pass[field]}
          onChange={e => setPass(p => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className={`${inputCls} pr-10`}
        />
        <button type="button" onClick={() => toggleShow(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2
            text-faint hover:text-muted transition-colors"
        >
          {showPass[field] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Mi perfil</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          Información personal y seguridad
        </p>
      </div>

      {/* Card de información */}
      <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-6">
        {/* Avatar + datos */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="h-[60px] w-[60px] rounded-[14px] shrink-0
            bg-gradient-to-br from-primary to-indigo-800
            flex items-center justify-center text-white font-bold text-[20px]"
          >
            {initials(perfil.nombre)}
          </div>
          <div>
            <p className="text-[18px] font-semibold text-ink">{perfil.nombre}</p>
            <p className="text-[13px] text-muted">{perfil.correo}</p>
            <span className="inline-flex items-center gap-1.5 mt-1.5
              font-mono text-[11px] font-semibold px-2.5 py-[5px] rounded-badge
              bg-primary/10 text-primary"
            >
              <Shield size={10} />
              {perfil.rol}
            </span>
          </div>
        </div>

        {/* Meta-datos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Mail,   label: 'Correo',        value: perfil.correo },
            { icon: Shield, label: 'Rol',            value: perfil.rol },
            { icon: Clock,  label: 'Último acceso',  value: fmtFecha(perfil.ultimo_login) },
            { icon: User,   label: 'Miembro desde',  value: fmtFecha(perfil.created_at) },
          ].map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-surface2 flex items-center
                justify-center shrink-0 mt-0.5"
              >
                <Icon size={14} className="text-faint" />
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-0.5">
                  {label}
                </p>
                <p className="text-[13px] font-medium text-ink">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editar nombre */}
      <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-6">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink mb-4">
          <User size={15} className="text-faint" />
          Editar nombre
        </h2>
        <form onSubmit={handleNombre} className="flex gap-3">
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            className={`flex-1 ${inputCls}`}
          />
          <button type="submit"
            disabled={savingN || nombre === perfil?.nombre}
            className="flex items-center gap-2 px-4 h-10 bg-primary hover:bg-primary-hover
              disabled:opacity-40 text-white rounded-control text-[13px]
              font-semibold shadow-btn transition-colors"
          >
            <Save size={14} />
            {savingN ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-6">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink mb-4">
          <Key size={15} className="text-faint" />
          Cambiar contraseña
        </h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <PasswordField
            field="actual"    label="Contraseña actual *"
            placeholder="Tu contraseña actual"
          />
          <PasswordField
            field="nueva"     label="Nueva contraseña *"
            placeholder="Mínimo 6 caracteres"
          />
          <PasswordField
            field="confirmar" label="Confirmar contraseña *"
            placeholder="Repite la nueva contraseña"
          />
          <button type="submit"
            disabled={savingP || !pass.actual || !pass.nueva}
            className="w-full h-10 flex items-center justify-center gap-2
              bg-ink/90 hover:bg-ink disabled:opacity-40 text-bg
              rounded-control text-[13px] font-semibold transition-colors"
          >
            <Key size={14} />
            {savingP ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

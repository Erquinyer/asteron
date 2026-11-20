import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Logo } from '../components/Logo'

// Debe coincidir con POLITICA_DATOS_VERSION en backend/src/utils/politicaDatos.js
export const POLITICA_DATOS_VERSION = '1.0'
const VIGENTE_DESDE = '13 de noviembre de 2026'

// Canal de atención de consultas y reclamos — confirmar con Macromet antes de la entrega
export const CORREO_DATOS = 'protecciondedatos@macromet.com.co'

// enApp: usa los colores del tema de la aplicación (claro/oscuro) en lugar del fondo oscuro fijo
const Seccion = ({ titulo, enApp, children }) => (
  <section className="space-y-2">
    <h2 className={`text-base font-semibold ${enApp ? 'text-ink' : 'text-white'}`}>{titulo}</h2>
    <div className={`space-y-2 text-sm leading-relaxed ${enApp ? 'text-muted' : 'text-slate-300'}`}>
      {children}
    </div>
  </section>
)

// Contenido de la política, separado para reutilizarlo en el modal de autorización
export const ContenidoPolitica = ({ enApp = false }) => (
  <div className="space-y-6">
    <Seccion enApp={enApp} titulo="1. Responsable del tratamiento">
      <p>
        <strong>Macromet S.A.S.</strong>, con domicilio en Bogotá, Colombia, es responsable del
        tratamiento de los datos personales registrados en Asteron, su sistema de gestión de
        producción. Canal de atención: <strong>{CORREO_DATOS}</strong>.
      </p>
    </Seccion>

    <Seccion enApp={enApp} titulo="2. Datos que se tratan">
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Colaboradores (usuarios):</strong> nombre, correo corporativo, código de empleado, cargo, fecha del último acceso y registros de actividad en planta (turnos asignados, horas de inicio y fin, correcciones de tiempo).</li>
        <li><strong>Contactos de clientes:</strong> nombre, cargo, correo y teléfono de las personas de contacto de cada cliente.</li>
      </ul>
      <p>Asteron no recolecta datos sensibles ni datos de niñas, niños o adolescentes.</p>
    </Seccion>

    <Seccion enApp={enApp} titulo="3. Finalidades">
      <ul className="list-disc pl-5 space-y-1">
        <li>Controlar el acceso al sistema y las funciones permitidas según el cargo.</li>
        <li>Programar actividades de planta y asignarlas a trabajadores y equipos.</li>
        <li>Registrar tiempos de trabajo y generar reportes de horas, avance de proyectos y mantenimientos.</li>
        <li>Gestionar pedidos y la comunicación con los clientes.</li>
        <li>Enviar mensajes del sistema, como la recuperación de contraseña y las alertas de producción.</li>
      </ul>
    </Seccion>

    <Seccion enApp={enApp} titulo="4. Derechos del titular (art. 8, Ley 1581 de 2012)">
      <ul className="list-disc pl-5 space-y-1">
        <li>Conocer, actualizar y rectificar sus datos personales.</li>
        <li>Solicitar prueba de la autorización otorgada.</li>
        <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
        <li>Revocar la autorización o pedir la supresión de sus datos cuando no exista un deber legal o contractual de conservarlos.</li>
        <li>Acceder de forma gratuita a sus datos personales.</li>
      </ul>
    </Seccion>

    <Seccion enApp={enApp} titulo="5. Consultas y reclamos">
      <p>
        Las solicitudes se envían a <strong>{CORREO_DATOS}</strong> indicando nombre, identificación
        y la petición concreta.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Consultas:</strong> se responden en máximo 10 días hábiles, prorrogables 5 días hábiles más (art. 14).</li>
        <li><strong>Reclamos</strong> (corrección, actualización o supresión): se responden en máximo 15 días hábiles, prorrogables 8 días hábiles más (art. 15).</li>
      </ul>
    </Seccion>

    <Seccion enApp={enApp} titulo="6. Seguridad de la información">
      <p>
        Las contraseñas se guardan cifradas con un algoritmo de hash (bcrypt), el acceso exige una
        sesión con token y cada cargo solo ve los módulos y datos que necesita para su trabajo.
        Solo el personal autorizado de Macromet administra la información.
      </p>
    </Seccion>

    <Seccion enApp={enApp} titulo="7. Vigencia">
      <p>
        Versión {POLITICA_DATOS_VERSION}, vigente desde el {VIGENTE_DESDE}. Los datos se conservan
        mientras dure la relación laboral o comercial y el tiempo que exija la ley. Si la política
        cambia, se le pedirá autorizar la nueva versión al iniciar sesión.
      </p>
    </Seccion>
  </div>
)

export default function PoliticaDatos() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Volver
        </button>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 sm:px-10 py-10">
          <div className="flex justify-center mb-6">
            <Logo variant="dark" stacked size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white text-center">
              Política de Tratamiento de Datos Personales
            </h1>
          </div>
          <p className="text-sm text-slate-400 text-center mb-8">
            En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013
          </p>

          <ContenidoPolitica />
        </div>

        <p className="mt-8 text-xs text-slate-600 text-center">
          © {new Date().getFullYear()} Asteron · Macromet S.A.S. ·{' '}
          <Link to="/" className="hover:text-slate-400">Inicio</Link>
        </p>
      </div>
    </div>
  )
}

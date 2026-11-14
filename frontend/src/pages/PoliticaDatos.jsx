import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { POLITICA_DATOS as P } from '../config/politicaDatos'
import { isAuthenticated } from '../utils/auth'

// Política de tratamiento de datos personales — Ley 1581 de 2012 y
// Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015). Página pública:
// se puede consultar sin iniciar sesión, desde el login y desde la landing.
const Seccion = ({ titulo, children }) => (
  <section className="space-y-2">
    <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
    <div className="text-[14px] leading-relaxed text-muted space-y-2">{children}</div>
  </section>
)

export default function PoliticaDatos() {
  const volver = isAuthenticated() ? { to: '/dashboard', texto: 'Volver al panel' } : { to: '/login', texto: 'Volver al inicio de sesión' }

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <article className="max-w-3xl mx-auto bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-6 sm:p-10 space-y-7">
        <Link to={volver.to} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ArrowLeft size={14} /> {volver.texto}
        </Link>

        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={20} />
            <span className="font-mono text-[11px] uppercase tracking-[.06em]">Ley 1581 de 2012</span>
          </div>
          <h1 className="text-[22px] font-semibold text-ink">Política de tratamiento de datos personales</h1>
          <p className="text-[13px] text-muted">Versión {P.version} · Vigente desde el {P.vigencia}</p>
        </header>

        <Seccion titulo="1. Responsable del tratamiento">
          <p>
            {P.responsable}, con domicilio en {P.ciudad}, es responsable de los datos personales que se
            registran en Asteron, su sistema de gestión de producción. Las consultas y reclamos los atiende
            la {P.area} en el correo <span className="font-medium text-ink">{P.correo}</span>.
          </p>
        </Seccion>

        <Seccion titulo="2. Datos que se tratan">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-ink">Personas usuarias del sistema:</strong> nombre, correo corporativo, código de empleado, cargo, fecha del último ingreso y registros de trabajo en planta (actividades asignadas, horas de inicio y fin, avance).</li>
            <li><strong className="text-ink">Contactos de clientes:</strong> razón social, NIT, nombre, teléfono y correo de los contactos, y direcciones de entrega.</li>
          </ul>
          <p>Asteron no recolecta datos sensibles (salud, origen étnico, orientación política o religiosa, datos biométricos) ni datos de niños, niñas y adolescentes.</p>
        </Seccion>

        <Seccion titulo="3. Finalidades">
          <ul className="list-disc pl-5 space-y-1">
            <li>Controlar el acceso al sistema según el cargo de cada persona.</li>
            <li>Programar y hacer seguimiento a las actividades de producción, sus tiempos y su costo de mano de obra.</li>
            <li>Gestionar pedidos, proyectos y entregas de los clientes.</li>
            <li>Generar reportes internos de producción, avance y mantenimiento.</li>
            <li>Enviar mensajes relacionados con la cuenta, como la recuperación de contraseña.</li>
          </ul>
        </Seccion>

        <Seccion titulo="4. Derechos de los titulares (artículo 8 de la Ley 1581)">
          <ul className="list-disc pl-5 space-y-1">
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
            <li>Revocar la autorización o pedir la supresión de sus datos cuando no exista un deber legal o contractual de conservarlos.</li>
            <li>Acceder de forma gratuita a sus datos.</li>
          </ul>
        </Seccion>

        <Seccion titulo="5. Autorización">
          <p>
            Cada persona usuaria acepta esta política la primera vez que ingresa a Asteron. El sistema guarda la
            fecha y hora de la aceptación como prueba de la autorización. Los datos de contactos de clientes se
            registran con la autorización que el cliente otorga a {P.responsable} dentro de la relación comercial.
          </p>
        </Seccion>

        <Seccion titulo="6. Consultas y reclamos">
          <p><strong className="text-ink">Consultas:</strong> se responden en máximo 10 días hábiles desde su recibo, prorrogables por 5 días hábiles más si no es posible atenderlas en ese plazo, informando el motivo.</p>
          <p><strong className="text-ink">Reclamos</strong> (corrección, actualización, supresión o incumplimiento): se atienden en máximo 15 días hábiles, prorrogables por 8 días hábiles más, informando el motivo.</p>
          <p>Ambos se envían a <span className="font-medium text-ink">{P.correo}</span> con el nombre, la identificación del titular, la descripción de la solicitud y un medio de respuesta.</p>
        </Seccion>

        <Seccion titulo="7. Seguridad de la información">
          <p>
            Las contraseñas se guardan cifradas, cada persona solo accede a los módulos de su cargo, las sesiones
            vencen automáticamente y la base de datos tiene copias de seguridad periódicas. Los datos no se venden
            ni se ceden a terceros.
          </p>
        </Seccion>

        <Seccion titulo="8. Vigencia">
          <p>
            Esta política rige desde el {P.vigencia}. Los datos se conservan mientras exista la relación laboral o
            comercial y durante el tiempo que exijan las normas contables y laborales. Cualquier cambio se publica en
            esta misma página.
          </p>
        </Seccion>
      </article>
    </div>
  )
}

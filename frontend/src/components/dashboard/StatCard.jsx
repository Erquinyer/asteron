import { Folder, ClipboardList, Settings, Users } from 'lucide-react'

// Mapa de estilos por color
const colorMap = {
  blue:   { card: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   bar: 'bg-blue-500'   },
  amber:  { card: 'bg-amber-50',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600',  bar: 'bg-amber-500'  },
  green:  { card: 'bg-green-50',  iconBg: 'bg-green-100',  iconText: 'text-green-600',  bar: 'bg-green-500'  },
  purple: { card: 'bg-purple-50', iconBg: 'bg-purple-100', iconText: 'text-purple-600', bar: 'bg-purple-500' },
}

// Mapa de íconos por nombre
const iconMap = {
  folder:    Folder,
  clipboard: ClipboardList,
  cog:       Settings,
  users:     Users,
}

const StatCard = ({ label, value, total, suffix, color, icon }) => {
  const styles  = colorMap[color] || colorMap.blue
  const Icon    = iconMap[icon]   || Folder
  const percent = Math.round((value / total) * 100)

  return (
    <div className={`${styles.card} rounded-xl p-5 flex flex-col gap-4`}>
      {/* Ícono + label */}
      <div className="flex items-center justify-between">
        <div className={`${styles.iconBg} ${styles.iconText} p-2.5 rounded-lg`}>
          <Icon size={20} />
        </div>
        <span className="text-xs text-slate-400 font-medium">{suffix}</span>
      </div>

      {/* Número principal */}
      <div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-white rounded-full h-1.5">
        <div
          className={`${styles.bar} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default StatCard

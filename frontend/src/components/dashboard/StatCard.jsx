import { Link } from 'react-router-dom'
import { Folder, ClipboardList, Settings, Users, ArrowRight } from 'lucide-react'

const colorMap = {
  blue:   { card: 'bg-blue-50 dark:bg-blue-950/30',    iconBg: 'bg-blue-100 dark:bg-blue-900/40',    iconText: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500',   hover: 'hover:bg-blue-100/70 dark:hover:bg-blue-900/20'   },
  amber:  { card: 'bg-amber-50 dark:bg-amber-950/30',   iconBg: 'bg-amber-100 dark:bg-amber-900/40',   iconText: 'text-amber-600 dark:text-amber-400',   bar: 'bg-amber-500',  hover: 'hover:bg-amber-100/70 dark:hover:bg-amber-900/20'  },
  green:  { card: 'bg-green-50 dark:bg-green-950/30',   iconBg: 'bg-green-100 dark:bg-green-900/40',   iconText: 'text-green-600 dark:text-green-400',   bar: 'bg-green-500',  hover: 'hover:bg-green-100/70 dark:hover:bg-green-900/20'  },
  purple: { card: 'bg-purple-50 dark:bg-purple-950/30', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconText: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', hover: 'hover:bg-purple-100/70 dark:hover:bg-purple-900/20' },
}

const iconMap = {
  folder:    Folder,
  clipboard: ClipboardList,
  cog:       Settings,
  users:     Users,
}

const StatCard = ({ label, value, total, suffix, color, icon, to }) => {
  const styles  = colorMap[color] || colorMap.blue
  const Icon    = iconMap[icon]   || Folder
  const percent = Math.round((value / total) * 100)

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className={`${styles.iconBg} ${styles.iconText} p-2.5 rounded-lg`}>
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{suffix}</span>
          {to && <ArrowRight size={13} className={`${styles.iconText} opacity-0 group-hover:opacity-100 transition-opacity`} />}
        </div>
      </div>

      <div>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>

      <div className="w-full bg-white dark:bg-slate-700/50 rounded-full h-1.5">
        <div
          className={`${styles.bar} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={`group ${styles.card} ${styles.hover} rounded-xl p-5 flex flex-col gap-4 transition-colors cursor-pointer`}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={`${styles.card} rounded-xl p-5 flex flex-col gap-4`}>
      {inner}
    </div>
  )
}

export default StatCard

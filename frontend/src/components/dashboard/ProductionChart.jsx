import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const RANGE_OPTIONS = [
  { id: '7d',  label: '7 días' },
  { id: '14d', label: '2 sem'  },
]

const ChartTooltip = ({ active, payload, dark }) => {
  if (!active || !payload?.length) return null
  const bg   = dark ? '#10141F' : '#FFFFFF'
  const brd  = dark ? '#222839' : '#E7E9F2'
  const text = dark ? '#ECEFF8' : '#161A2B'
  const sub  = dark ? '#98A0B8' : '#5A6178'
  const programado = payload.find(p => p.dataKey === 'programado')?.value ?? 0
  const real       = payload.find(p => p.dataKey === 'real')?.value ?? 0
  return (
    <div style={{
      background: bg, border: `1px solid ${brd}`, borderRadius: 10,
      padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: text, marginBottom: 4 }}>
        {payload[0]?.payload?.name}
      </p>
      <p style={{ fontSize: 11, color: sub, fontFamily: 'Geist Mono, monospace' }}>Programado {programado}h</p>
      <p style={{ fontSize: 11, color: sub, fontFamily: 'Geist Mono, monospace' }}>Real {real}h</p>
    </div>
  )
}

// charts: { produccion7dias, produccion14dias } — ver dashboard.controller.js
const ProductionChart = ({ charts, dark }) => {
  const [range, setRange] = useState('7d')

  const serie = range === '7d' ? charts?.produccion7dias : charts?.produccion14dias

  const { totalProgramado, totalReal, desviacionPct } = useMemo(() => {
    const rows = serie || []
    const prog = rows.reduce((s, r) => s + r.programado, 0)
    const real = rows.reduce((s, r) => s + r.real, 0)
    const desv = prog > 0 ? Math.round(((real - prog) / prog) * 100) : 0
    return { totalProgramado: prog.toFixed(1), totalReal: real.toFixed(1), desviacionPct: desv }
  }, [serie])

  const axisColor = dark ? '#646C86' : '#9097AD'

  // Etiqueta "real/programado" sobre cada par de barras (solo en vista de 7 días: en
  // 2 semanas 14 pares se amontonan y el texto deja de ser legible).
  const PairLabel = (props) => {
    const { x, y, width, index } = props
    const row = serie?.[index]
    if (!row) return null
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle"
        fontSize={9} fontFamily="Geist Mono, monospace" fill={axisColor}
      >
        {row.real}/{row.programado}
      </text>
    )
  }

  if (!charts) return null

  return (
    <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-[18px]">
      <div className="flex flex-wrap items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Carga de producción</h3>
          <p className="font-mono text-[10px] text-faint tracking-[.08em] uppercase mt-0.5">
            Horas-máquina · {range === '7d' ? 'Últimos 7 días' : 'Últimas 2 semanas'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-mono text-[10px] text-faint">Programado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-mono text-[10px] text-faint">Real</span>
          </div>
          <div className="flex gap-0.5 p-0.5 bg-surface2 border border-border rounded-control">
            {RANGE_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setRange(o.id)}
                className={`px-2 py-1 rounded-[6px] text-[10.5px] font-medium transition-colors
                  ${range === o.id ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={serie} barGap={3} barCategoryGap={range === '7d' ? '30%' : '18%'}
          margin={{ top: 14, right: 4, left: -16, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10.5, fill: axisColor, fontFamily: 'Geist Mono, monospace' }}
            axisLine={false} tickLine={false}
            interval={range === '14d' ? 1 : 0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor, fontFamily: 'Geist Mono, monospace' }}
            axisLine={false} tickLine={false} width={24}
          />
          <Tooltip
            cursor={{ fill: dark ? '#171C2B' : '#F4F5FB', radius: 6 }}
            content={<ChartTooltip dark={dark} />}
          />
          <Bar dataKey="programado" fill="#4F46E5" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="real" fill="#06B6D4" radius={[4, 4, 0, 0]} isAnimationActive={false}
            label={range === '7d' ? PairLabel : false}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-border">
        <div>
          <p className="font-mono text-[9.5px] text-faint uppercase tracking-[.06em]">Programado</p>
          <p className="text-[13px] font-semibold text-ink tabular-nums">{totalProgramado}h</p>
        </div>
        <div>
          <p className="font-mono text-[9.5px] text-faint uppercase tracking-[.06em]">Real</p>
          <p className="text-[13px] font-semibold text-ink tabular-nums">{totalReal}h</p>
        </div>
        <div>
          <p className="font-mono text-[9.5px] text-faint uppercase tracking-[.06em]">Desviación</p>
          <p className={`text-[13px] font-semibold tabular-nums
            ${desviacionPct < 0 ? 'text-warning' : desviacionPct > 0 ? 'text-error' : 'text-ink'}`}
          >
            {desviacionPct >= 0 ? '+' : ''}{desviacionPct}%
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProductionChart

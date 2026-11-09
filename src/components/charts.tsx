import { useMemo, useState } from 'react'
import { tr } from '@/lib/i18n'

/* ---------------- Area chart (two series) ---------------- */

interface Series {
  name: string
  color: string
  values: number[]
}

export function AreaChart({
  labels,
  series,
  height = 260,
}: {
  labels: string[]
  series: Series[]
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const padX = 12
  const padTop = 20
  const padBottom = 30

  const max = useMemo(
    () => Math.max(...series.flatMap((s) => s.values)) * 1.15,
    [series]
  )
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const x = (i: number) => padX + (i / (labels.length - 1)) * innerW
  const y = (v: number) => padTop + innerH - (v / max) * innerH

  const path = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ')

  const area = (values: number[]) =>
    `${path(values)} L${x(values.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${padX},${(padTop + innerH).toFixed(1)} Z`

  const ticks = [0, 1, 2, 3].map((i) => (max / 4) * (i + 1))

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - rect.left) / rect.width) * W
          const i = Math.round(((px - padX) / innerW) * (labels.length - 1))
          setHover(Math.max(0, Math.min(labels.length - 1, i)))
        }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`ag-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y(t)}
              y2={y(t)}
              stroke="hsl(40 18% 84%)"
              strokeDasharray="3 5"
            />
            <text
              x={W - padX}
              y={y(t) - 5}
              textAnchor="end"
              className="num"
              fontSize="11"
              fill="hsl(218 14% 42%)"
            >
              {(t / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {series.map((s, i) => (
          <path key={i} d={area(s.values)} fill={`url(#ag-${i})`} />
        ))}
        {series.map((s, i) => (
          <path
            key={i}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {labels.map((l, i) =>
          i % 2 === 0 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11.5"
              fill="hsl(218 14% 40%)"
            >
              {l}
            </text>
          ) : null
        )}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padTop}
              y2={padTop + innerH}
              stroke="hsl(40 12% 70%)"
            />
            {series.map((s, i) => (
              <circle
                key={i}
                cx={x(hover)}
                cy={y(s.values[hover])}
                r="4.5"
                fill={s.color}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border bg-white px-3 py-2 text-xs shadow-lg"
          style={{ insetInlineStart: `${(x(hover) / W) * 100}%` }}
        >
          <div className="mb-1 font-bold">{labels[hover]}</div>
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground">{tr(s.name)}</span>
              <span className="num ms-auto font-bold">
                {s.values[hover].toLocaleString('en-US')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Donut chart ---------------- */

export function DonutChart({
  segments,
  size = 190,
  centerLabel,
  centerValue,
}: {
  segments: { name: string; value: number; color: string }[]
  size?: number
  centerLabel: string
  centerValue: string
}) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const R = size / 2 - 14
  const C = 2 * Math.PI * R
  let acc = 0

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="hsl(42 22% 91%)" strokeWidth="17" />
        {segments.map((s, i) => {
          const frac = s.value / total
          const dash = `${frac * C} ${C}`
          const offset = -acc * C
          acc += frac
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="17"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          )
        })}
        <g className="rotate-90" style={{ transformOrigin: 'center' }}>
          <text x="50%" y="47%" textAnchor="middle" fontSize="13" fill="hsl(218 14% 40%)">
            {tr(centerLabel)}
          </text>
          <text x="50%" y="58%" textAnchor="middle" fontSize="19" fontWeight="800" className="num" fill="hsl(219 48% 16%)">
            {centerValue}
          </text>
        </g>
      </svg>
      <ul className="space-y-2.5 text-sm">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted-foreground">{tr(s.name)}</span>
            <span className="num ms-auto font-bold">
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- Sparkline ---------------- */

export function Sparkline({ values, color, width = 130, height = 40 }: {
  values: number[]
  color: string
  width?: number
  height?: number
}) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * width).toFixed(1)},${(
          height - 4 - ((v - min) / range) * (height - 8)
        ).toFixed(1)}`
    )
    .join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

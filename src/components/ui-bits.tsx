import type { ReactNode } from 'react'
import { tr } from '@/lib/i18n'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  spark,
}: {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
  spark?: ReactNode
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-white p-4">
      <div className="text-[13px] font-medium text-muted-foreground">{tr(label)}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="num text-[22px] font-extrabold leading-none tracking-tight">{value}</div>
        {spark}
      </div>
      {delta !== undefined && (
        <div
          className={cn(
            'mt-2.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          )}
        >
          {delta >= 0 ? (
            <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
          )}
          {Math.abs(delta)}%
          {deltaLabel && <span className="font-medium text-muted-foreground">{tr(deltaLabel)}</span>}
        </div>
      )}
    </div>
  )
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border bg-white', className)}>
      {title && (
        <header className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-extrabold">{typeof title === 'string' ? tr(title) : title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

const toneMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function StatusBadge({ label, tone }: { label: string; tone: keyof typeof toneMap }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold', toneMap[tone])}>
      {tr(label)}
    </span>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-muted-foreground">{tr(text)}</div>
  )
}

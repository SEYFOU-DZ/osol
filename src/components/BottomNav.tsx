import {
  LayoutDashboard,
  Boxes,
  HandCoins,
  Package,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { PageKey } from '@/types/nav'

const items: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { key: 'assets', label: 'الأصول', icon: Boxes },
  { key: 'debts', label: 'الديون', icon: HandCoins },
  { key: 'warehouse', label: 'المستودع', icon: Package },
  { key: 'invoices', label: 'الفواتير', icon: FileText },
]

export function BottomNav({
  page, onNavigate, warehouse = true, invoices = true,
}: {
  page: PageKey
  onNavigate: (p: PageKey) => void
  warehouse?: boolean
  invoices?: boolean
}) {
  const visible = items.filter((i) => (i.key !== 'warehouse' || warehouse) && (i.key !== 'invoices' || invoices))
  return (
    <nav
      aria-label={tr('التنقل السفلي')}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0,1fr))` }}>
        {visible.map((item) => {
          const active = page === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[60px] flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon
                className={cn('h-[22px] w-[22px]', active && 'stroke-[2.3]')}
                strokeWidth={active ? 2.3 : 1.8}
              />
              {tr(item.label)}
              <span
                className={cn(
                  'h-1 w-1 rounded-full transition-colors',
                  active ? 'bg-primary' : 'bg-transparent'
                )}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

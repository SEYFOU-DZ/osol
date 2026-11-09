import { useState } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, X, Boxes, HandCoins, FileText, Package, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QuickAction = 'asset' | 'entry' | 'invoice' | 'item' | 'cashbox'

const actions: { key: QuickAction; label: string; icon: typeof Plus; go: string }[] = [
  { key: 'asset', label: 'أصل جديد', icon: Boxes, go: 'assets' },
  { key: 'entry', label: 'قيد له / عليه', icon: HandCoins, go: 'debts' },
  { key: 'invoice', label: 'فاتورة جديدة', icon: FileText, go: 'invoices' },
  { key: 'item', label: 'صنف مستودع', icon: Package, go: 'warehouse' },
  { key: 'cashbox', label: 'صندوق نقدي', icon: Landmark, go: 'dashboard' },
]

export function QuickAddFab({
  onAction,
}: {
  onAction: (a: QuickAction) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-20 end-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:end-6">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => {
                setOpen(false)
                onAction(a.key)
              }}
              className="flex items-center gap-2.5 rounded-full border bg-white py-2 pe-4 ps-3 text-sm font-bold shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            >
              <span className="text-foreground">{tr(a.label)}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <a.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? tr('إغلاق قائمة الإضافة السريعة') : tr('إضافة سريعة')}
        aria-expanded={open}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform duration-200 active:scale-90',
          open && 'rotate-45'
        )}
      >
        {open ? <X className="h-6 w-6" strokeWidth={2.4} /> : <Plus className="h-7 w-7" strokeWidth={2.4} />}
      </button>
    </div>
  )
}

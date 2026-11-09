import { useState, useEffect } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Warehouse as WarehouseIcon, Pencil, Trash2 } from 'lucide-react'
import { StatCard, SectionCard, StatusBadge, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ItemFormDialog, MovementDialog } from '@/components/forms'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { store, fmtSAR, fmtNum, fmtDate, uid, type DB, type Workspace, type StockItem, type Warehouse } from '@/lib/store'
import { syncDeleteStockItem } from '@/lib/sync'

export function WarehousePage({ db, ws, whLimit = -1 }: { db: DB; ws: Workspace; whLimit?: number }) {
  const [tab, setTab] = useState<'items' | 'movements'>('items')
  const [q, setQ] = useState('')
  const [addItem, setAddItem] = useState(false)
  const [editItem, setEditItem] = useState<StockItem | undefined>()
  const [restock, setRestock] = useState<StockItem | null>(null)
  const [whId, setWhId] = useState<string>('')
  const [addWh, setAddWh] = useState(false)
  const [renameWh, setRenameWh] = useState<Warehouse | null>(null)

  const warehouses = db.warehouses.filter((w) => w.wsId === ws.id)
  const activeWh = warehouses.find((w) => w.id === whId) ?? warehouses[0] ?? null
  // الأصناف القديمة بلا مستودع تُعرض في المستودع الأول
  const itemWh = (s: StockItem) => s.warehouseId ?? warehouses[0]?.id
  const items = db.stock.filter((s) => s.wsId === ws.id && itemWh(s) === activeWh?.id)
  const allItems = db.stock.filter((s) => s.wsId === ws.id)
  const filtered = items.filter((s) => !q || s.name.includes(q) || s.sku.includes(q) || s.category.includes(q))
  const totalValue = items.reduce((a, s) => a + s.quantity * s.unitPrice, 0)
  const low = items.filter((s) => s.quantity < s.minQuantity)
  const whMovements = db.movements
    .filter((m) => m.wsId === ws.id && allItems.find((s) => s.id === m.itemId && itemWh(s) === activeWh?.id))
    .slice().reverse()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr('قيمة المخزون (هذا المستودع)')} value={fmtSAR(totalValue)} />
        <StatCard label={tr('عدد الأصناف')} value={`${items.length}`} />
        <StatCard label={tr('المستودعات')} value={`${warehouses.length}${whLimit === -1 ? '' : ` / ${whLimit}`}`} />
        <StatCard label={tr('حركات هذا الشهر')} value={`${whMovements.filter((m) => m.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).length}`} />
      </div>

      {/* اختيار المستودع */}
      <div className="flex flex-wrap items-center gap-2">
        {warehouses.map((w) => (
          <button
            key={w.id}
            onClick={() => setWhId(w.id)}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
              activeWh?.id === w.id
                ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A] shadow-md'
                : 'bg-card text-muted-foreground hover:border-[#D8B36A]/60 hover:text-foreground'
            }`}
          >
            <WarehouseIcon className="h-4 w-4" />
            {w.name}
            <span className="num rounded-full px-1.5 text-[11px] bg-white/10">{allItems.filter((s) => itemWh(s) === w.id).length}</span>
            {activeWh?.id === w.id && (
              <span
                role="button"
                aria-label={tr('إعادة تسمية المستودع')}
                className="rounded p-0.5 hover:bg-white/10"
                onClick={(e) => { e.stopPropagation(); setRenameWh(w) }}
              >
                <Pencil className="h-3 w-3" />
              </span>
            )}
          </button>
        ))}
        {warehouses.length === 0 && (
          <p className="text-sm text-muted-foreground">{tr('لا توجد مستودعات بعد — أنشئ مستودعك الأول')}</p>
        )}
        <Button
          size="sm" variant="outline" onClick={() => setAddWh(true)} className="gap-1"
          disabled={whLimit !== -1 && warehouses.length >= whLimit}
          title={whLimit !== -1 && warehouses.length >= whLimit ? `حد الباقة: ${whLimit} مستودعات` : ''}
        >
          <Plus className="h-3.5 w-3.5" /> {tr('مستودع جديد')}
        </Button>
      </div>

      {activeWh === null ? (
        <SectionCard title={tr('المستودع')}>
          <EmptyState text={tr('أنشئ مستودعاً لتبدأ إدارة الأصناف والكميات')} />
        </SectionCard>
      ) : (
      <>
      {low.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="num">{low.length}</span> {tr('أصناف وصلت حد إعادة الطلب ويُنصح بالتوريد العاجل.')}
        </div>
      )}

      <SectionCard
        title={`${activeWh.name}`}
        action={
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="items">{tr('الأصناف')}</TabsTrigger>
                <TabsTrigger value="movements">{tr('الحركات')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => { setEditItem(undefined); setAddItem(true) }} className="gap-1"><Plus className="h-3.5 w-3.5" /> {tr('صنف')}</Button>
          </div>
        }
      >
        {tab === 'items' ? (
          <>
            <div className="border-b px-4 py-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('ابحث بالاسم أو SKU أو الفئة…')} className="h-9 max-w-sm text-sm" />
            </div>
            {filtered.length === 0 ? (
              <EmptyState text="لا توجد أصناف مطابقة في هذا المستودع" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-start text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-start font-semibold">{tr('الصنف')}</th>
                      <th className="px-4 py-2.5 text-start font-semibold">SKU</th>
                      <th className="px-4 py-2.5 text-start font-semibold">{tr('المخزون')}</th>
                      <th className="px-4 py-2.5 text-end font-semibold">{tr('سعر الوحدة')}</th>
                      <th className="px-4 py-2.5 text-end font-semibold">{tr('القيمة')}</th>
                      <th className="px-4 py-2.5 text-end font-semibold">{tr('الحالة')}</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const ratio = s.minQuantity > 0 ? Math.min(s.quantity / (s.minQuantity * 2), 1) : 1
                      const isLow = s.quantity < s.minQuantity
                      return (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-bold">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.category}</div>
                          </td>
                          <td className="num px-4 py-3 text-muted-foreground">{s.sku}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={ratio * 100} className={`h-1.5 w-20 ${isLow ? '[&>div]:bg-red-500' : ''}`} />
                              <span className="num text-xs font-bold">{fmtNum(s.quantity)}</span>
                            </div>
                          </td>
                          <td className="num px-4 py-3 text-end">{fmtSAR(s.unitPrice)}</td>
                          <td className="num px-4 py-3 text-end font-black">{fmtSAR(s.quantity * s.unitPrice)}</td>
                          <td className="px-4 py-3 text-end">{isLow ? <StatusBadge label={tr('إعادة طلب')} tone="red" /> : <StatusBadge label={tr('متوفر')} tone="emerald" />}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => setRestock(s)}>{tr('توريد')}</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setEditItem(s); setAddItem(true) }}>{tr('تعديل')}</Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                                if (!confirm(tr('هل أنت متأكد من حذف هذا الصنف؟'))) return
                                store.set((db) => { db.stock = db.stock.filter((x) => x.id !== s.id) })
                                syncDeleteStockItem(s.id)
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {whMovements.length === 0 ? (
              <EmptyState text="لا توجد حركات بعد في هذا المستودع — إصدار فاتورة بيع يسجّل حركة خروج تلقائياً" />
            ) : (
              <ul className="divide-y">
                {whMovements.map((m) => {
                  const item = allItems.find((s) => s.id === m.itemId)
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {m.type === 'in' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{item?.name ?? tr('صنف محذوف')}</div>
                        <div className="num text-xs text-muted-foreground">{m.ref} · {fmtDate(m.date)}</div>
                      </div>
                      <span className={`num font-black ${m.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.type === 'in' ? '+' : '−'}{fmtNum(m.qty)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </SectionCard>
      </>
      )}

      <ItemFormDialog open={addItem} onClose={() => setAddItem(false)} wsId={ws.id} item={editItem} warehouseId={activeWh?.id} />
      <MovementDialog open={!!restock} onClose={() => setRestock(null)} wsId={ws.id} item={restock} />
      <WarehouseNameDialog key="new" open={addWh} onClose={() => setAddWh(false)} wsId={ws.id} />
      <WarehouseNameDialog key={renameWh?.id ?? 'none'} open={!!renameWh} onClose={() => setRenameWh(null)} wsId={ws.id} warehouse={renameWh} />
    </div>
  )
}

/* إنشاء / إعادة تسمية مستودع */
function WarehouseNameDialog({ open, onClose, wsId, warehouse }: { open: boolean; onClose: () => void; wsId: string; warehouse?: Warehouse | null }) {
  const [name, setName] = useState(warehouse?.name ?? '')
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setName(warehouse?.name ?? ''); setErr('') } }, [open]) // eslint-disable-line
  const submit = () => {
    if (!name.trim()) return setErr(tr('أدخل اسم المستودع'))
    store.set((db) => {
      if (warehouse) {
        const w = db.warehouses.find((x) => x.id === warehouse.id)
        if (w) w.name = name.trim()
      } else {
        db.warehouses.push({ id: uid(), wsId, name: name.trim() })
      }
    })
    setName(''); setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{warehouse ? tr('إعادة تسمية المستودع') : tr('مستودع جديد')}</DialogTitle>
          <DialogDescription>{tr('مثال: مستودع الرياض، مستودع جدة، فرع المدينة…')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{tr('اسم المستودع')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>}
          <Button className="w-full" onClick={submit}>{warehouse ? tr('حفظ') : tr('إنشاء المستودع')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

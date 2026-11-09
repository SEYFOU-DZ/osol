import { useState, useMemo } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, Search, Pencil, ReceiptText, Share2, Printer, Trash2 } from 'lucide-react'
import { StatCard, SectionCard, EmptyState } from '@/components/ui-bits'
import { DonutChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { AssetFormDialog, AssetExpenseDialog } from '@/components/forms'
import { AssetShareDialog, collectData, printSaleInvoice } from '@/components/AssetShare'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { store, fmtSAR, fmtNum, fmtDate, type DB, type Workspace, type Asset } from '@/lib/store'
import { syncDeleteAsset } from '@/lib/sync'

const colors = ['#101C32', '#D8B36A', '#3D5A80', '#B08D3E', '#98A4BB', '#E7D9BC']

export function AssetsPage({ db, ws }: { db: DB; ws: Workspace }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'cars' | 're' | 'other'>('all')
  const [preset, setPreset] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | undefined>()
  const [detail, setDetail] = useState<string | null>(null)
  const [expenseFor, setExpenseFor] = useState<string | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)

  const CORE = ['سيارات', 'عقار']
  const assets = db.assets.filter((a) => a.wsId === ws.id)
  const inTab = (a: Asset) =>
    tab === 'all' ? true : tab === 'cars' ? a.category === 'سيارات' : tab === 're' ? a.category === 'عقار' : !CORE.includes(a.category)
  const filtered = assets.filter(inTab).filter((a) => !q || a.name.includes(q) || a.category.includes(q) || (a.code ?? '').includes(q))
  const asset = assets.find((a) => a.id === detail)

  const tabCount = (t: typeof tab) => assets.filter((a) => (t === 'all' ? true : t === 'cars' ? a.category === 'سيارات' : t === 're' ? a.category === 'عقار' : !CORE.includes(a.category))).length
  const tabs = [
    ['all', 'الكل'], ['cars', 'السيارات'], ['re', 'العقارات'], ['other', 'أخرى'],
  ] as const
  const presetFor = (t: typeof tab) => (t === 'cars' ? 'سيارات' : t === 're' ? 'عقار' : t === 'other' ? 'أخرى' : '')

  const cur = (a: Asset) => a.currency ?? 'ر.س'
  const fmtCur = (a: Asset, v: number) => `${v.toLocaleString('en-US')} ${tr(cur(a))}`

  const total = assets.filter((a) => !a.sold).reduce((x, a) => x + a.currentValue, 0)
  const paidTotal = assets.reduce((x, a) => x + a.purchaseValue + a.expenses.reduce((y, e) => y + e.amount, 0), 0)
  const profitsTotal = assets.filter((a) => a.sold).reduce((x, a) => x + (a.soldPrice ?? 0) - a.purchaseValue - a.expenses.reduce((y, e) => y + e.amount, 0), 0)

  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    assets.forEach((a) => m.set(a.category, (m.get(a.category) ?? 0) + a.currentValue))
    return [...m.entries()].map(([name, value]) => ({ name, value }))
  }, [assets])

  // تقرير مجمّع لكل فئة: شراء + مصاريف + مدفوع + قيمة حالية + أرباح البيع
  const report = useMemo(() => {
    const m = new Map<string, { count: number; sold: number; purchase: number; expenses: number; paid: number; current: number; profit: number }>()
    assets.forEach((a) => {
      const exp = a.expenses.reduce((y, e) => y + e.amount, 0)
      const g = m.get(a.category) ?? { count: 0, sold: 0, purchase: 0, expenses: 0, paid: 0, current: 0, profit: 0 }
      g.count += 1
      g.purchase += a.purchaseValue
      g.expenses += exp
      g.paid += a.purchaseValue + exp
      if (a.sold) {
        g.sold += 1
        g.profit += (a.soldPrice ?? 0) - a.purchaseValue - exp
      } else {
        g.current += a.currentValue
      }
      m.set(a.category, g)
    })
    return [...m.entries()]
  }, [assets])
  const sumR = (k: 'count' | 'purchase' | 'expenses' | 'paid' | 'current' | 'profit') => report.reduce((a, [, g]) => a + g[k], 0)

  const expensesTotal = asset ? asset.expenses.reduce((x, e) => x + e.amount, 0) : 0
  const totalPaid = asset ? asset.purchaseValue + expensesTotal : 0
  const dateState = (d?: string): { label: string; cls: string } | null => {
    if (!d) return null
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (days < 0) return { label: `منتهي منذ ${-days} يوم`, cls: 'bg-red-50 text-red-700' }
    if (days <= 30) return { label: `ينتهي خلال ${days} يوم`, cls: 'bg-amber-50 text-amber-700' }
    return { label: `ساري — متبقٍ ${days} يوم`, cls: 'bg-emerald-50 text-emerald-700' }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label={tr('القيمة الحالية الإجمالية')} value={fmtSAR(total)} />
        <StatCard label={tr('إجمالي المدفوع (شراء + مصاريف)')} value={fmtSAR(paidTotal)} />
        <StatCard label={tr('عدد الأصول')} value={`${assets.length}`} />
        <StatCard label={tr('فئات الأصول')} value={`${byCat.length}`} />
        <StatCard label={tr('أرباح المبيعات (المُباعة)')} value={`${profitsTotal >= 0 ? '' : '−'}${fmtSAR(Math.abs(profitsTotal))}`} />
      </div>

      {/* تبويبات تقسيم الأصول */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`num flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
              tab === k
                ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A] shadow-md'
                : 'bg-card text-muted-foreground hover:border-[#D8B36A]/60 hover:text-foreground'
            }`}
          >
            {tr(label)}
            <span className={`rounded-full px-1.5 text-[11px] ${tab === k ? 'bg-[#D8B36A]/20' : 'bg-muted'}`}>{tabCount(k)}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title={tr('الأصول حسب الفئة')} className="xl:col-span-1">
          <div className="flex items-center justify-center p-4">
            {byCat.length === 0 ? <EmptyState text="لا توجد أصول" /> : (
              <DonutChart
                segments={byCat.map((c, i) => ({ ...c, color: colors[i % colors.length] }))}
                centerLabel={tr('قيمة الأصول')}
                centerValue={`${(total / 1000).toFixed(0)}k`}
                size={170}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title={<>{tr('سجل الأصول')} ({filtered.length})</>}
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('بحث…')} className="h-8 w-36 ps-8 text-xs" />
              </div>
              <Button size="sm" onClick={() => { setEditAsset(undefined); setPreset(presetFor(tab)); setFormOpen(true) }} className="gap-1"><Plus className="h-3.5 w-3.5" /> {tr('أصل')}</Button>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <EmptyState text="لا توجد أصول مطابقة" />
          ) : (
            <ul className="divide-y">
              {filtered.map((a) => {
                const spent = a.purchaseValue + a.expenses.reduce((x, e) => x + e.amount, 0)
                const ratio = spent > 0 ? Math.min(a.currentValue / spent, 1) : 1
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <button className="min-w-0 flex-1 text-start" onClick={() => setDetail(a.id)}>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{a.name}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{tr(a.category)}</span>
                        {a.code && <span className="num rounded-full bg-[#101C32] px-2 py-0.5 text-[10px] font-bold text-[#D8B36A]">{a.code}</span>}
                        {a.sold && <span className="rounded-full bg-slate-500 px-2 py-0.5 text-[10px] font-bold text-white">{tr('مُباعة')}</span>}
                        {a.category === 'عقار' && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.occupancy === 'rented' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.occupancy === 'rented' ? <>{tr('مؤجر')}{a.rentAmount ? <> · {a.rentAmount.toLocaleString('en-US')} {tr('ر.س')}/{tr('شهر')}</> : null}</> : tr('شاغر')}
                          </span>
                        )}
                      </div>
                      <div className="num mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Progress value={ratio * 100} className="h-1.5 w-24" />
                        {tr('القيمة الحالية')} {fmtCur(a, a.currentValue)} · {tr('المدفوع عليه')} {fmtSAR(spent)}
                      </div>
                    </button>
                    <div className="num hidden text-end text-sm font-black sm:block">{fmtCur(a, a.currentValue)}</div>
                    <Button variant="ghost" size="sm" aria-label={tr('مشاركة التقرير')} title={tr('مشاركة التقرير مع الشريك')} onClick={() => setShareId(a.id)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={tr('تعديل')} onClick={() => { setEditAsset(a); setFormOpen(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tr('حذف')}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!confirm(tr('هل أنت متأكد من حذف هذا الأصل؟'))) return
                        store.set((db) => { db.assets = db.assets.filter((x) => x.id !== a.id) })
                        syncDeleteAsset(a.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* تقرير الأصول المجمّع */}
      <SectionCard title={<>{tr('تقرير الأصول حسب الفئة — شراء ومصاريف وأرباح')} ({report.length})</>}>
        {report.length === 0 ? <EmptyState text="لا توجد أصول مسجلة" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-[#101C32] text-white">
                  <th className="rounded-tr-xl px-4 py-2.5 text-start text-xs font-black">{tr('الفئة')}</th>
                  <th className="num px-3 py-2.5 text-center text-xs font-black">{tr('العدد')}</th>
                  <th className="num px-3 py-2.5 text-end text-xs font-black">{tr('الشراء')}</th>
                  <th className="num px-3 py-2.5 text-end text-xs font-black">{tr('المصاريف')}</th>
                  <th className="num px-3 py-2.5 text-end text-xs font-black">{tr('المدفوع')}</th>
                  <th className="num px-3 py-2.5 text-end text-xs font-black">{tr('القيمة الحالية')}</th>
                  <th className="num rounded-tl-xl px-3 py-2.5 text-end text-xs font-black">{tr('أرباح البيع')}</th>
                </tr>
              </thead>
              <tbody>
                {report.map(([cat, g]) => (
                  <tr key={cat} className="border-b border-[#101C32]/8 last:border-0">
                    <td className="px-4 py-2.5 font-bold">
                      {tr(cat)}
                      {g.sold > 0 && <span className="num ms-2 rounded-full bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{g.sold} {tr('مباعة')}</span>}
                    </td>
                    <td className="num px-3 py-2.5 text-center">{g.count}</td>
                    <td className="num px-3 py-2.5 text-end">{fmtNum(g.purchase)}</td>
                    <td className="num px-3 py-2.5 text-end">{fmtNum(g.expenses)}</td>
                    <td className="num px-3 py-2.5 text-end font-bold">{fmtNum(g.paid)}</td>
                    <td className="num px-3 py-2.5 text-end font-bold">{fmtNum(g.current)}</td>
                    <td className={`num px-3 py-2.5 text-end font-black ${g.profit > 0 ? 'text-emerald-700' : g.profit < 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                      {g.sold > 0 ? `${fmtNum(Math.abs(g.profit))} ${g.profit >= 0 ? tr('ربح') : tr('خسارة')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#D8B36A]/10 font-black">
                  <td className="rounded-br-xl px-4 py-2.5">{tr('الإجمالي')}</td>
                  <td className="num px-3 py-2.5 text-center">{sumR('count')}</td>
                  <td className="num px-3 py-2.5 text-end">{fmtNum(sumR('purchase'))}</td>
                  <td className="num px-3 py-2.5 text-end">{fmtNum(sumR('expenses'))}</td>
                  <td className="num px-3 py-2.5 text-end">{fmtNum(sumR('paid'))}</td>
                  <td className="num px-3 py-2.5 text-end">{fmtNum(sumR('current'))}</td>
                  <td className={`num rounded-bl-xl px-3 py-2.5 text-end ${profitsTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtNum(Math.abs(profitsTotal))} {profitsTotal >= 0 ? tr('ربح') : tr('خسارة')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
      <Dialog open={!!asset} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {asset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {asset.name}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{tr(asset.category)}</span>
                  {asset.code && <span className="num rounded-full bg-[#101C32] px-2 py-0.5 text-[11px] font-bold text-[#D8B36A]">{asset.code}</span>}
                </DialogTitle>
              </DialogHeader>

              {/* بيانات البيع */}
              {asset.sold && (
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-black text-slate-600">{tr('مُباعة بـ')} <span className="num">{fmtNum(asset.soldPrice ?? 0)} {cur(asset)}</span></span>
                    <div className="flex items-center gap-2">
                      <span className="num text-xs text-muted-foreground">{asset.soldDate ? fmtDate(asset.soldDate) : ''}</span>
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" onClick={() => printSaleInvoice(collectData(asset, ws))}>
                        <Printer className="h-3 w-3" /> {tr('تصدير فاتورة بيع')}
                      </Button>
                    </div>
                  </div>
                  <div className="num mt-1 text-xs font-bold text-slate-500">
                    {(() => {
                      const net = (asset.soldPrice ?? 0) - totalPaid
                      return <>{tr('صافي نتيجة البيع:')} {fmtNum(Math.abs(net))} {cur(asset)} {net >= 0 ? tr('(ربح)') : tr('(خسارة)')}</>
                    })()}
                  </div>
                </div>
              )}
              {/* بيانات المركبة */}
              {asset.category === 'سيارات' && (
                <div className="rounded-xl border border-[#D8B36A]/40 bg-[#D8B36A]/5 p-3">
                  <div className="num grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-white p-2 text-center">
                      <div className="text-muted-foreground">{tr('رقم اللوحة')}</div>
                      <div className="mt-0.5 text-sm font-black text-navy">{asset.plateNo ?? '—'}</div>
                    </div>
                    {([
                      ['التأمين', asset.insuranceUntil],
                      ['الفحص الدوري', asset.inspectionUntil],
                      ['الاستمارة', asset.registrationUntil],
                    ] as const).map(([label, d]) => {
                      const st = dateState(d)
                      return (
                        <div key={label} className={`rounded-lg p-2 text-center ${st?.cls ?? 'bg-white text-muted-foreground'}`}>
                          <div className="opacity-80">{tr(label)}</div>
                          <div className="num mt-0.5 text-[11px] font-black">{fmtDate(d)}</div>
                          {st && <div className="mt-0.5 text-[10px] font-bold">{st.label}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-muted/60 p-3">
                  <div className="text-xs text-muted-foreground">{tr('قيمة الشراء')}</div>
                  <div className="num mt-1 font-black">{fmtCur(asset, asset.purchaseValue)}</div>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <div className="text-xs text-muted-foreground">{tr('مصاريف مسجلة')}</div>
                  <div className="num mt-1 font-black">{fmtSAR(expensesTotal)}</div>
                </div>
                <div className="rounded-xl bg-[#101C32] p-3 text-white">
                  <div className="text-xs text-white/60">{tr('إجمالي المدفوع')}</div>
                  <div className="num mt-1 font-black text-[#D8B36A]">{fmtSAR(totalPaid)}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-[#D8B36A]/50 bg-[#D8B36A]/10 px-4 py-2.5 text-sm">
                <span className="font-bold">{asset.sold ? tr('بِعناها بـ') : tr('القيمة السوقية الحالية')}</span>
                <span className="num text-lg font-black">{fmtCur(asset, asset.sold ? asset.soldPrice ?? 0 : asset.currentValue)}</span>
              </div>
              {asset.category === 'عقار' && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5 text-sm">
                  <span className="font-bold">{tr('حالة العقار')}</span>
                  <span className={`num font-black ${asset.occupancy === 'rented' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {asset.occupancy === 'rented' ? <>{tr('مؤجر')}{asset.rentAmount ? <> — {asset.rentAmount.toLocaleString('en-US')} {tr('ر.س')}/{tr('شهر')}</> : null}</> : tr('شاغر')}
                  </span>
                </div>
              )}
              {asset.notes && (
                <div className="mt-2 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{tr('ملاحظات:')} </span>{asset.notes}
                </div>
              )}

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-black">{tr('سجل المصاريف')}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShareId(asset.id)} className="gap-1">
                      <Share2 className="h-3.5 w-3.5" /> {tr('مشاركة')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setExpenseFor(asset.id)} className="gap-1">
                      <ReceiptText className="h-3.5 w-3.5" /> {tr('مصروف جديد')}
                    </Button>
                  </div>
                </div>
                {asset.expenses.length === 0 ? (
                  <EmptyState text="لا توجد مصاريف مسجلة على هذا الأصل" />
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {asset.expenses.map((e) => (
                      <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <div className="font-semibold">{e.label}</div>
                          <div className="num text-xs text-muted-foreground">{e.date}</div>
                        </div>
                        <span className="num font-black">{fmtSAR(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AssetFormDialog
        key={editAsset ? `edit-${editAsset.id}` : `new-${preset || 'default'}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        wsId={ws.id}
        asset={editAsset}
        initialCategory={preset || undefined}
      />
      <AssetShareDialog open={!!shareId} onClose={() => setShareId(null)} asset={assets.find((a) => a.id === shareId) ?? null} ws={ws} />
      <AssetExpenseDialog open={!!expenseFor} onClose={() => setExpenseFor(null)} assetId={expenseFor ?? ''} />
    </div>
  )
}

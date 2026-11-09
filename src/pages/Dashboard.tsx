import { useState, useEffect } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, CalendarClock, FileWarning, AlertTriangle, Landmark, Eye, EyeOff, X, ArrowDownLeft, ArrowUpRight, History } from 'lucide-react'
import { SectionCard, EmptyState } from '@/components/ui-bits'
import { AreaChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { CashboxFormDialog } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  store, fmtSAR, fmtNum, fmtDate, netWorth, workspaceAlerts, dismissAlert, uid, today, pushAudit,
  type DB, type Workspace, type Cashbox,
} from '@/lib/store'

const cashflow = [
  { m: 'يناير', inflow: 42000, outflow: 26500 }, { m: 'فبراير', inflow: 38500, outflow: 24100 },
  { m: 'مارس', inflow: 46800, outflow: 30200 }, { m: 'أبريل', inflow: 41200, outflow: 27800 },
  { m: 'مايو', inflow: 52300, outflow: 31400 }, { m: 'يونيو', inflow: 47900, outflow: 33900 },
  { m: 'يوليو', inflow: 55600, outflow: 29800 }, { m: 'أغسطس', inflow: 61100, outflow: 35200 },
  { m: 'سبتمبر', inflow: 58400, outflow: 37100 }, { m: 'أكتوبر', inflow: 64200, outflow: 33500 },
  { m: 'نوفمبر', inflow: 59600, outflow: 38400 }, { m: 'ديسمبر', inflow: 68300, outflow: 35900 },
]

export function Dashboard({ db, ws, onNavigate }: { db: DB; ws: Workspace; onNavigate: (p: 'assets' | 'debts' | 'warehouse' | 'invoices' | 'reports') => void }) {
  const [addBox, setAddBox] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [adj, setAdj] = useState<{ boxId: string; value: string } | null>(null)
  const [txnBox, setTxnBox] = useState<Cashbox | null>(null)
  const [logBox, setLogBox] = useState<Cashbox | null>(null)

  const nw = netWorth(db, ws.id)
  const mask = (v: number) => (hidden ? '•••••' : fmtSAR(v))

  const adjustBalance = (boxId: string) => {
    const v = Number(adj?.value) || 0
    if (!v) return
    store.set((db2) => {
      const b = db2.cashboxes.find((x) => x.id === boxId)
      if (b) b.balance = v
      pushAudit(db2, ws.id, `تعديل رصيد صندوق إلى ${v.toLocaleString('en-US')} ر.س`)
    })
    setAdj(null)
  }

  return (
    <div className="space-y-4">
      {/* بطاقة صافي الثروة */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1424] via-[#101C32] to-[#16233D] p-6 text-white shadow-lg">
        {/* زخارف خلفية */}
        <div className="pointer-events-none absolute -start-16 -top-16 h-56 w-56 rounded-full bg-[#D8B36A]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -end-10 h-56 w-56 rounded-full bg-[#D8B36A]/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-transparent via-[#D8B36A]/70 to-transparent" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D8B36A]" />
                <span className="text-xs font-bold tracking-wide text-[#D8B36A]">{tr('صافي الثروة')}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-white/50">{ws.name}</div>
            </div>
            <button onClick={() => setHidden((h) => !h)} aria-label={hidden ? tr('إظهار الأرقام') : tr('إخفاء الأرقام')} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="num mt-3 text-5xl font-black tracking-tight text-[#D8B36A] drop-shadow-sm">
            {mask(nw.net)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-white/45">
            <Landmark className="h-3.5 w-3.5" />
            {tr('إجمالي ما تملكه المنشأة الآن بعد خصم الالتزامات')}
          </div>

          {/* صف الأرقام — مفصول بخطوط رفيعة */}
          <div className="num mt-5 grid grid-cols-2 divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] sm:grid-cols-5 sm:divide-x sm:divide-x-reverse">
            {[
              [tr('الأصول'), nw.assets, 'text-white'],
              [tr('لنا عليهم'), nw.receivables, 'text-emerald-300'],
              [tr('الصناديق'), nw.boxes, 'text-white'],
              [tr('لهم علينا'), -nw.liabilities, 'text-red-300'],
              [tr('أرباح المبيعات'), nw.profits, nw.profits >= 0 ? 'text-emerald-300' : 'text-red-300'],
            ].map(([k, v, c], i) => (
              <div key={k as string} className={`px-4 py-3 ${i < 4 ? 'border-b border-white/10 sm:border-b-0' : ''} ${i % 2 === 0 ? 'border-e border-white/10 sm:border-e-0' : ''}`}>
                <div className="text-[10px] font-semibold text-white/45">{k}</div>
                <div className={`num mt-0.5 text-base font-black ${c}`}>{hidden ? '•••••' : `${(v as number).toLocaleString('en-US')}`}</div>
              </div>
            ))}
          </div>

          <p className="num mt-3 text-[11px] leading-relaxed text-white/40">
            {tr('المعادلة: الأصول')} {fmtNum(nw.assets)} + {tr('المستحقات')} {fmtNum(nw.receivables)} + {tr('الصناديق')} {fmtNum(nw.boxes)} + {tr('المخزون')} {fmtNum(nw.stock)} + {tr('فواتير قيد التحصيل')} {fmtNum(nw.invoicesReceivable)}{nw.profits !== 0 && <> + {tr('أرباح المبيعات')} {fmtNum(nw.profits)}</>} − {tr('الالتزامات')} {fmtNum(nw.liabilities)}
          </p>
        </div>
      </section>

      {/* التنبيهات — قابلة للإغفال */}
      {(() => {
        const alerts = workspaceAlerts(db, ws.id).filter((a) => !db.dismissed.includes(a.id))
        if (alerts.length === 0) return null
        return (
          <section className="space-y-2">
            {alerts.map((a) => {
              const Icon = a.kind === 'due' ? CalendarClock : a.kind === 'invoice' ? FileWarning : AlertTriangle
              const cls = a.kind === 'due'
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              return (
                <div key={a.id} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${cls}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => onNavigate(a.page)}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{a.title}</span>
                      <span className="num block text-xs opacity-80">{a.sub}</span>
                    </span>
                  </button>
                  <button
                    aria-label={tr('إغفال التنبيه')}
                    onClick={() => dismissAlert(a.id)}
                    className="rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </section>
        )
      })()}

      {/* التدفق النقدي */}
      <SectionCard
        title={tr('التدفق النقدي')}
        action={
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#101C32]" /> {tr('الوارد')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D8B36A]" /> {tr('الصادر')}</span>
          </div>
        }
      >
        <div className="p-4">
          <AreaChart
            labels={cashflow.map((c) => tr(c.m))}
            series={[
              { name: tr('الوارد'), color: '#101C32', values: cashflow.map((c) => c.inflow) },
              { name: tr('الصادر'), color: '#D8B36A', values: cashflow.map((c) => c.outflow) },
            ]}
            height={220}
          />
        </div>
      </SectionCard>

      {/* الصناديق */}
      <SectionCard
        title={tr('أرصدة الصناديق')}
        action={<Button size="sm" variant="outline" onClick={() => setAddBox(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> {tr('صندوق')}</Button>}
      >
        {db.cashboxes.filter((c) => c.wsId === ws.id).length === 0 ? (
          <EmptyState text="لا توجد صناديق بعد — أضف صندوقك الأول" />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {db.cashboxes.filter((c) => c.wsId === ws.id).map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Landmark className="h-4 w-4 text-[#B08D3E]" />
                  {c.name}
                </div>
                {adj?.boxId === c.id ? (
                  <div className="mt-2 flex gap-2">
                    <Input type="number" dir="ltr" className="num h-8 text-right" value={adj.value} onChange={(e) => setAdj({ boxId: c.id, value: e.target.value })} autoFocus />
                    <Button size="sm" onClick={() => adjustBalance(c.id)}>{tr('حفظ')}</Button>
                  </div>
                ) : (
                  <button onClick={() => setAdj({ boxId: c.id, value: String(c.balance) })} title={tr('اضغط لتعديل الرصيد')} className="num mt-1 block text-2xl font-black hover:text-primary">
                    {hidden ? '•••••' : fmtSAR(c.balance)}
                  </button>
                )}
                <div className="mt-1 text-[11px] text-muted-foreground">{tr('اضغط على الرصيد لتعديله يدوياً')}</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setTxnBox(c)} className="h-7 flex-1 gap-1 px-2 text-[11px]">
                    <Plus className="h-3 w-3" /> {tr('إضافة حركة')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLogBox(c)} className="h-7 gap-1 px-2 text-[11px]">
                    <History className="h-3 w-3" /> {tr('السجل')}
                  </Button>
                </div>
                <div className="num mt-1.5 text-[10px] text-muted-foreground">
                  {db.cashboxTxns.filter((t) => t.boxId === c.id).length} {tr('حركة مسجلة')}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ملخصات سريعة */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: tr('الأصول المسجلة'), value: db.assets.filter((a) => a.wsId === ws.id).length, go: 'assets' as const },
          { label: tr('أشخاص بكشوف حساب'), value: db.people.filter((p) => p.wsId === ws.id).length, go: 'debts' as const },
          { label: tr('أصناف المستودع'), value: db.stock.filter((s) => s.wsId === ws.id).length, go: 'warehouse' as const },
          { label: tr('فواتير هذا العام'), value: db.invoices.filter((i) => i.wsId === ws.id).length, go: 'invoices' as const },
        ].map((s) => (
          <button key={s.label} onClick={() => onNavigate(s.go)} className="rounded-xl border bg-card p-4 text-start transition-shadow hover:shadow-md">
            <div className="num text-2xl font-black">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      <CashboxFormDialog open={addBox} onClose={() => setAddBox(false)} wsId={ws.id} />
      <CashboxTxnDialog box={txnBox} onClose={() => setTxnBox(null)} />
      <CashboxLogDialog box={logBox} txns={db.cashboxTxns} onClose={() => setLogBox(null)} />
    </div>
  )
}

/* ---------------- حركات الصناديق ---------------- */

function CashboxTxnDialog({ box, onClose }: { box: Cashbox | null; onClose: () => void }) {
  const [type, setType] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { if (box) { setAmount(''); setNote(''); setErr(''); setType('in') } }, [box]) // eslint-disable-line

  const submit = () => {
    const v = Number(amount) || 0
    if (!box) return
    if (v <= 0) return setErr(tr('أدخل مبلغاً صحيحاً'))
    if (type === 'out' && v > box.balance) return setErr(tr('المبلغ أكبر من رصيد الصندوق'))
    store.set((db) => {
      const b = db.cashboxes.find((x) => x.id === box.id)
      if (!b) return
      b.balance += type === 'in' ? v : -v
      db.cashboxTxns.push({ id: uid(), boxId: box.id, type, amount: v, note: note.trim(), date: today() })
      pushAudit(db, b.wsId, `${type === 'in' ? 'إيداع' : 'سحب'} ${v.toLocaleString('en-US')} ر.س في صندوق «${b.name}»`)
    })
    setAmount(''); setNote(''); setErr(''); setType('in')
    onClose()
  }

  return (
    <Dialog open={!!box} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('إضافة حركة')} — {box?.name}</DialogTitle>
          <DialogDescription>{tr('سجّل إيداعاً أو سحباً — يُحدَّث الرصيد تلقائياً ويُحفظ في السجل.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('in')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all ${type === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-card text-muted-foreground'}`}
            >
              <ArrowDownLeft className="h-4 w-4" /> {tr('إيداع')}
            </button>
            <button
              onClick={() => setType('out')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all ${type === 'out' ? 'border-red-400 bg-red-50 text-red-700' : 'bg-card text-muted-foreground'}`}
            >
              <ArrowUpRight className="h-4 w-4" /> {tr('سحب')}
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>{tr('المبلغ (ر.س)')}</Label>
            <Input type="number" dir="ltr" className="num text-right" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>{tr('ملاحظة (اختياري)')}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('مثال: إيداع مبيعات اليوم')} />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>}
          <div className="num flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5 text-sm">
            <span className="font-bold">{tr('الرصيد بعد الحركة')}</span>
            <span className="font-black">
              {fmtSAR((box?.balance ?? 0) + (type === 'in' ? 1 : -1) * (Number(amount) || 0))}
            </span>
          </div>
          <Button className="w-full" onClick={submit}>{tr('حفظ الحركة')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CashboxLogDialog({ box, txns, onClose }: { box: Cashbox | null; txns: DB['cashboxTxns']; onClose: () => void }) {
  const list = box ? txns.filter((t) => t.boxId === box.id).slice().reverse() : []
  return (
    <Dialog open={!!box} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('سجل حركات')} — {box?.name}</DialogTitle>
          <DialogDescription>{tr('كل الإيداعات والسحبات المسجلة على هذا الصندوق.')}</DialogDescription>
        </DialogHeader>
        {list.length === 0 ? (
          <EmptyState text="لا توجد حركات مسجلة بعد — استخدم «إضافة حركة»" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {list.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {t.type === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.note || (t.type === 'in' ? tr('إيداع') : tr('سحب'))}</div>
                  <div className="num text-xs text-muted-foreground">{fmtDate(t.date)}</div>
                </div>
                <span className={`num font-black ${t.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {t.type === 'in' ? '+' : '−'}{fmtNum(t.amount)} ر.س
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

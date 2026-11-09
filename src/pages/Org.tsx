import { useState } from 'react'
import { tr } from '@/lib/i18n'
import {
  BarChart3, Download, Users, Crown, Check, MessageCircle, Send, Plus,
} from 'lucide-react'
import { StatCard, SectionCard, StatusBadge, EmptyState } from '@/components/ui-bits'
import { AreaChart, DonutChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MemberFormDialog, WorkspaceFormDialog } from '@/components/forms'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  store, fmtSAR, netWorth, entryRemaining, uid, today,
  type DB, type Workspace, type User,
} from '@/lib/store'
import { LogoMark } from '@/components/Logo'

/* ================= التقارير ================= */

const flow = [
  { m: 'يناير', inflow: 42000, outflow: 26500 }, { m: 'فبراير', inflow: 38500, outflow: 24100 },
  { m: 'مارس', inflow: 46800, outflow: 30200 }, { m: 'أبريل', inflow: 41200, outflow: 27800 },
  { m: 'مايو', inflow: 52300, outflow: 31400 }, { m: 'يونيو', inflow: 47900, outflow: 33900 },
  { m: 'يوليو', inflow: 55600, outflow: 29800 }, { m: 'أغسطس', inflow: 61100, outflow: 35200 },
  { m: 'سبتمبر', inflow: 58400, outflow: 37100 }, { m: 'أكتوبر', inflow: 64200, outflow: 33500 },
  { m: 'نوفمبر', inflow: 59600, outflow: 38400 }, { m: 'ديسمبر', inflow: 68300, outflow: 35900 },
]

export function ReportsPage({ db, ws }: { db: DB; ws: Workspace }) {
  const nw = netWorth(db, ws.id)
  const segments = [
    { name: tr('الأصول'), value: nw.assets, color: '#101C32' },
    { name: tr('الصناديق'), value: nw.boxes, color: '#D8B36A' },
    { name: tr('المخزون'), value: nw.stock, color: '#3D5A80' },
    { name: tr('مستحقات وأخرى'), value: nw.receivables + nw.invoicesReceivable, color: '#B08D3E' },
  ].filter((s) => s.value > 0)

  const debtors = db.people
    .filter((p) => p.wsId === ws.id)
    .map((p) => {
      const es = db.entries.filter((e) => e.personId === p.id)
      const for_ = es.filter((e) => e.direction === 'for').reduce((a, e) => a + entryRemaining(e), 0) // له علينا
      const ag = es.filter((e) => e.direction === 'against').reduce((a, e) => a + entryRemaining(e), 0) // لنا عليه
      return { person: p, net: ag - for_ }
    })
    .filter((d) => d.net !== 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))

  const exportCsv = () => {
    const rows = [
      [tr('البند'), tr('القيمة (ر.س)')],
      [tr('الأصول'), nw.assets], [tr('لنا عليهم'), nw.receivables], [tr('الصناديق'), nw.boxes],
      [tr('المخزون'), nw.stock], [tr('فواتير قيد التحصيل'), nw.invoicesReceivable],
      [tr('لهم علينا (له)'), -nw.liabilities], [tr('صافي الثروة'), nw.net],
    ]
    const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `osool-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black"><BarChart3 className="h-5 w-5 text-[#B08D3E]" /> {tr('التقارير المالية')}</h2>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> {tr('تصدير CSV')}</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr('صافي الثروة')} value={fmtSAR(nw.net)} />
        <StatCard label={tr('إجمالي الأصول والممتلكات')} value={fmtSAR(nw.assets + nw.stock)} />
        <StatCard label={tr('إجمالي السيولة')} value={fmtSAR(nw.boxes)} />
        <StatCard label={tr('صافي المستحقات')} value={fmtSAR(nw.receivables + nw.invoicesReceivable - nw.liabilities)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={tr('التوزيعة المالية لصافي الثروة')}>
          <div className="flex items-center justify-center p-5">
            {segments.length === 0 ? <EmptyState text="لا توجد بيانات" /> : (
              <DonutChart segments={segments} centerLabel="صافي الثروة" centerValue={`${(nw.net / 1000).toFixed(0)}k`} size={180} />
            )}
          </div>
        </SectionCard>
        <SectionCard title={tr('التدفقات الشهرية')} action={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#101C32]" /> {tr('وارد')}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#D8B36A]" /> {tr('صادر')}</span>
          </div>
        }>
          <div className="p-4">
            <AreaChart
              labels={flow.map((c) => tr(c.m))}
              series={[
                { name: tr('الوارد'), color: '#101C32', values: flow.map((c) => c.inflow) },
                { name: tr('الصادر'), color: '#D8B36A', values: flow.map((c) => c.outflow) },
              ]}
              height={210}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title={tr('أكبر الكشوف المستحقة')}>
        {debtors.length === 0 ? (
          <EmptyState text="لا توجد كشوف مستحقة" />
        ) : (
          <ul className="divide-y">
            {debtors.slice(0, 8).map(({ person, net }) => (
              <li key={person.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{person.name}</span>
                <span className={`num font-black ${net > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {net > 0 ? <>{tr('لنا عليه')} {fmtSAR(net)}</> : <>{tr('له علينا')} {fmtSAR(-net)}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

/* ================= الإعدادات ================= */

export function SettingsPage({
  db, ws, user, onSwitchWs,
}: { db: DB; ws: Workspace; user: User; onSwitchWs: (id: string) => void }) {
  const [addMember, setAddMember] = useState(false)
  const [addWs, setAddWs] = useState(false)
  const [rateFrom, setRateFrom] = useState('')
  const [rateTo, setRateTo] = useState('')
  const [rateVal, setRateVal] = useState('')
  const prefs = user.prefs ?? {}
  const setPrefs = (pp: NonNullable<User['prefs']>) => store.set((db2) => {
    const u = db2.users.find((x) => x.id === user.id)
    if (u) u.prefs = { ...u.prefs, ...pp }
  })
  const myRates = db.exchangeRates.filter((r) => r.wsId === ws.id)
  const addRate = () => {
    const v = Number(rateVal) || 0
    if (!rateFrom.trim() || !rateTo.trim() || v <= 0) return
    store.set((db2) => {
      db2.exchangeRates.push({ id: uid(), wsId: ws.id, from: rateFrom.trim(), to: rateTo.trim(), rate: v })
    })
    setRateFrom(''); setRateTo(''); setRateVal('')
  }
  const myWorkspaces = db.workspaces.filter((w) => w.members.some((m) => m.email === user.email))
  const plan = db.plans.find((p) => p.id === user.planId)
  const wsLimit = plan?.workspaces ?? 1
  const canAddWs = wsLimit === -1 || myWorkspaces.length < wsLimit
  const isOwner = ws.members.find((m) => m.email === user.email)?.role === 'owner'

  const patch = (p: Partial<Workspace>) => store.set((db2) => {
    const w = db2.workspaces.find((x) => x.id === ws.id)
    if (w) Object.assign(w, p)
  })

  const fileToDataUrl = (file: File, cb: (url: string) => void) => {
    const r = new FileReader()
    r.onload = () => cb(String(r.result))
    r.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <SectionCard title={tr('المساحة الحالية')}>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tr('التبديل بين المساحات')}</Label>
              <div className="flex gap-2">
                <Select value={ws.id} onValueChange={onSwitchWs}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {myWorkspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} {w.kind === 'personal' ? tr('(شخصية)') : tr('(منشأة)')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  type="button" size="icon" variant="outline" title={canAddWs ? tr('إنشاء مساحة جديدة') : tr('وصلت حد مساحات باقتك — رقِّ باقتك')}
                  disabled={!canAddWs}
                  onClick={() => setAddWs(true)}
                >＋</Button>
              </div>
              {!canAddWs && <p className="text-[11px] text-amber-700">{tr('وصلت حد مساحات باقتك')} ({wsLimit}) — {tr('رقِّ باقتك من صفحة الاشتراك لإضافة المزيد.')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tr('اسم المساحة')}</Label>
              <Input value={ws.name} onChange={(e) => patch({ name: e.target.value })} disabled={!isOwner} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tr('الرقم الضريبي')}</Label>
                <Input className="num" dir="ltr" value={ws.vatNumber ?? ''} onChange={(e) => patch({ vatNumber: e.target.value })} placeholder="3xxxxxxxxxxxxxx" disabled={!isOwner} />
              </div>
              <div className="space-y-1.5">
                <Label>{tr('الهاتف')}</Label>
                <Input className="num" dir="ltr" value={ws.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} placeholder="05xxxxxxxx" disabled={!isOwner} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tr('العنوان (يظهر في الفاتورة)')}</Label>
              <Input value={ws.address ?? ''} onChange={(e) => patch({ address: e.target.value })} disabled={!isOwner} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr('العملة الافتراضية للمؤسسة')}</Label>
              <Select value={ws.currency ?? 'ر.س'} onValueChange={(v) => patch({ currency: v })} disabled={!isOwner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ر.س', 'دولار', 'درهم', 'دينار', 'جنيه', 'يورو'].map((c) => <SelectItem key={c} value={c}>{tr(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tr('الوحدات المفعّلة')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button" disabled={!isOwner}
                  onClick={() => patch({ modules: { warehouse: !(ws.modules?.warehouse !== false), invoices: ws.modules?.invoices !== false } })}
                  className={`rounded-xl border p-2.5 text-sm font-bold transition-all ${ws.modules?.warehouse !== false ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A]' : 'bg-card text-muted-foreground'}`}
                >
                  {tr('المستودع')} {ws.modules?.warehouse !== false ? '✓' : ''}
                </button>
                <button
                  type="button" disabled={!isOwner}
                  onClick={() => patch({ modules: { warehouse: ws.modules?.warehouse !== false, invoices: !(ws.modules?.invoices !== false) } })}
                  className={`rounded-xl border p-2.5 text-sm font-bold transition-all ${ws.modules?.invoices !== false ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A]' : 'bg-card text-muted-foreground'}`}
                >
                  {tr('الفواتير')} {ws.modules?.invoices !== false ? '✓' : ''}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tr('شعار المنشأة (يظهر في الفاتورة)')}</Label>
              <div className="flex items-center gap-3">
                {ws.logo ? <img src={ws.logo} alt={tr('الشعار')} className="h-16 w-16 rounded-xl border object-contain" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl border text-xs text-muted-foreground">{tr('لا يوجد')}</div>}
                <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-bold hover:bg-muted">
                  {tr('رفع شعار')}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) fileToDataUrl(f, (url) => patch({ logo: url })) }} />
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tr('ختم المنشأة')}</Label>
              <div className="flex items-center gap-3">
                {ws.stamp ? <img src={ws.stamp} alt={tr('الختم')} className="h-16 w-16 rounded-xl border object-contain" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl border text-xs text-muted-foreground">{tr('لا يوجد')}</div>}
                <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-bold hover:bg-muted">
                  {tr('رفع ختم')}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) fileToDataUrl(f, (url) => patch({ stamp: url })) }} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={tr('التفضيلات')}>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{tr('اللغة')}</Label>
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-bold">
              {([['ar', 'العربية'], ['en', 'English']] as const).map(([k, lbl]) => (
                <button key={k} onClick={() => setPrefs({ lang: k })}
                  className={`rounded-md py-2 transition-colors ${(prefs.lang ?? 'ar') === k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{tr(lbl)}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{tr('التقويم')}</Label>
            <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-bold">
              {([['gregorian', tr('ميلادي')], ['hijri', tr('هجري')]] as const).map(([k, lbl]) => (
                <button key={k} onClick={() => setPrefs({ calendar: k })}
                  className={`rounded-md py-2 transition-colors ${(prefs.calendar ?? 'gregorian') === k ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{lbl}</button>
              ))}
            </div>
            {prefs.calendar === 'hijri' && <p className="num text-[11px] text-muted-foreground">{tr('مثال:')} {today()}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{tr('الخصوصية')}</Label>
            <button
              onClick={() => setPrefs({ hideAmounts: !prefs.hideAmounts })}
              className={`flex w-full items-center justify-between rounded-xl border p-3 text-sm font-bold transition-all ${prefs.hideAmounts ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A]' : 'bg-card text-muted-foreground'}`}
            >
              {tr('إخفاء المبالغ في كل التطبيق')}
              <span>{prefs.hideAmounts ? tr('مفعّل') : tr('متوقف')}</span>
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={<>{tr('أسعار الصرف')} ({myRates.length})</>}>
        <div className="border-b p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>{tr('من عملة')}</Label>
              <Input value={rateFrom} onChange={(e) => setRateFrom(e.target.value)} placeholder={tr('دولار')} className="h-9 w-28" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr('إلى عملة')}</Label>
              <Input value={rateTo} onChange={(e) => setRateTo(e.target.value)} placeholder={tr('ر.س')} className="h-9 w-28" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr('السعر')}</Label>
              <Input type="number" step="0.0001" dir="ltr" className="num h-9 w-28 text-right" value={rateVal} onChange={(e) => setRateVal(e.target.value)} placeholder="3.75" />
            </div>
            <Button size="sm" onClick={addRate} className="gap-1"><Plus className="h-3.5 w-3.5" /> {tr('إضافة سعر')}</Button>
          </div>
        </div>
        {myRates.length === 0 ? (
          <EmptyState text={tr('لا توجد أسعار صرف مسجلة — أضف سعر تحويل العملات التي تتعامل بها')} />
        ) : (
          <ul className="divide-y">
            {myRates.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="num font-black">{r.from} ← {r.to}</span>
                <span className="num flex-1 text-muted-foreground">1 {r.from} = {r.rate} {r.to}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600"
                  onClick={() => store.set((db2) => { db2.exchangeRates = db2.exchangeRates.filter((x) => x.id !== r.id) })}>
                  {tr('حذف')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={<>{tr('أعضاء المساحة')} ({ws.members.length})</>}
        action={isOwner ? <Button size="sm" onClick={() => setAddMember(true)} className="gap-1"><Users className="h-3.5 w-3.5" /> {tr('دعوة عضو')}</Button> : undefined}
      >
        <ul className="divide-y">
          {ws.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101C32] text-xs font-black text-[#D8B36A]">{m.name.slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m.name}</div>
                <div className="num text-xs text-muted-foreground" dir="ltr">{m.email}</div>
              </div>
              <StatusBadge
                label={m.role === 'owner' ? tr('مالك') : m.role === 'accountant' ? tr('محاسب') : tr('مشاهد')}
                tone={m.role === 'owner' ? 'blue' : m.role === 'accountant' ? 'emerald' : 'slate'}
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={<>{tr('سجل التدقيق')} ({db.audit.filter((a) => a.wsId === ws.id).length})</>}>
        {db.audit.filter((a) => a.wsId === ws.id).length === 0 ? <EmptyState text="لا توجد عمليات مسجلة بعد" /> : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {db.audit.filter((a) => a.wsId === ws.id).slice().reverse().map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#101C32] text-[10px] font-black text-[#D8B36A]">{a.userName.slice(0, 2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{tr(a.action)}</div>
                  <div className="text-xs text-muted-foreground">{a.userName}</div>
                </div>
                <span className="num text-xs text-muted-foreground">{new Date(a.date).toLocaleString('ar-SA-u-nu-latn')}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={tr('بياناتي')}>
        <div className="p-4 text-sm">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <div className="font-black">{user.name}</div>
              <div className="num text-xs text-muted-foreground" dir="ltr">{user.email}</div>
            </div>
          </div>
          <div className="num mt-3 text-xs text-muted-foreground">{tr('عضو منذ')} {user.createdAt} · {tr('البيانات محفوظة محلياً في هذا المتصفح (نسخة أولية)')}</div>
        </div>
      </SectionCard>

      <MemberFormDialog open={addMember} onClose={() => setAddMember(false)} ws={ws} />
      <WorkspaceFormDialog open={addWs} onClose={() => setAddWs(false)} user={user} onCreated={(id) => onSwitchWs(id)} />
    </div>
  )
}

/* ================= الاشتراك ================= */

const WHATSAPP = '966500000000'

export function SubscriptionPage({ db, user }: { db: DB; user: User }) {
  const trialLeft = Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
  const inTrial = trialLeft > 0 && user.planId !== 'full'
  const plans = db.plans.filter((p) => p.active)
  const current = db.plans.find((p) => p.id === user.planId)

  const activate = (plan: { id: string; name: string }) => {
    const text = encodeURIComponent(
      `مرحباً فريق أصول،\nأرغب بتفعيل باقة «${plan.name}».\nالبريد: ${user.email}\nشكراً لكم`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-4">
      <SectionCard title={tr('اشتراكي الحالي')}>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101C32]"><Crown className="h-6 w-6 text-[#D8B36A]" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">{inTrial ? tr('الفترة التجريبية — كل الميزات مفتوحة') : tr(current?.name ?? '')}</div>
            <div className="num text-sm text-muted-foreground">
              {inTrial ? <>{tr('تبقّى')} {trialLeft} {trialLeft === 1 ? tr('يوم') : tr('أيام')} {tr('من التجربة المجانية (تنتهي')} {user.trialEndsAt})</> : <>{current?.price ?? 0} {tr('ر.س')} / {tr('شهر')}</>}
            </div>
          </div>
          {inTrial && <StatusBadge label={tr('تجربة 14 يوماً')} tone="blue" />}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = !inTrial && user.planId === p.id
          return (
            <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-card p-5 ${p.id === 'pro' ? 'border-[#D8B36A] ring-1 ring-[#D8B36A]/50' : ''}`}>
              {p.id === 'pro' && <span className="absolute -top-3 start-1/2 translate-x-1/2 rounded-full bg-[#D8B36A] px-3 py-0.5 text-xs font-black text-[#101C32]">{tr('الأكثر اختياراً')}</span>}
              <h3 className="font-black">{tr(p.name)}</h3>
              <div className="num mt-1 text-3xl font-black">{p.price}<span className="text-sm font-bold text-muted-foreground"> {tr('ر.س/شهر')}</span></div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />{tr(f)}</li>
                ))}
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />{p.workspaces === -1 ? tr('مساحات غير محدودة') : `${p.workspaces} ${p.workspaces === 1 ? tr('مساحة') : tr('مساحات')}`}</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />{p.users === -1 ? tr('مستخدمون غير محدودين') : `${p.users} ${p.users === 1 ? tr('مستخدم') : tr('مستخدمين')}`}</li>
              </ul>
              <Button
                variant={p.price === 0 ? 'outline' : 'default'}
                className="mt-5 w-full font-bold"
                disabled={isCurrent}
                onClick={() => p.price > 0 ? activate(p) : undefined}
              >
                {isCurrent ? tr('باقتك الحالية') : p.price === 0 ? tr('الباقة المجانية') : tr('فعّل عبر واتساب')}
              </Button>
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">{tr('التفعيل يدوي عبر واتساب · إلغاء في أي وقت دون تجديد تلقائي · استرجاع كامل خلال 7 أيام من التفعيل')}</p>
    </div>
  )
}

/* ================= لوحة إدارة المنصة (للمالك) ================= */

export function AdminPage({ db, user }: { db: DB; user: User }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [wsCap, setWsCap] = useState('')
  const [whCap, setWhCap] = useState('')
  const isPlatformOwner = !!user.isAdmin

  if (!isPlatformOwner) {
    return <EmptyState text="لوحة الإدارة متاحة لمالك المنصة فقط" />
  }

  const totalMrr = db.users.reduce((a, u) => a + (db.plans.find((p) => p.id === u.planId)?.price ?? 0), 0)
  const openTickets = db.tickets.filter((t) => t.status === 'open')
  const planDist = db.plans.map((pl) => ({
    name: pl.name.replace('الباقة ', ''),
    value: db.users.filter((u) => u.planId === pl.id).length,
    color: pl.id === 'free' ? '#98A4BB' : pl.id === 'pro' ? '#D8B36A' : '#101C32',
  })).filter((s) => s.value > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr('مستخدمو المنصة')} value={`${db.users.length}`} />
        <StatCard label={tr('المساحات النشطة')} value={`${db.workspaces.length}`} />
        <StatCard label={tr('الإيراد الشهري المتوقع')} value={fmtSAR(totalMrr)} />
        <StatCard label={tr('تذاكر الدعم المفتوحة')} value={`${openTickets.length}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={tr('توزيع المشتركين على الباقات')}>
          <div className="flex items-center justify-center p-5">
            {planDist.length === 0 ? <EmptyState text="لا يوجد مشتركون بعد" /> : (
              <DonutChart segments={planDist} centerLabel={tr('مشترك')} centerValue={`${db.users.length}`} size={170} />
            )}
          </div>
        </SectionCard>

        <SectionCard title={<>{tr('تذاكر الدعم')} ({db.tickets.length})</>} action={
          openTickets.length > 0 ? <StatusBadge label={`${openTickets.length} ${tr('مفتوحة')}`} tone="amber" /> : undefined
        }>
          {db.tickets.length === 0 ? (
            <EmptyState text="لا توجد تذاكر دعم" />
          ) : (
            <ul className="max-h-72 divide-y overflow-y-auto">
              {db.tickets.slice().reverse().map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.subject}</span>
                    <StatusBadge label={t.status === 'open' ? tr('مفتوحة') : tr('مغلقة')} tone={t.status === 'open' ? 'amber' : 'emerald'} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.userName} · <span dir="ltr">{t.date}</span></p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.message}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`مرحباً ${t.userName}، بخصوص طلبك: ${t.subject}`)}`, '_blank')}
                    >
                      <MessageCircle className="h-3 w-3" /> {tr('رد عبر واتساب')}
                    </Button>
                    {t.status === 'open' && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => store.set((db2) => { const x = db2.tickets.find((y) => y.id === t.id); if (x) x.status = 'closed' })}>
                        {tr('إغلاق التذكرة')}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title={tr('الباقات والأسعار')}>
        <ul className="divide-y">
          {db.plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{tr(p.name)}</div>
                <div className="num text-xs text-muted-foreground">
                  {p.workspaces === -1 ? tr('مساحات غير محدودة') : `${p.workspaces} ${tr('مساحات')}`} · {p.warehouses === -1 ? tr('مستودعات غير محدودة') : `${p.warehouses ?? 0} ${tr('مستودعات')}`} · {p.users === -1 ? tr('مستخدمون غير محدودين') : `${p.users} ${tr('مستخدمين')}`} · {p.active ? tr('نشطة') : tr('موقفة')}
                </div>
              </div>
              {editing === p.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="number" dir="ltr" className="num h-8 w-20 text-right" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={tr('السعر')} autoFocus />
                  <Input type="number" dir="ltr" className="num h-8 w-20 text-right" value={wsCap} onChange={(e) => setWsCap(e.target.value)} placeholder={tr('مساحات (-1)')} />
                  <Input type="number" dir="ltr" className="num h-8 w-20 text-right" value={whCap} onChange={(e) => setWhCap(e.target.value)} placeholder={tr('مستودعات (-1)')} />
                  <Button size="sm" onClick={() => { store.set((db2) => { const x = db2.plans.find((y) => y.id === p.id); if (x) { x.price = Number(price) || 0; x.workspaces = wsCap === '' ? x.workspaces : Number(wsCap); x.warehouses = whCap === '' ? (x.warehouses ?? 0) : Number(whCap) } }); setEditing(null) }}>{tr('حفظ')}</Button>
                </div>
              ) : (
                <span className="num text-lg font-black">{fmtSAR(p.price)}<span className="text-xs font-bold text-muted-foreground">{tr('/شهر')}</span></span>
              )}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => { setEditing(p.id); setPrice(String(p.price)); setWsCap(String(p.workspaces)); setWhCap(String(p.warehouses ?? 0)) }}>{tr('تعديل الحدود')}</Button>
                <Button variant="outline" size="sm" onClick={() => store.set((db2) => { const x = db2.plans.find((y) => y.id === p.id); if (x) x.active = !x.active })}>
                  {p.active ? tr('إيقاف') : tr('تفعيل')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={<>{tr('المستخدمون')} ({db.users.length})</>}>
        <ul className="divide-y">
          {db.users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101C32] text-xs font-black text-[#D8B36A]">{u.name.slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{u.name}{u.isAdmin && <span className="text-[11px] text-[#B08D3E]"> {tr('(مدير المنصة)')}</span>}</div>
                <div className="num text-xs text-muted-foreground" dir="ltr">{u.email}</div>
                <div className="num text-[11px] text-muted-foreground">
                  {tr('عضو منذ')} {u.createdAt} · {tr('التجربة تنتهي')} {u.trialEndsAt}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={u.planId}
                  onValueChange={(planId) => store.set((db2) => { const x = db2.users.find((y) => y.id === u.id); if (x) x.planId = planId })}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{tr(p.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm" variant="outline" className="h-8 px-2 text-[11px]"
                  onClick={() => store.set((db2) => { const x = db2.users.find((y) => y.id === u.id); if (x) x.trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })}
                >
                  {tr('تجربة 7 أيام')}
                </Button>
                <Button
                  size="sm" variant="outline" className="h-8 px-2 text-[11px]"
                  onClick={() => store.set((db2) => { const x = db2.users.find((y) => y.id === u.id); if (x) x.trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) })}
                >
                  {tr('تجربة 14 يوم')}
                </Button>
                <StatusBadge label={tr('نشط')} tone="emerald" />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

/* ================= الدعم ================= */

export function SupportPage({ db, user }: { db: DB; user: User }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const myTickets = db.tickets.filter((t) => t.userId === user.id).slice().reverse()

  const submit = () => {
    if (!subject.trim() || !message.trim()) return setErr(tr('أدخل الموضوع ونص الرسالة'))
    store.set((db2) => {
      db2.tickets.push({
        id: uid(), userId: user.id, userName: user.name,
        subject: subject.trim(), message: message.trim(),
        date: today(), status: 'open',
      })
    })
    setSubject(''); setMessage(''); setErr(''); setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={tr('أرسل طلب دعم')} action={<StatusBadge label={tr('رد خلال 24 ساعة')} tone="blue" />}>
          <div className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>{tr('الموضوع')}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tr('مثال: مشكلة في إصدار فاتورة، استفسار عن باقة…')} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr('الرسالة')}</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={tr('اشرح طلبك بالتفصيل — كلما زادت التفاصيل سرّعنا الحل')} />
            </div>
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>}
            {sent && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{tr('تم استلام طلبك — سنرد عليك قريباً على بريدك أو جوالك.')}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} className="gap-1"><Send className="h-4 w-4" /> {tr('إرسال الطلب')}</Button>
              <Button
                variant="outline" className="gap-1"
                onClick={() => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`مرحباً، أحتاج مساعدة في منصة أصول.\nالبريد: ${user.email}\n`)}`, '_blank')}
              >
                <MessageCircle className="h-4 w-4" /> {tr('تواصل فوري عبر واتساب')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={<>{tr('طلباتي السابقة')} ({myTickets.length})</>}>
          {myTickets.length === 0 ? (
            <EmptyState text="لا توجد طلبات دعم سابقة" />
          ) : (
            <ul className="divide-y">
              {myTickets.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.subject}</span>
                    <StatusBadge label={t.status === 'open' ? tr('قيد المعالجة') : tr('تمت الإجابة')} tone={t.status === 'open' ? 'amber' : 'emerald'} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.message}</p>
                  <div className="num mt-1 text-[11px] text-muted-foreground">{t.date}</div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title={tr('أسئلة سريعة')}>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {[
            { t: tr('كيف أُفعّل باقة مدفوعة؟'), d: tr('من صفحة الاشتراك اضغط «فعّل عبر واتساب» وستصلنا رسالة جاهزة ببياناتك، ونُفعّل خلال ساعات.') },
            { t: tr('هل تضيع بياناتي عند تسجيل الخروج؟'), d: tr('لا — بياناتك محفوظة في مساحتك وتظهر كما هي عند كل دخول.') },
            { t: tr('كيف أضيف شريكاً لمنشأتي؟'), d: tr('من الإعدادات ← أعضاء المساحة ← دعوة عضو، وحدد صلاحيته (محاسب/مشاهد).') },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-4">
              <div className="text-sm font-black">{f.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

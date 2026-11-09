import { useState } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, Printer, Pencil, Banknote, UserPlus, Wallet as WalletIcon, MessageCircle, Search, ImageDown, Trash2 } from 'lucide-react'
import { StatCard, SectionCard, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EntryFormDialog, PaymentDialog, WalletFormDialog, PersonFormDialog } from '@/components/forms'
import {
  store, fmtSAR, fmtNum, fmtDate, entryRemaining, entrySettled, today,
  type DB, type Workspace, type LedgerEntry, type Person, type Payment,
} from '@/lib/store'
import { syncDeleteDebt, syncUpdateDebt } from '@/lib/sync'
import { apiRequest } from '@/lib/api'

interface Props { db: DB; ws: Workspace }

export function DebtsPage({ db, ws }: Props) {
  const wallets = db.wallets.filter((w) => w.wsId === ws.id)
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id ?? 'all')
  const [personQ, setPersonQ] = useState('')
  const activeWallet = wallets.find((w) => w.id === walletId) ?? null

  const [addWallet, setAddWallet] = useState(false)
  const [addPerson, setAddPerson] = useState(false)
  const [addEntry, setAddEntry] = useState(false)
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null)
  const [payEntry, setPayEntry] = useState<{ entry: LedgerEntry; person: Person } | null>(null)
  const [editPayment, setEditPayment] = useState<{ entry: LedgerEntry; person: Person; payment: Payment } | null>(null)
  const [personView, setPersonView] = useState<string | null>(null)

  const entries = db.entries.filter((e) => e.wsId === ws.id)
  const allPeople = db.people.filter((p) => p.wsId === ws.id)

  const personBalance = (p: Person) => {
    const es = entries.filter((e) => e.personId === p.id)
    const for_ = es.filter((e) => e.direction === 'for').reduce((a, e) => a + entryRemaining(e), 0) // له علينا
    const ag = es.filter((e) => e.direction === 'against').reduce((a, e) => a + entryRemaining(e), 0) // لنا عليه
    return ag - for_
  }

  const people = allPeople
    .filter((p) => walletId === 'all' || p.walletId === walletId)
    .filter((p) => !personQ || p.name.includes(personQ) || (p.phone ?? '').includes(personQ))

  const peopleNet = people.reduce((a, p) => a + personBalance(p), 0)

  const owed = entries.filter((e) => e.direction === 'for')
  const owing = entries.filter((e) => e.direction === 'against')
  const sumRemaining = (list: LedgerEntry[]) => list.reduce((a, e) => a + entryRemaining(e), 0)

  const person = db.people.find((p) => p.id === personView)
  const personEntries = person ? entries.filter((e) => e.personId === person.id) : []

  /* الحوارات معرّفة هنا وتُصيَّر في كلا الفرعين حتى تعمل أزرار «إضافة حركة»
     و«دفعة» داخل كشف الحساب (الإرجاع المبكر كان يمنع تصييرها) */
  const dialogs = (
    <>
      <WalletFormDialog open={addWallet} onClose={() => setAddWallet(false)} wsId={ws.id} />
      <PersonFormDialog open={addPerson} onClose={() => setAddPerson(false)} wsId={ws.id} walletId={activeWallet?.id} />
      <EntryFormDialog open={addEntry} onClose={() => setAddEntry(false)} wsId={ws.id} personId={person?.id ?? people[0]?.id} />
      <EntryFormDialog open={!!editEntry} onClose={() => setEditEntry(null)} wsId={ws.id} entry={editEntry ?? undefined} />
      <PaymentDialog open={!!payEntry} onClose={() => setPayEntry(null)} entry={payEntry?.entry ?? null} personName={payEntry?.person.name ?? ''} />
      <PaymentDialog
        open={!!editPayment}
        onClose={() => setEditPayment(null)}
        entry={editPayment?.entry ?? null}
        personName={editPayment?.person.name ?? ''}
        payment={editPayment?.payment}
      />
    </>
  )

  if (person) {
    return (
      <>
        <PersonStatement
          ws={ws} person={person} entries={personEntries}
          onBack={() => setPersonView(null)}
          onAddEntry={() => setAddEntry(true)}
          onEditEntry={setEditEntry}
          onPay={(entry) => setPayEntry({ entry, person })}
          onEditPayment={(entry, payment) => setEditPayment({ entry, person, payment })}
        />
        {dialogs}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr('مطلوب لهم (له علينا)')} value={fmtSAR(sumRemaining(owed))} />
        <StatCard label={tr('لنا عليهم (عليه)')} value={fmtSAR(sumRemaining(owing))} />
        <StatCard label={tr('صافي الموقف')} value={fmtSAR(sumRemaining(owing) - sumRemaining(owed))} />
        <StatCard label={tr('محافظ وكشوف')} value={`${wallets.length} / ${allPeople.length}`} />
      </div>

      {/* الأشخاص — اختيار المحفظة كقائمة منسدلة */}
      <SectionCard
        title={`${tr('الأشخاص')} (${people.length})`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder={tr('اختر المحفظة')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحافظ ({allPeople.length})</SelectItem>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({allPeople.filter((p) => p.walletId === w.id).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={personQ} onChange={(e) => setPersonQ(e.target.value)} placeholder={tr('بحث باسم أو جوال…')} className="h-8 w-40 ps-8 text-xs" />
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddWallet(true)} className="gap-1"><WalletIcon className="h-3.5 w-3.5" /> {tr('محفظة جديدة')}</Button>
            <Button size="sm" onClick={() => setAddPerson(true)} className="gap-1"><UserPlus className="h-3.5 w-3.5" /> {tr('شخص')}</Button>
          </div>
        }
      >
        {wallets.length === 0 && (
          <EmptyState text={tr('لا توجد محافظ — أنشئ محفظة ثم أضف الأشخاص إليها')} />
        )}
        {wallets.length > 0 && people.length === 0 && (
          <EmptyState text={personQ ? tr('لا نتائج مطابقة للبحث') : tr('لا يوجد أشخاص في هذه المحفظة بعد')} />
        )}
        {wallets.length > 0 && people.length > 0 && (
          <>
            <div className="num flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
              <span>{activeWallet ? <>{tr('محفظة')} «{activeWallet.name}»</> : tr('كل المحافظ')}</span>
              <span className={peopleNet > 0 ? 'font-black text-red-700' : peopleNet < 0 ? 'font-black text-emerald-700' : ''}>
                {tr('الصافي:')} {peopleNet !== 0 ? fmtSAR(peopleNet) : tr('متعادل')}
              </span>
            </div>
            <ul className="divide-y">
              {people.map((p) => {
                const bal = personBalance(p)
                const es = entries.filter((e) => e.personId === p.id)
                const w = wallets.find((x) => x.id === p.walletId)
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <button className="min-w-0 flex-1 text-start" onClick={() => setPersonView(p.id)}>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{p.name}</span>
                        <span className={`num rounded-full px-2 py-0.5 text-[11px] font-bold ${bal > 0 ? 'bg-red-50 text-red-700' : bal < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {bal > 0 ? <>{tr('لنا عليه')} {fmtSAR(bal)}</> : bal < 0 ? <>{tr('له علينا')} {fmtSAR(-bal)}</> : tr('متعادل')}
                        </span>
                      </div>
                      <div className="num mt-0.5 text-xs text-muted-foreground">
                        {es.length} {tr('قيد')} · {es.reduce((a, e) => a + e.payments.length, 0)} {tr('دفعة')}
                        {w && <> · {w.name}</>}
                        {p.phone && <> · {p.phone}</>}
                      </div>
                    </button>
                    <Button variant="outline" size="sm" onClick={() => setPersonView(p.id)}>{tr('كشف الحساب')}</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tr('حذف الشخص')}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!confirm(tr('هل أنت متأكد من حذف هذا الشخص وسجل ديونه بالكامل؟'))) return
                        store.set((db) => {
                          db.people = db.people.filter((x) => x.id !== p.id)
                          db.entries = db.entries.filter((x) => x.personId !== p.id)
                        })
                        apiRequest(`/people/${p.id}`, { method: 'DELETE' }).catch(() => {})
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </SectionCard>

      <div className="flex justify-center">
        <Button onClick={() => setAddEntry(true)} className="gap-1.5"><Plus className="h-4 w-4" /> {tr('قيد جديد (له / عليه)')}</Button>
      </div>

      {dialogs}
    </div>
  )
}

/* ---------------- كشف حساب شخص ---------------- */

/* ---------------- تصدير كشف الحساب كصورة PNG (رسم يدوي كامل غير مقصوص) ---------------- */
async function downloadStatementPng(ws: Workspace, person: Person, entries: LedgerEntry[]) {
  try { await document.fonts.load('900 48px Cairo'); await document.fonts.ready } catch { /* تجاهل */ }

  const NAVY = '#101C32'
  const GOLD = '#D8B36A'
  const IVORY = '#F6F2E9'
  const SLATE = '#3A4660'
  const W = 1080
  const num = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`
  const for_ = entries.filter((e) => e.direction === 'for').reduce((a, e) => a + entryRemaining(e), 0)
  const ag = entries.filter((e) => e.direction === 'against').reduce((a, e) => a + entryRemaining(e), 0)
  const net = ag - for_
  const entryH = 118
  const payH = 44
  const entriesH = entries.reduce((a, e) => a + entryH + (e.payments.length > 0 ? 18 + e.payments.length * payH : 0), 0)
  const H = 760 + Math.max(entriesH, 80) + 130

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = IVORY
  ctx.fillRect(0, 0, W, H)

  // الترويسة الكحلية
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, 220)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 220, W, 8)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = GOLD
  ctx.font = '900 46px Cairo'
  ctx.fillText(ws.name, W - 60, 86)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 26px Cairo'
  ctx.fillText('كشف حساب', W - 60, 130)

  // بيانات الشخص (يسار الترويسة)
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 38px Cairo'
  ctx.fillText(person.name, 60, 92)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '600 24px "Hanken Grotesk", Cairo'
  if (person.phone) ctx.fillText(person.phone, 60, 130)
  ctx.fillText(`تاريخ الإصدار: ${today()}`, 60, 166)

  let y = 300
  // ثلاث بطاقات الإجمالي
  const cardW = (W - 120 - 32) / 3
  const cards: Array<[string, string, string, string]> = [
    ['إجمالي (له علينا)', num(for_), '#E7F6EE', '#0E7C4A'],
    ['إجمالي (لنا عليه)', num(ag), '#FCEBEA', '#B3261E'],
    ['الصافي', num(net), NAVY, GOLD],
  ]
  cards.forEach(([label, value, bg, fg], i) => {
    const x = W - 60 - cardW - i * (cardW + 16)
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, 130, 18)
    ctx.fill()
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.fillStyle = i === 2 ? 'rgba(216,179,106,0.85)' : fg
    ctx.font = '700 24px Cairo'
    ctx.fillText(label, x + cardW / 2, y + 42)
    ctx.fillStyle = fg
    ctx.font = '900 36px "Hanken Grotesk", Cairo'
    ctx.fillText(value, x + cardW / 2, y + 96)
  })
  y += 170

  if (entries.length === 0) {
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.fillStyle = SLATE
    ctx.font = '600 28px Cairo'
    ctx.fillText('لا توجد قيود مسجلة', W / 2, y + 40)
    y += 90
  } else {
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    ctx.fillStyle = SLATE
    ctx.font = '800 26px Cairo'
    ctx.fillText('تفاصيل القيود', W - 60, y)
    ctx.fillStyle = GOLD
    ctx.fillRect(W - 60 - ctx.measureText('تفاصيل القيود').width - 24, y - 8, 8, 8)
    y += 26

    entries.forEach((e) => {
      const h = entryH + (e.payments.length > 0 ? 18 + e.payments.length * payH : 0)
      // بطاقة القيد
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.roundRect(60, y, W - 120, h, 20)
      ctx.fill()
      // شريط جانبي بلون الاتجاه
      ctx.fillStyle = e.direction === 'for' ? '#0E7C4A' : '#B3261E'
      ctx.fillRect(60, y + 12, 10, h - 24)

      ctx.direction = 'rtl'
      ctx.textAlign = 'right'
      ctx.fillStyle = NAVY
      ctx.font = '800 30px Cairo'
      ctx.fillText(e.note || 'قيد مالي', W - 96, y + 46)
      // شارة الاتجاه
      const badgeText = `${e.direction === 'for' ? 'له' : 'عليه'} ${num(e.amount)}`
      ctx.font = '700 22px Cairo'
      const bw = ctx.measureText(badgeText).width + 28
      ctx.fillStyle = e.direction === 'for' ? '#E7F6EE' : '#FCEBEA'
      ctx.beginPath()
      ctx.roundRect(W - 96 - bw, y + 22, bw, 38, 19)
      ctx.fill()
      ctx.fillStyle = e.direction === 'for' ? '#0E7C4A' : '#B3261E'
      ctx.textAlign = 'center'
      ctx.fillText(badgeText, W - 96 - bw / 2, y + 48)

      ctx.direction = 'ltr'
      ctx.textAlign = 'left'
      ctx.fillStyle = SLATE
      ctx.font = '600 22px "Hanken Grotesk", Cairo'
      const remaining = entryRemaining(e)
      const paidTotal = e.payments.reduce((a, p) => a + p.amount, 0)
      ctx.fillText(`التاريخ: ${e.date}${e.dueDate ? `   الاستحقاق: ${e.dueDate}` : ''}`, 84, y + 46)

      // أرقام المبلغ/المدفوع/المتبقي
      const stats: Array<[string, string, string]> = [
        ['المبلغ', `${e.amount.toLocaleString('en-US')} ر.س`, NAVY],
        ['المدفوع', `${paidTotal.toLocaleString('en-US')} ر.س`, '#0E7C4A'],
        ['المتبقي', `${remaining.toLocaleString('en-US')} ر.س`, remaining > 0 ? '#B08D3E' : SLATE],
      ]
      const stW = 200
      stats.forEach(([label, value, color], i) => {
        const sx = W - 96 - stW - i * (stW + 12)
        ctx.direction = 'rtl'
        ctx.textAlign = 'right'
        ctx.fillStyle = SLATE
        ctx.font = '600 20px Cairo'
        ctx.fillText(label, sx + stW - 14, y + 90)
        ctx.direction = 'ltr'
        ctx.textAlign = 'left'
        ctx.fillStyle = color
        ctx.font = '800 26px "Hanken Grotesk", Cairo'
        ctx.fillText(value, sx + 14, y + 90)
      })

      // الدفعات
      if (e.payments.length > 0) {
        let py = y + entryH + 6
        ctx.direction = 'rtl'
        ctx.textAlign = 'right'
        ctx.fillStyle = SLATE
        ctx.font = '700 20px Cairo'
        ctx.fillText('الدفعات:', W - 96, py + 6)
        e.payments.forEach((p) => {
          ctx.direction = 'ltr'
          ctx.textAlign = 'left'
          ctx.fillStyle = '#E7F6EE'
          ctx.beginPath()
          ctx.roundRect(84, py + 14, 460, 34, 17)
          ctx.fill()
          ctx.fillStyle = '#0E7C4A'
          ctx.font = '700 20px "Hanken Grotesk", Cairo'
          ctx.fillText(`${p.amount.toLocaleString('en-US')} ر.س · ${p.date}${p.note ? ` · ${p.note}` : ''}`, 100, py + 38)
          py += payH
        })
      }
      y += h + 18
    })
  }

  // الصافي النهائي
  y += 20
  ctx.fillStyle = NAVY
  ctx.beginPath()
  ctx.roundRect(60, y, W - 120, 84, 20)
  ctx.fill()
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = GOLD
  ctx.font = '900 32px Cairo'
  ctx.fillText('صافي الحساب', W - 100, y + 54)
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.font = '900 36px "Hanken Grotesk", Cairo'
  ctx.fillText(num(net), 100, y + 54)
  if (net !== 0) {
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '600 22px Cairo'
    ctx.fillText(net > 0 ? '(مستحق عليك)' : '(مستحق لك)', W / 2, y + 54)
  }

  // تذييل
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(16,28,50,0.45)'
  ctx.font = '600 22px Cairo'
  ctx.fillText('أُنشئ عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل', W / 2, H - 30)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `كشف-${person.name}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, 'image/png')
}

function PersonStatement({
  ws, person, entries, onBack, onAddEntry, onEditEntry, onPay, onEditPayment,
}: {
  ws: Workspace; person: Person; entries: LedgerEntry[]
  onBack: () => void
  onAddEntry: () => void
  onEditEntry: (e: LedgerEntry) => void
  onPay: (e: LedgerEntry) => void
  onEditPayment: (e: LedgerEntry, p: Payment) => void
}) {
  const for_ = entries.filter((e) => e.direction === 'for').reduce((a, e) => a + entryRemaining(e), 0) // له علينا
  const ag = entries.filter((e) => e.direction === 'against').reduce((a, e) => a + entryRemaining(e), 0) // لنا عليه
  const net = ag - for_

  const waText = encodeURIComponent(
    `مرحباً ${person.name}،
كشف حسابك لدى ${ws.name}:
 net: ${net.toLocaleString('en-US')} ر.س
${net > 0 ? 'المبلغ لنا عليك' : net < 0 ? 'المبلغ لك علينا' : 'الحساب متعادل'}
`
  )

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>{tr('→ رجوع للمحافظ')}</Button>
        <div className="ms-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1"><Printer className="h-4 w-4" /> {tr('طباعة الكشف')}</Button>
          <Button variant="outline" size="sm" onClick={() => downloadStatementPng(ws, person, entries)} className="gap-1"><ImageDown className="h-4 w-4" /> {tr('مشاركة كصورة')}</Button>
          {person.phone && (
            <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/966${person.phone!.replace(/^0/, '').replace(/\D/g, '')}?text=${waText}`, '_blank')} className="gap-1">
              <MessageCircle className="h-4 w-4" /> {tr('إرسال')}
            </Button>
          )}
          <Button size="sm" onClick={onAddEntry} className="gap-1"><Plus className="h-4 w-4" /> {tr('إضافة حركة')}</Button>
        </div>
      </div>

      {/* منطقة الطباعة */}
      <div className="print-area rounded-2xl border bg-white p-5">
        <div className="flex items-start justify-between border-b-2 border-[#101C32] pb-4">
          <div>
            <div className="text-xl font-black">{ws.name}</div>
            <div className="text-sm font-bold text-[#B08D3E]">{tr('كشف حساب')}</div>
          </div>
          <div className="text-left text-xs text-muted-foreground">
            <div className="text-base font-black text-foreground">{person.name}</div>
            <div className="num">{person.phone ?? ''}</div>
            <div className="num">تاريخ الإصدار: {fmtDate(today())}</div>
          </div>
        </div>

        <div className="num my-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs text-emerald-700">{tr('إجمالي (له علينا)')}</div><div className="mt-1 text-lg font-black text-emerald-700">{fmtSAR(for_)}</div></div>
          <div className="rounded-xl bg-red-50 p-3"><div className="text-xs text-red-700">{tr('إجمالي (لنا عليه)')}</div><div className="mt-1 text-lg font-black text-red-700">{fmtSAR(ag)}</div></div>
          <div className="rounded-xl bg-[#101C32] p-3 text-white"><div className="text-xs text-[#D8B36A]">{tr('الصافي')}</div><div className="mt-1 text-lg font-black text-[#D8B36A]">{fmtSAR(net)}</div></div>
        </div>

        {entries.length === 0 ? (
          <EmptyState text="لا توجد قيود مسجلة" />
        ) : (
          <div className="space-y-2.5">
            {entries.map((e) => {
              const remaining = entryRemaining(e)
              const settled = entrySettled(e)
              const paidTotal = e.payments.reduce((a, p) => a + p.amount, 0)
              return (
                <div key={e.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{e.note || tr('قيد مالي')}</span>
                        <span className={`num rounded-full px-2 py-0.5 text-[11px] font-bold ${e.direction === 'for' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {e.direction === 'for' ? tr('له') : tr('عليه')} {fmtSAR(e.amount)}
                        </span>
                        {e.interest ? <span className="num rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{tr('فائدة')} {e.interest}%</span> : null}
                        {e.edited ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{tr('معدّل')}</span> : null}
                        {settled && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">{tr('مسدد بالكامل')}</span>}
                      </div>
                      <div className="num mt-1 text-xs text-muted-foreground">
                        {tr('التاريخ:')} {fmtDate(e.date)}{e.dueDate ? <> · {tr('الاستحقاق:')} {fmtDate(e.dueDate)}</> : null}
                      </div>
                    </div>
                    <div className="no-print flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => onPay(e)} className="h-7 gap-1 px-2 text-[11px]">
                        <Banknote className="h-3 w-3" /> {tr('دفعة')}
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={tr('تعديل القيد')} onClick={() => onEditEntry(e)} className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={tr('حذف القيد')}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (!confirm(tr('هل أنت متأكد من حذف هذا القيد؟'))) return
                          store.set((db) => { db.entries = db.entries.filter((x) => x.id !== e.id) })
                          syncDeleteDebt(e.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="num mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-white px-2.5 py-1 font-bold">{tr('المبلغ:')} {fmtNum(e.amount)} {tr('ر.س')}</span>
                    <span className="rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-700">{tr('المدفوع:')} {fmtNum(paidTotal)} {tr('ر.س')}</span>
                    <span className={`rounded-lg px-2.5 py-1 font-bold ${settled ? 'bg-white text-slate-500' : 'bg-amber-100 text-amber-800'}`}>
                      {tr('المتبقي:')} {fmtNum(remaining)} {tr('ر.س')}
                    </span>
                  </div>

                  {e.payments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2.5">
                      <span className="text-[11px] font-bold text-muted-foreground">{tr('الدفعات:')}</span>
                      {e.payments.map((p) => (
                        <div
                          key={p.id}
                          className="no-print num inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-200"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            title={tr('اضغط لتعديل الدفعة')}
                            onClick={() => onEditPayment(e, p)}
                          >
                            {fmtNum(p.amount)} {tr('ر.س')} · {fmtDate(p.date)}{p.note ? ` · ${p.note}` : ''}
                            <Pencil className="h-3 w-3 opacity-60" />
                          </button>
                          <button
                            type="button"
                            className="text-destructive/70 hover:text-destructive ms-1"
                            title={tr('حذف الدفعة')}
                            onClick={() => {
                              if (!confirm(tr('هل أنت متأكد من حذف هذه الدفعة؟'))) return
                              const updatedPayments = e.payments.filter((x) => x.id !== p.id)
                              store.set((db) => {
                                const entry = db.entries.find((x) => x.id === e.id)
                                if (entry) entry.payments = updatedPayments
                              })
                              syncUpdateDebt(e.id, { payments: updatedPayments })
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="num mt-4 border-t-2 border-[#101C32] pt-3 text-left text-sm font-black">
          {tr('صافي الحساب:')} {fmtSAR(net)} {net > 0 ? tr('(مستحق عليك)') : net < 0 ? tr('(مستحق لك)') : ''}
        </div>
        <div className="num mt-6 text-center text-[10px] text-slate-400">{tr('أُنشئ عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل')}</div>
      </div>
    </div>
  )
}

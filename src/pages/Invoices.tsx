import { useState } from 'react'
import { tr } from '@/lib/i18n'
import { Plus, Printer, MessageCircle, Link2, CheckCircle2, ImageDown, Trash2 } from 'lucide-react'
import { StatCard, SectionCard, StatusBadge, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvoiceFormDialog, InvoiceDoc, downloadInvoicePng } from '@/components/Invoice'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import {
  store, fmtSAR, invoiceTotal, pushAudit,
  type DB, type Workspace, type Invoice, type InvoiceStatus,
} from '@/lib/store'
import { syncDeleteInvoice } from '@/lib/sync'

const statusMeta: Record<InvoiceStatus, { label: string; tone: 'emerald' | 'amber' | 'red' | 'slate' }> = {
  draft: { label: 'مسودة', tone: 'slate' },
  sent: { label: 'قيد التحصيل', tone: 'amber' },
  paid: { label: 'مدفوعة', tone: 'emerald' },
  overdue: { label: 'متأخرة', tone: 'red' },
}

export function InvoicesPage({ db, ws }: { db: DB; ws: Workspace }) {
  const [tab, setTab] = useState<'all' | InvoiceStatus>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [imgBusy, setImgBusy] = useState<string | null>(null)

  const shareImage = async (i: Invoice) => {
    setImgBusy(i.id)
    await downloadInvoicePng(i, ws)
    setImgBusy(null)
  }

  const invoices = db.invoices.filter((i) => i.wsId === ws.id).slice().reverse()
  const filtered = invoices.filter((i) => tab === 'all' || i.status === tab)
  const sum = (st: InvoiceStatus) => invoices.filter((i) => i.status === st).reduce((a, i) => a + (invoiceTotal(i) - i.paidAmount), 0)
  const inv = invoices.find((i) => i.id === view)

  const collect = (i: Invoice) => {
    const remaining = invoiceTotal(i) - i.paidAmount
    store.set((db2) => {
      const x = db2.invoices.find((y) => y.id === i.id)
      if (!x) return
      x.paidAmount = invoiceTotal(x)
      x.status = 'paid'
      pushAudit(db2, ws.id, `تحصيل الفاتورة ${i.number} كاملة`)
    })
    // إضافة المبلغ لأول صندوق تلقائياً
    const boxes = db.cashboxes.filter((c) => c.wsId === ws.id)
    if (boxes.length > 0) {
      store.set((db2) => {
        const b = db2.cashboxes.find((c) => c.id === boxes[0].id)
        if (b) b.balance += remaining
      })
    }
  }

  const shareLink = (i: Invoice) => {
    const url = `${window.location.origin}${window.location.pathname}#/invoice/${i.id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(i.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const waReminder = (i: Invoice) => {
    const total = invoiceTotal(i)
    const remaining = total - i.paidAmount
    const url = `${window.location.origin}${window.location.pathname}#/invoice/${i.id}`
    const text = encodeURIComponent(
      `مرحباً ${i.client}،\nنذكّركم بالفاتورة ${i.number} بمبلغ ${remaining.toLocaleString('en-US')} ر.س (الإجمالي ${total.toLocaleString('en-US')} ر.س شامل الضريبة).\nللاطلاع والسداد: ${url}\nشكراً لتعاملكم معنا — ${ws.name}`
    )
    const phone = i.clientPhone ? `966${i.clientPhone.replace(/^0/, '').replace(/\D/g, '')}` : ''
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr('قيد التحصيل')} value={fmtSAR(sum('sent'))} />
        <StatCard label={tr('متأخرات')} value={fmtSAR(sum('overdue'))} />
        <StatCard label={tr('محصّلة')} value={fmtSAR(invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.paidAmount, 0))} />
        <StatCard label={tr('عدد الفواتير')} value={`${invoices.length}`} />
      </div>

      <SectionCard
        title={tr('الفواتير الضريبية')}
        action={
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="hidden sm:flex">
                <TabsTrigger value="all">{tr('الكل')}</TabsTrigger>
                <TabsTrigger value="sent">{tr('قيد التحصيل')}</TabsTrigger>
                <TabsTrigger value="overdue">{tr('متأخرة')}</TabsTrigger>
                <TabsTrigger value="paid">{tr('مدفوعة')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> {tr('فاتورة')}</Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState text="لا توجد فواتير — أصدر فاتورتك الضريبية الأولى" />
        ) : (
          <ul className="divide-y">
            {filtered.map((i) => {
              const total = invoiceTotal(i)
              return (
                <li key={i.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <button className="min-w-0 flex-1 text-start" onClick={() => setView(i.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num font-black">{i.number}</span>
                      <StatusBadge label={tr(statusMeta[i.status].label)} tone={statusMeta[i.status].tone} />
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">{i.client}</div>
                    <div className="num text-xs text-muted-foreground">
                      {i.date} · {tr('استحقاق')} {i.dueDate} · {i.items.length} {tr('صنف')}
                    </div>
                  </button>
                  <div className="num text-end text-sm font-black">{fmtSAR(total)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setView(i.id)} className="gap-1"><Printer className="h-3.5 w-3.5" /> {tr('عرض')}</Button>
                    <Button variant="outline" size="sm" onClick={() => shareImage(i)} className="gap-1" disabled={imgBusy === i.id}>
                      <ImageDown className="h-3.5 w-3.5" /> {imgBusy === i.id ? tr('جارٍ الرسم…') : tr('صورة')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => shareLink(i)} className="gap-1">
                      {copied === i.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />} {tr('رابط')}
                    </Button>
                    {(i.status === 'sent' || i.status === 'overdue') && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => waReminder(i)} className="gap-1 text-emerald-700"><MessageCircle className="h-3.5 w-3.5" /> {tr('تذكير')}</Button>
                        <Button size="sm" onClick={() => collect(i)}>{tr('تحصيل')}</Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tr('حذف الفاتورة')}
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!confirm(tr('هل أنت متأكد من حذف هذه الفاتورة؟'))) return
                        store.set((db) => { db.invoices = db.invoices.filter((x) => x.id !== i.id) })
                        syncDeleteInvoice(i.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {/* عرض الفاتورة للطباعة */}
      <Dialog open={!!inv} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[92vh] w-full max-w-4xl overflow-y-auto p-0">
          {inv && <InvoiceDoc inv={inv} ws={ws} />}
        </DialogContent>
      </Dialog>

      <InvoiceFormDialog open={createOpen} onClose={() => setCreateOpen(false)} wsId={ws.id} />
    </div>
  )
}

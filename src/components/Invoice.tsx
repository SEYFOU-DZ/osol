import { useState, useEffect } from 'react'
import { tr } from '@/lib/i18n'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  store, uid, today, fmtDate, nextInvoiceNumber, invoiceTotal, invoiceSubtotal, invoiceVat, pushAudit,
  type Invoice, type InvoiceItem, type Workspace,
} from '@/lib/store'
import { syncCreateInvoice } from '@/lib/sync'

/* ---------------- نموذج الفاتورة ---------------- */
export function InvoiceFormDialog({
  open, onClose, wsId,
}: { open: boolean; onClose: () => void; wsId: string }) {
  const stock = store.get().stock.filter((s) => s.wsId === wsId)
  const [client, setClient] = useState('')
  const [phone, setPhone] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const [vatRate, setVatRate] = useState('15')
  const [items, setItems] = useState<InvoiceItem[]>([{ name: '', qty: 1, price: '' as any }])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setClient(''); setPhone('')
      setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
      setItems([{ name: '', qty: 1, price: '' as any }])
      setErr('')
    }
  }, [open])

  const setItem = (i: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  const pickStock = (i: number, itemId: string) => {
    const s = stock.find((x) => x.id === itemId)
    if (s) setItem(i, { itemId: s.id, name: s.name, price: s.unitPrice })
  }

  const draft: Invoice = {
    id: '', wsId, number: '', client, date: today(), dueDate,
    items: items.map((i) => ({ ...i, qty: Number(i.qty) || 0, price: Number(i.price) || 0 })),
    vatRate: Number(vatRate) || 0, status: 'draft', paidAmount: 0,
  }

  const save = (status: 'draft' | 'sent') => {
    const clean = draft.items.filter((i) => i.name.trim() && i.qty > 0)
    if (!client.trim()) return setErr(tr('أدخل اسم العميل'))
    if (clean.length === 0) return setErr(tr('أضف صنفاً واحداً على الأقل'))
    for (const i of clean) {
      if (i.itemId) {
        const s = stock.find((x) => x.id === i.itemId)
        if (s && s.quantity < i.qty) return setErr(tr(`الكمية المتوفرة من «${s.name}» غير كافية (المتاح ${s.quantity.toLocaleString('en-US')})`))
      }
    }
    store.set((db) => {
      const inv: Invoice = {
        ...draft, id: uid(), items: clean,
        number: nextInvoiceNumber(db, wsId),
        status,
        paidAmount: 0,
      }
      db.invoices.push(inv)
      syncCreateInvoice(wsId, inv)
      pushAudit(db, wsId, `إصدار فاتورة ${inv.number} بقيمة ${invoiceTotal(inv).toLocaleString('en-US')} ر.س`)
      // خصم المخزون مرة واحدة عند الإصدار — لا يتكرر
      if (status !== 'draft') {
        clean.forEach((i) => {
          if (!i.itemId) return
          const s = db.stock.find((x) => x.id === i.itemId)
          if (s) {
            s.quantity -= i.qty
            db.movements.push({ id: uid(), wsId, itemId: s.id, type: 'out', qty: i.qty, date: today(), ref: `بيع — فاتورة ${inv.number}` })
          }
        })
      }
    })
    setErr(''); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr('فاتورة ضريبية جديدة')}</DialogTitle>
          <DialogDescription>
            {tr('إصدار الفاتورة يخصم الكميات من المستودع تلقائياً ويربط الحركة برقمها.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{tr('العميل')}</Label><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder={tr('اسم العميل أو الشركة')} /></div>
            <div className="space-y-1.5"><Label>{tr('جوال العميل (واتساب)')}</Label><Input dir="ltr" className="num text-right" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" /></div>
            <div className="space-y-1.5"><Label>{tr('تاريخ الاستحقاق')}</Label><Input type="date" dir="ltr" className="num text-right" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>{tr('ضريبة القيمة المضافة %')}</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="0">{tr('0% — معفى')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{tr('الأصناف')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, { name: '', qty: 1, price: '' as any }])} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> {tr('إضافة سطر')}
              </Button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6 space-y-1">
                  {i === 0 && <span className="text-[11px] text-muted-foreground">{tr('الصنف')}</span>}
                  <Select value={it.itemId ?? ''} onValueChange={(v) => pickStock(i, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={tr('اختر من المستودع أو اكتب يدوياً')} /></SelectTrigger>
                    <SelectContent>
                      {stock.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} — المتاح {s.quantity.toLocaleString('en-US')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  {i === 0 && <span className="text-[11px] text-muted-foreground">{tr('الكمية')}</span>}
                  <Input type="number" min="0" dir="ltr" className="num text-right" value={String(it.qty)} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 space-y-1">
                  {i === 0 && <span className="text-[11px] text-muted-foreground">{tr('السعر')}</span>}
                  <Input type="number" min="0" step="0.01" dir="ltr" className="num text-right" value={String(it.price)} onChange={(e) => setItem(i, { price: Number(e.target.value) })} placeholder={it.itemId ? undefined : tr('يدوي')} />
                </div>
                <div className="col-span-1 pb-1">
                  <button aria-label={tr('حذف السطر')} className="text-muted-foreground hover:text-red-600" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {!it.itemId && (
                  <div className="col-span-12 -mt-1">
                    <Input value={it.name} onChange={(e) => setItem(i, { name: e.target.value, itemId: undefined })} placeholder={tr('اسم الصنف (خدمة أو صنف غير مخزّن)')} className="h-8 text-xs" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{tr('الإجمالي قبل الضريبة')}</span><span className="num font-bold">{invoiceSubtotal(draft).toLocaleString('en-US')} ر.س</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{tr(`ضريبة القيمة المضافة (${vatRate}%)`)}</span><span className="num font-bold">{invoiceVat(draft).toLocaleString('en-US')} ر.س</span></div>
            <div className="mt-1 flex justify-between border-t pt-2 text-base font-black"><span>{tr('الإجمالي المستحق')}</span><span className="num">{invoiceTotal(draft).toLocaleString('en-US')} ر.س</span></div>
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{err}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="outline" onClick={() => save('draft')}>{tr('حفظ كمسودة')}</Button>
          <Button onClick={() => save('sent')}>{tr('إصدار الفاتورة وخصم المخزون')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- مستند الفاتورة القابل للطباعة ---------------- */
export function InvoiceDoc({ inv, ws, printButton = true }: { inv: Invoice; ws: Workspace; printButton?: boolean }) {
  const sub = invoiceSubtotal(inv)
  const vat = invoiceVat(inv)
  const total = invoiceTotal(inv)
  const remaining = total - inv.paidAmount
  const statusLabel: Record<string, string> = { draft: 'مسودة', sent: 'قيد التحصيل', paid: 'مدفوعة', overdue: 'متأخرة' }
  return (
    <div className="min-h-screen bg-white">
      <div className={`mx-auto max-w-3xl bg-white p-8 text-foreground ${printButton ? 'print-area' : ''}`}>
        {printButton && (
          <div className="no-print mb-4 flex gap-2 print:hidden">
            <Button onClick={() => window.print()}>{tr('طباعة / حفظ PDF')}</Button>
          </div>
        )}
        {/* الترويسة */}
        <div className="flex items-start justify-between border-b-4 border-[#101C32] pb-5">
          <div className="flex items-center gap-3">
            {ws.logo ? (
              <img src={ws.logo} alt={tr('شعار المنشأة')} className="h-16 w-16 rounded-lg object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#101C32] text-xl font-black text-[#D8B36A]">
                {ws.name.slice(0, 2)}
              </div>
            )}
            <div>
              <div className="text-xl font-black">{ws.name}</div>
              <div className="text-xs text-muted-foreground">{ws.address}</div>
              <div className="num text-xs text-muted-foreground">هاتف: {ws.phone || '—'}</div>
              <div className="num text-xs text-muted-foreground">الرقم الضريبي: {ws.vatNumber || '—'}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="num text-2xl font-black text-[#101C32]">{inv.number}</div>
            <div className="text-xs text-muted-foreground">{tr('فاتورة ضريبية')}</div>
            <div className={`num mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${remaining <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {tr(statusLabel[inv.status])}
            </div>
          </div>
        </div>

        {/* بيانات العميل والتواريخ */}
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="mb-1 text-xs font-bold text-muted-foreground">{tr('فاتورة إلى')}</div>
            <div className="text-base font-black">{inv.client}</div>
            {inv.clientPhone && <div className="num text-xs text-muted-foreground">{inv.clientPhone}</div>}
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between"><span className="text-muted-foreground">{tr('تاريخ الإصدار')}</span><span className="num font-bold">{fmtDate(inv.date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{tr('تاريخ الاستحقاق')}</span><span className="num font-bold">{fmtDate(inv.dueDate)}</span></div>
          </div>
        </div>

        {/* الأصناف */}
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="bg-[#101C32] text-white">
              <th className="rounded-s-lg px-3 py-2 text-right font-bold">{tr('الصنف')}</th>
              <th className="px-3 py-2 text-center font-bold">{tr('الكمية')}</th>
              <th className="px-3 py-2 text-center font-bold">{tr('سعر الوحدة')}</th>
              <th className="rounded-e-lg px-3 py-2 text-left font-bold">{tr('الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2.5 font-semibold">{it.name}</td>
                <td className="num px-3 py-2.5 text-center">{it.qty.toLocaleString('en-US')}</td>
                <td className="num px-3 py-2.5 text-center">{it.price.toLocaleString('en-US')}</td>
                <td className="num px-3 py-2.5 text-left font-bold">{(it.qty * it.price).toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* الإجماليات */}
        <div className="mt-5 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>{tr('الإجمالي قبل الضريبة')}</span><span className="num font-bold">{sub.toLocaleString('en-US')} ر.س</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{tr(`ضريبة القيمة المضافة (${inv.vatRate}%)`)}</span><span className="num font-bold">{vat.toLocaleString('en-US')} ر.س</span></div>
            <div className="flex justify-between border-t-2 border-[#101C32] pt-2 text-lg font-black"><span>{tr('الإجمالي المستحق')}</span><span className="num">{total.toLocaleString('en-US')} ر.س</span></div>
            {inv.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-emerald-600"><span>{tr('المحصّل')}</span><span className="num font-bold">{inv.paidAmount.toLocaleString('en-US')} ر.س</span></div>
                <div className="flex justify-between font-bold text-red-600"><span>{tr('المتبقي')}</span><span className="num">{remaining.toLocaleString('en-US')} ر.س</span></div>
              </>
            )}
          </div>
        </div>

        {/* الختم والتوقيع */}
        <div className="mt-14 flex items-end justify-between">
          <div className="text-xs text-muted-foreground">
            <div className="mb-1 font-bold text-foreground">{tr('ملاحظات')}</div>
            <div>{tr('تُسدد المبالغ قبل تاريخ الاستحقاق. يُحتسب إجمالي المستحق شاملاً ضريبة القيمة المضافة.')}</div>
          </div>
          <div className="text-center">
            {ws.stamp ? (
              <img src={ws.stamp} alt={tr('ختم المنشأة')} className="mx-auto h-24 w-24 object-contain opacity-90" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-[10px] text-slate-400">
                {tr('ختم المنشأة')}
              </div>
            )}
            <div className="mt-1 text-[11px] font-bold">{tr('التوقيع والختم')}</div>
          </div>
        </div>

        <div className="num mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
          {tr('أُنشئت عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل')}
        </div>
      </div>
    </div>
  )
}

/* ---------------- تصدير الفاتورة كصورة PNG (رسم يدوي كامل غير مقصوص) ---------------- */
export async function downloadInvoicePng(inv: Invoice, ws: Workspace) {
  try { await document.fonts.load('900 48px Cairo'); await document.fonts.ready } catch { /* تجاهل */ }

  const NAVY = '#101C32'
  const GOLD = '#D8B36A'
  const IVORY = '#F6F2E9'
  const rowH = 64
  const W = 1080
  const H = 900 + inv.items.length * rowH
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const num = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`
  const statusLabel: Record<string, string> = { draft: 'مسودة', sent: 'قيد التحصيل', paid: 'مدفوعة', overdue: 'متأخرة' }
  const sub = invoiceSubtotal(inv)
  const vat = invoiceVat(inv)
  const total = invoiceTotal(inv)
  const remaining = total - inv.paidAmount

  ctx.fillStyle = IVORY
  ctx.fillRect(0, 0, W, H)

  // الترويسة الكحلية
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, 240)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 240, W, 8)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  // الشعار أو الحرفان الأولى
  try {
    if (ws.logo) {
      const img = new Image()
      await new Promise((res) => { img.onload = res; img.onerror = res; img.src = ws.logo! })
      if (img.width) {
        const s = 96
        ctx.save(); ctx.beginPath(); ctx.arc(W - 60 - s / 2, 92, s / 2, 0, Math.PI * 2); ctx.clip()
        ctx.drawImage(img, W - 60 - s, 44, s, s); ctx.restore()
      }
    }
  } catch { /* بدون شعار */ }
  ctx.fillStyle = GOLD
  ctx.font = '900 46px Cairo'
  ctx.fillText(ws.name, W - 190, 90)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 26px Cairo'
  const lines = [ws.address, ws.phone ? `هاتف: ${ws.phone}` : '', ws.vatNumber ? `الرقم الضريبي: ${ws.vatNumber}` : ''].filter((x): x is string => Boolean(x))
  lines.slice(0, 3).forEach((t, i) => ctx.fillText(t, W - 190, 130 + i * 32))

  // رقم الفاتورة والحالة (يسار)
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '900 44px "Hanken Grotesk", Cairo'
  ctx.fillText(inv.number, 60, 100)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 26px Cairo'
  ctx.fillText('فاتورة ضريبية', 60, 140)
  ctx.fillStyle = remaining <= 0 ? '#7BE3A8' : '#FFD98A'
  ctx.font = '700 26px Cairo'
  ctx.fillText(statusLabel[inv.status], 60, 182)

  let y = 320
  // بيانات العميل والتواريخ
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(W - 60 - (W - 120) / 2 + 8, y - 44, (W - 120) / 2 - 16, 108)
  ctx.fillRect(60 + 8, y - 44, (W - 120) / 2 - 16, 108)
  ctx.fillStyle = '#8A93A8'
  ctx.font = '700 24px Cairo'
  ctx.fillText('فاتورة إلى', W - 90, y - 12)
  ctx.fillText('التواريخ', W / 2 - 24, y - 12)
  ctx.fillStyle = NAVY
  ctx.font = '900 32px Cairo'
  ctx.fillText(inv.client, W - 90, y + 26)
  ctx.font = '700 26px Cairo'
  ctx.fillText(`الإصدار: ${inv.date}`, W / 2 - 24, y + 8)
  ctx.fillText(`الاستحقاق: ${inv.dueDate}`, W / 2 - 24, y + 44)
  if (inv.clientPhone) {
    ctx.direction = 'ltr'; ctx.textAlign = 'right'
    ctx.fillStyle = '#3A4660'
    ctx.font = '600 24px "Hanken Grotesk", Cairo'
    ctx.fillText(inv.clientPhone, W - 90, y + 52)
  }
  y += 110

  // جدول الأصناف
  const colX = { name: W - 60, qty: W - 640, price: W - 810, total: 60 }
  ctx.fillStyle = NAVY
  ctx.fillRect(60, y, W - 120, 56)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '800 26px Cairo'
  ctx.direction = 'rtl'; ctx.textAlign = 'right'
  ctx.fillText('الصنف', colX.name - 20, y + 37)
  ctx.textAlign = 'center'
  ctx.fillText('الكمية', colX.qty, y + 37)
  ctx.fillText('سعر الوحدة', colX.price, y + 37)
  ctx.textAlign = 'left'
  ctx.fillText('الإجمالي', colX.total + 20, y + 37)
  y += 56

  inv.items.forEach((it, i) => {
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(60, y, W - 120, rowH) }
    ctx.fillStyle = 'rgba(16,28,50,0.15)'
    ctx.fillRect(60, y + rowH - 1, W - 120, 1)
    ctx.fillStyle = NAVY
    ctx.font = '700 27px Cairo'
    ctx.direction = 'rtl'; ctx.textAlign = 'right'
    ctx.fillText(it.name.length > 34 ? `${it.name.slice(0, 33)}…` : it.name, colX.name - 20, y + rowH / 2 + 9)
    ctx.direction = 'ltr'
    ctx.fillStyle = '#3A4660'
    ctx.font = '700 27px "Hanken Grotesk", Cairo'
    ctx.textAlign = 'center'
    ctx.fillText(it.qty.toLocaleString('en-US'), colX.qty, y + rowH / 2 + 9)
    ctx.fillText(it.price.toLocaleString('en-US'), colX.price, y + rowH / 2 + 9)
    ctx.textAlign = 'left'
    ctx.fillStyle = NAVY
    ctx.fillText((it.qty * it.price).toLocaleString('en-US'), colX.total + 20, y + rowH / 2 + 9)
    y += rowH
  })

  // الإجماليات — بطاقة كحلية يمين المستند
  y += 36
  const boxW = 520
  const ty = y + 128
  const lastTotY = inv.paidAmount > 0 ? ty + 84 : ty
  const boxH = lastTotY - y + 28
  ctx.fillStyle = NAVY
  ctx.fillRect(W - 60 - boxW, y, boxW, boxH)
  const totLine = (label: string, value: string, yy: number, strong = false, color = GOLD) => {
    ctx.direction = 'rtl'; ctx.textAlign = 'right'
    ctx.fillStyle = strong ? GOLD : 'rgba(255,255,255,0.75)'
    ctx.font = `${strong ? '900' : '600'} ${strong ? 28 : 23}px Cairo`
    ctx.fillText(label, W - 90, yy)
    ctx.direction = 'ltr'; ctx.textAlign = 'left'
    ctx.fillStyle = color
    ctx.font = `800 ${strong ? 28 : 23}px "Hanken Grotesk", Cairo`
    ctx.fillText(value, W - 60 - boxW + 28, yy)
  }
  totLine('الإجمالي قبل الضريبة', num(sub), y + 40)
  totLine(`ضريبة القيمة المضافة (${inv.vatRate}%)`, num(vat), y + 78)
  ctx.fillStyle = GOLD
  ctx.fillRect(W - 60 - boxW, ty - 34, boxW, 3)
  totLine('الإجمالي المستحق', num(total), ty, true)
  if (inv.paidAmount > 0) {
    totLine('المحصّل', num(inv.paidAmount), ty + 44, false, '#7BE3A8')
    totLine('المتبقي', num(remaining), ty + 84, true, remaining > 0 ? '#FF9B9B' : '#7BE3A8')
  }

  // الملاحظات والتوقيع (يسار المستند — بعيداً عن صندوق الإجماليات)
  ctx.direction = 'rtl'; ctx.textAlign = 'right'
  ctx.fillStyle = '#3A4660'
  ctx.font = '700 24px Cairo'
  ctx.fillText('ملاحظات', 470, y + 36)
  ctx.font = '500 20px Cairo'
  ctx.fillText('تُسدد المبالغ قبل تاريخ الاستحقاق.', 470, y + 72)
  ctx.fillText('يُحتسب الإجمالي المستحق شاملاً ضريبة القيمة المضافة.', 470, y + 104)
  ctx.strokeStyle = 'rgba(16,28,50,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(280, y + 210, 64, 0, Math.PI * 2)
  ctx.setLineDash([8, 6])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(16,28,50,0.4)'
  ctx.font = '600 20px Cairo'
  ctx.textAlign = 'center'
  ctx.fillText('ختم المنشأة', 280, y + 216)
  ctx.fillStyle = NAVY
  ctx.font = '700 22px Cairo'
  ctx.fillText('التوقيع والختم', 280, y + 306)

  // تذييل
  ctx.fillStyle = 'rgba(16,28,50,0.45)'
  ctx.font = '600 22px Cairo'
  ctx.fillText('أُنشئت عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل', W / 2, H - 28)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `فاتورة-${inv.number}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, 'image/png')
}

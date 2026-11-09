import { useRef, useState } from 'react'
import { tr } from '@/lib/i18n'
import { Download, Printer, ReceiptText, Share2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/Logo'
import { fmtNum, today, type Asset, type Workspace } from '@/lib/store'

export interface ShareData {
  asset: Asset
  ws: Workspace
  purchaseValue: number
  expensesTotal: number
  totalPaid: number
  outcome: { label: string; value: number; positive: boolean }
}

export function collectData(asset: Asset, ws: Workspace): ShareData {
  const expensesTotal = asset.expenses.reduce((a, e) => a + e.amount, 0)
  const totalPaid = asset.purchaseValue + expensesTotal
  const outcomeValue = (asset.sold ? asset.soldPrice ?? 0 : asset.currentValue) - totalPaid
  return {
    asset, ws,
    purchaseValue: asset.purchaseValue,
    expensesTotal, totalPaid,
    outcome: {
      label: asset.sold ? 'صافي ربح البيع' : 'صافي القيمة الحالية',
      value: outcomeValue,
      positive: outcomeValue >= 0,
    },
  }
}

/* رسم التقرير على Canvas — يدعم العربية (RTL) بخط Cairo */
function drawReport(d: ShareData): HTMLCanvasElement {
  const W = 1080
  const rowH = 74
  const H = 850 + d.asset.expenses.length * rowH + (d.asset.sold ? 50 : 0)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const NAVY = '#101C32'
  const GOLD = '#D8B36A'
  const IVORY = '#F6F2E9'
  const cur = d.asset.currency ?? 'ر.س'
  const num = (n: number) => `${n.toLocaleString('en-US')} ${cur}`

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
  ctx.font = '900 52px Cairo'
  ctx.fillText('تقرير مشاركة أصل', W - 60, 95)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 30px Cairo'
  ctx.fillText(`${d.ws.name} — ${d.asset.name}`, W - 60, 150)
  ctx.font = '600 24px Cairo'
  ctx.fillText(`تاريخ التقرير: ${today()}${d.asset.code ? ` · رمز الأصل: ${d.asset.code}` : ''}`, W - 60, 195)

  let y = 300
  const line = (label: string, value: string, opts?: { strong?: boolean; color?: string }) => {
    ctx.fillStyle = opts?.color ?? (opts?.strong ? NAVY : '#3A4660')
    ctx.font = `${opts?.strong ? '800' : '600'} ${opts?.strong ? 38 : 32}px Cairo`
    ctx.fillText(label, W - 60, y)
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    ctx.fillStyle = opts?.strong ? GOLD : NAVY
    ctx.font = `800 ${opts?.strong ? 40 : 34}px "Hanken Grotesk", Cairo`
    ctx.fillText(value, 60, y)
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
    y += 66
  }

  line('قيمة الشراء', num(d.purchaseValue), { strong: true })
  y += 6
  ctx.fillStyle = 'rgba(16,28,50,0.12)'
  ctx.fillRect(60, y - 46, W - 120, 2)

  ctx.fillStyle = NAVY
  ctx.font = '800 34px Cairo'
  ctx.fillText('المصاريف المسجلة', W - 60, y + 6)
  y += 40
  if (d.asset.expenses.length === 0) {
    ctx.fillStyle = '#3A4660'
    ctx.font = '600 28px Cairo'
    ctx.fillText('لا توجد مصاريف مسجلة', W - 60, y)
    y += 50
  } else {
    d.asset.expenses.forEach((e) => {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(60, y - 34, W - 120, rowH - 12)
      ctx.fillStyle = '#3A4660'
      ctx.font = '600 30px Cairo'
      ctx.fillText(e.label, W - 90, y)
      ctx.direction = 'ltr'
      ctx.textAlign = 'left'
      ctx.fillStyle = NAVY
      ctx.font = '700 30px "Hanken Grotesk", Cairo'
      ctx.fillText(num(e.amount), 90, y)
      ctx.direction = 'rtl'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(16,28,50,0.35)'
      ctx.font = '500 22px "Hanken Grotesk", Cairo'
      ctx.fillText(e.date, W / 2 + 180, y)
      y += rowH
    })
  }

  y += 10
  ctx.fillStyle = 'rgba(16,28,50,0.12)'
  ctx.fillRect(60, y - 46, W - 120, 2)
  line('إجمالي المصاريف', num(d.expensesTotal))
  line('إجمالي ما دُفع عليه', num(d.totalPaid), { strong: true })
  if (d.asset.sold) {
    line('بِعناها بـ', num(d.asset.soldPrice ?? 0))
    ctx.fillStyle = '#3A4660'
    ctx.font = '500 24px "Hanken Grotesk", Cairo'
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    ctx.fillText(d.asset.soldDate ?? '', 60, y - 20)
    ctx.direction = 'rtl'
    ctx.textAlign = 'right'
  } else {
    line(d.asset.occupancy === 'rented' ? 'قيمته الآن (مؤجر)' : 'قيمته الآن', num(d.asset.currentValue))
  }

  // صافي النتيجة
  y += d.asset.sold ? 46 : 26
  ctx.fillStyle = NAVY
  ctx.fillRect(60, y - 50, W - 120, 110)
  ctx.fillStyle = GOLD
  ctx.font = '900 40px Cairo'
  ctx.fillText(d.outcome.label, W - 100, y + 12)
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = d.outcome.positive ? '#7BE3A8' : '#FF9B9B'
  ctx.font = '900 44px "Hanken Grotesk", Cairo'
  ctx.fillText(num(Math.abs(d.outcome.value)), 100, y + 12)
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'

  // تذييل — يُرسم بعد نهاية المحتوى مباشرة (بلا فراغ زائد)
  const finalH = y + 130
  ctx.fillStyle = 'rgba(16,28,50,0.45)'
  ctx.font = '600 24px Cairo'
  ctx.textAlign = 'center'
  ctx.fillText('أُنشئ عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل', W / 2, finalH - 30)

  // قصّ الكانفس على حجم المحتوى الفعلي
  if (finalH < H) {
    const trimmed = document.createElement('canvas')
    trimmed.width = W
    trimmed.height = finalH
    trimmed.getContext('2d')!.drawImage(canvas, 0, 0)
    return trimmed
  }
  return canvas
}

/* نسخة HTML للطباعة / PDF */
function printReport(d: ShareData) {
  const cur = d.asset.currency ?? 'ر.س'
  const num = (n: number) => `${n.toLocaleString('en-US')} ${cur}`
  const rows = d.asset.expenses.map((e) => `<tr><td>${e.label}</td><td class="num">${e.date}</td><td class="num">${num(e.amount)}</td></tr>`).join('')
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير أصل — ${d.asset.name}</title>
  <style>
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:12mm}
    body{font-family:'Cairo',sans-serif;background:#F6F2E9;color:#101C32;margin:0;padding:40px}
    .head{background:#101C32;color:#D8B36A;padding:28px 32px;border-radius:16px}
    .head h1{margin:0;font-size:26px}.head p{color:#EDE8DC;margin:6px 0 0;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:20px;background:#fff;border-radius:12px;overflow:hidden}
    td,th{padding:12px 16px;border-bottom:1px solid #E5E0D3;font-size:14px}th{background:#101C32;color:#fff;text-align:right}
    .num{font-family:'Hanken Grotesk',monospace;direction:ltr;text-align:left}
    .tot{display:flex;justify-content:space-between;background:#101C32;color:#D8B36A;padding:16px 24px;border-radius:12px;margin-top:20px;font-weight:800;font-size:18px}
    @media print{body{padding:0;background:#fff}}
  </style></head><body>
  <div class="head"><h1>تقرير مشاركة أصل</h1><p>${d.ws.name} — ${d.asset.name} · ${today()}</p></div>
  <table><tr><th>البند</th><th>التاريخ</th><th>المبلغ</th></tr>
  <tr><td>قيمة الشراء</td><td class="num">${d.asset.purchaseDate}</td><td class="num">${num(d.purchaseValue)}</td></tr>
  ${rows || '<tr><td colspan="3">لا توجد مصاريف مسجلة</td></tr>'}
  <tr><td colspan="2"><b>إجمالي ما دُفع عليه</b></td><td class="num"><b>${num(d.totalPaid)}</b></td></tr>
  <tr><td colspan="2">${d.asset.sold ? 'بِعناها بـ' : 'قيمته الآن'}</td><td class="num">${num(d.asset.sold ? d.asset.soldPrice ?? 0 : d.asset.currentValue)}</td></tr>
  </table>
  <div class="tot"><span>${d.outcome.label}</span><span class="num">${num(Math.abs(d.outcome.value))} ${d.outcome.positive ? '✓' : ''}</span></div>
  <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:24px">أُنشئ عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
  </body></html>`)
  w.document.close()
}

/* فاتورة بيع الأصل — للطباعة / PDF */
export function printSaleInvoice(d: ShareData) {
  const cur = d.asset.currency ?? 'ر.س'
  const num = (n: number) => `${n.toLocaleString('en-US')} ${cur}`
  const net = (d.asset.soldPrice ?? 0) - d.totalPaid
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة بيع — ${d.asset.name}</title>
  <style>
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:12mm}
    body{font-family:'Cairo',sans-serif;background:#F6F2E9;color:#101C32;margin:0;padding:40px}
    .head{background:#101C32;color:#D8B36A;padding:28px 32px;border-radius:16px}
    .head h1{margin:0;font-size:26px}.head p{color:#EDE8DC;margin:6px 0 0;font-size:14px}
    .inv-title{display:flex;justify-content:space-between;align-items:center;margin-top:20px;background:#fff;padding:14px 20px;border-radius:12px;font-weight:800}
    table{width:100%;border-collapse:collapse;margin-top:16px;background:#fff;border-radius:12px;overflow:hidden}
    td,th{padding:12px 16px;border-bottom:1px solid #E5E0D3;font-size:14px}th{background:#101C32;color:#fff;text-align:right}
    .num{font-family:'Hanken Grotesk',monospace;direction:ltr;text-align:left}
    .tot{display:flex;justify-content:space-between;background:#101C32;color:#D8B36A;padding:16px 24px;border-radius:12px;margin-top:16px;font-weight:800;font-size:18px}
    .sign{display:flex;justify-content:space-between;gap:40px;margin-top:48px;font-size:13px;font-weight:700}
    .sign div{flex:1;border-top:2px solid #101C32;padding-top:8px;text-align:center}
    @media print{body{padding:0;background:#fff}}
  </style></head><body>
  <div class="head"><h1>فاتورة بيع</h1><p>${d.ws.name} — ${d.asset.name}${d.asset.code ? ` · ${d.asset.code}` : ''} · ${today()}</p></div>
  <div class="inv-title"><span>الأصل المُباع: ${d.asset.name}${d.asset.plateNo ? ` — لوحة ${d.asset.plateNo}` : ''}</span><span class="num">${d.asset.soldDate ?? ''}</span></div>
  <table>
    <tr><th>البند</th><th>المبلغ</th></tr>
    <tr><td>قيمة الشراء</td><td class="num">${num(d.purchaseValue)}</td></tr>
    <tr><td>إجمالي المصاريف المسجلة (${d.asset.expenses.length})</td><td class="num">${num(d.expensesTotal)}</td></tr>
    <tr><td><b>إجمالي ما دُفع على الأصل</b></td><td class="num"><b>${num(d.totalPaid)}</b></td></tr>
    <tr><td><b>مبلغ البيع</b></td><td class="num"><b>${num(d.asset.soldPrice ?? 0)}</b></td></tr>
  </table>
  <div class="tot"><span>صافي الربح من البيع</span><span class="num">${num(Math.abs(net))} ${net >= 0 ? '✓' : '(خسارة)'}</span></div>
  <div class="sign"><div>توقيع البائع</div><div>توقيع المشتري</div></div>
  <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:32px">أُنشئت عبر منصة أصول OSOOL — إدارة أذكى .. لحياة أسهل</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
  </body></html>`)
  w.document.close()
}

export function AssetShareDialog({
  open, onClose, asset, ws,
}: { open: boolean; onClose: () => void; asset: Asset | null; ws: Workspace }) {
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  if (!asset) return null
  const d = collectData(asset, ws)
  const cur = asset.currency ?? 'ر.س'

  const downloadPng = async () => {
    setBusy(true)
    // انتظر خط Cairo جاهزاً للرسم على canvas
    try { await document.fonts.load('900 52px Cairo'); await document.fonts.ready } catch { /* تجاهل */ }
    const canvas = drawReport(d)
    canvasRef.current = canvas
    canvas.toBlob((blob) => {
      if (!blob) return setBusy(false)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `أصول-${asset.code ?? asset.name}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setBusy(false)
    }, 'image/png')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#B08D3E]" /> {tr('مشاركة التقرير مع الشريك')}
          </DialogTitle>
          <DialogDescription>{tr('ملخص كامل: كم اشترينا، وكم صرفنا، و')} {asset.sold ? tr('كم بعناها') : tr('قيمتها الآن')} — {tr('بصيغة صورة أو PDF.')}</DialogDescription>
        </DialogHeader>

        {/* معاينة التقرير بنفس هوية النوافذ */}
        <div className="overflow-hidden rounded-2xl border bg-[#F6F2E9]">
          <div className="bg-[#101C32] p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="text-lg font-black text-[#D8B36A]">{tr('تقرير مشاركة أصل')}</div>
              <LogoMark size={30} light />
            </div>
            <div className="mt-1 text-sm text-white/70">{ws.name} — {asset.name}</div>
            <div className="num mt-0.5 text-xs text-white/50">{today()} {asset.code && <>· {asset.code}</>}</div>
          </div>
          <div className="space-y-2.5 p-5 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
              <span className="font-bold">{tr('قيمة الشراء')}</span>
              <span className="num font-black">{fmtNum(d.purchaseValue)} {cur}</span>
            </div>
            <div className="rounded-xl bg-white px-4 py-2.5">
              <div className="mb-1.5 font-bold">{tr('المصاريف المسجلة')} ({asset.expenses.length})</div>
              {asset.expenses.length === 0 ? (
                <div className="text-xs text-muted-foreground">{tr('لا توجد مصاريف')}</div>
              ) : (
                <ul className="space-y-1">
                  {asset.expenses.map((e) => (
                    <li key={e.id} className="num flex items-center justify-between text-xs">
                      <span>{e.label}</span>
                      <span className="font-bold">{fmtNum(e.amount)} {cur} · {e.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
              <span className="font-bold">{tr('إجمالي ما دُفع عليه')}</span>
              <span className="num font-black">{fmtNum(d.totalPaid)} {cur}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
              <span className="font-bold">{asset.sold ? tr('بِعناها بـ') : tr('قيمته الآن')}</span>
              <span className="num font-black">{fmtNum(asset.sold ? asset.soldPrice ?? 0 : asset.currentValue)} {cur}</span>
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-white ${d.outcome.positive ? 'bg-emerald-700' : 'bg-red-800'}`}>
              <span className="font-black">{tr(d.outcome.label)}</span>
              <span className="num text-lg font-black">{fmtNum(Math.abs(d.outcome.value))} {cur} {d.outcome.positive ? '▲' : '▼'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button onClick={downloadPng} disabled={busy} className="gap-1.5">
            <Download className="h-4 w-4" /> {busy ? tr('جارٍ التجهيز…') : tr('مشاركة كصورة')}
          </Button>
          <Button variant="outline" onClick={() => printReport(d)} className="gap-1.5">
            <Printer className="h-4 w-4" /> {tr('طباعة / PDF')}
          </Button>
        </div>
        {asset.sold && (
          <Button variant="outline" onClick={() => printSaleInvoice(d)} className="mt-2 w-full gap-1.5 border-[#B08D3E]/50 text-[#B08D3E] hover:bg-[#D8B36A]/10">
            <ReceiptText className="h-4 w-4" /> {tr('تصدير فاتورة بيع')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

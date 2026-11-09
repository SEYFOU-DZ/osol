import { useState, useEffect } from 'react'
import { tr } from '@/lib/i18n'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  store, uid, today, seedWorkspace, pushAudit, type Asset, type LedgerEntry, type StockItem, type Payment,
} from '@/lib/store'
import {
  syncCreateAsset, syncUpdateAsset, syncAddAssetExpense,
  syncCreatePerson, syncCreateDebt, syncUpdateDebt, syncAddDebtPayment,
  syncCreateStockItem, syncUpdateStockItem, syncRecordStockMovement,
} from '@/lib/sync'
import { apiRequest } from '@/lib/api'

/* أدوات مساعدة داخلية */
function useDraft<T extends Record<string, any>>(open: boolean | undefined, initial: T) {
  const [v, setV] = useState<T>(initial)
  useEffect(() => setV(initial), [JSON.stringify(initial)]) // eslint-disable-line
  // تفريغ الحقول عند كل فتح للنافذة (بقاء آخر مدخلات سبب إرباكاً للمستخدم)
  useEffect(() => { if (open) setV(initial) }, [open]) // eslint-disable-line
  const set = (k: keyof T, val: any) => setV((p) => ({ ...p, [k]: val }))
  return [v, set, setV] as const
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Err({ msg }: { msg: string }) {
  if (!msg) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{msg}</p>
}

const num = (s: string) => Number(s) || 0

/* ---------------- أصل ---------------- */
const ASSET_CATEGORIES = ['سيارات', 'عقار', 'أخرى']
const CURRENCIES = ['ر.س', '$', 'د.إ', '€']

export function AssetFormDialog({
  open, onClose, wsId, asset, initialCategory,
}: { open: boolean; onClose: () => void; wsId: string; asset?: Asset; initialCategory?: string }) {
  const [v, set] = useDraft(open, {
    name: asset?.name ?? '',
    category: asset
      ? (ASSET_CATEGORIES.includes(asset.category) ? asset.category : 'أخرى')
      : (initialCategory ?? 'عقار'),
    customCategory: asset && !ASSET_CATEGORIES.includes(asset.category) ? asset.category : '',
    code: asset?.code ?? '',
    currency: asset?.currency ?? 'ر.س',
    purchaseValue: asset ? String(asset.purchaseValue) : '',
    currentValue: asset ? String(asset.currentValue) : '',
    purchaseDate: asset?.purchaseDate ?? today(),
    plateNo: asset?.plateNo ?? '',
    insuranceUntil: asset?.insuranceUntil ?? '',
    inspectionUntil: asset?.inspectionUntil ?? '',
    registrationUntil: asset?.registrationUntil ?? '',
    status: asset?.sold ? 'sold' : 'owned',
    soldPrice: asset?.soldPrice ? String(asset.soldPrice) : '',
    soldDate: asset?.soldDate ?? today(),
    occupancy: asset?.occupancy ?? 'vacant',
    rentAmount: asset?.rentAmount ? String(asset.rentAmount) : '',
    notes: asset?.notes ?? '',
  })
  const [err, setErr] = useState('')
  const isCar = v.category === 'سيارات'
  const finalCategory = v.category === 'أخرى' ? (v.customCategory.trim() || 'أخرى') : v.category

  const submit = () => {
    if (!v.name.trim()) return setErr(tr('يرجى إدخال اسم الأصل'))
    if (v.category === 'أخرى' && !v.customCategory.trim()) return setErr(tr('سمِّ تصنيف «أخرى»'))
    if (num(v.purchaseValue) <= 0) return setErr(tr('يرجى إدخال قيمة صحيحة'))
    const isSold = v.status === 'sold'
    if (isSold && num(v.soldPrice) <= 0) return setErr(tr('أدخل مبلغ البيع'))
    const cv = num(v.currentValue) > 0 ? num(v.currentValue) : num(v.purchaseValue)
    const data = {
      name: v.name.trim(), category: finalCategory, currency: v.currency,
      purchaseValue: num(v.purchaseValue), currentValue: isSold ? 0 : cv, purchaseDate: v.purchaseDate,
      code: v.code.trim() || undefined,
      plateNo: isCar ? v.plateNo.trim() || undefined : undefined,
      insuranceUntil: isCar ? v.insuranceUntil || undefined : undefined,
      inspectionUntil: isCar ? v.inspectionUntil || undefined : undefined,
      registrationUntil: isCar ? v.registrationUntil || undefined : undefined,
      sold: isSold || undefined,
      soldPrice: isSold ? num(v.soldPrice) : undefined,
      soldDate: isSold ? v.soldDate : undefined,
      occupancy: v.category === 'عقار' ? v.occupancy : undefined,
      rentAmount: v.category === 'عقار' && v.occupancy === 'rented' ? num(v.rentAmount) || undefined : undefined,
      notes: v.notes.trim() || undefined,
    }
    store.set((db) => {
      if (asset) {
        const a = db.assets.find((x) => x.id === asset.id)
        if (a) Object.assign(a, data)
        syncUpdateAsset(asset.id, data)
      } else {
        const newId = uid()
        db.assets.push({ id: newId, wsId, expenses: [], ...data })
        syncCreateAsset(wsId, data)
      }
      pushAudit(db, asset?.wsId ?? wsId, `${asset ? 'تعديل' : 'إضافة'} أصل «${data.name}»`)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? tr('تعديل أصل') : tr('إضافة أصل')}</DialogTitle>
          <DialogDescription>{tr('لكل تصنيف حقوله الخاصة — السيارات مثلاً تحفظ اللوحة وتواريخ التأمين والفحص والاستمارة.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('التصنيف')}>
              <Select value={v.category} onValueChange={(x) => set('category', x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{tr(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={tr('رمز التعريف (اختياري)')}><Input className="num" dir="ltr" value={v.code} onChange={(e) => set('code', e.target.value)} placeholder={`AST-${Date.now().toString().slice(-4)}`} /></Field>
          </div>
          {v.category === 'أخرى' && (
            <Field label={tr('اسم التصنيف')}><Input value={v.customCategory} onChange={(e) => set('customCategory', e.target.value)} placeholder={tr('مثال: معدات، أجهزة، رأس مال…')} /></Field>
          )}
          <Field label={tr('اسم الأصل')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={isCar ? tr('مثال: لكزس LX 2024') : tr('مثال: فيلا الرياض، مستودع، خط إنتاج')} /></Field>
          {isCar && (
            <div className="space-y-3 rounded-xl border border-[#D8B36A]/50 bg-[#D8B36A]/10 p-3">
              <div className="text-xs font-black text-[#B08D3E]">{tr('بيانات المركبة')}</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('رقم اللوحة')}><Input className="num" value={v.plateNo} onChange={(e) => set('plateNo', e.target.value)} placeholder={tr('أ ب ج 1234')} /></Field>
                <Field label={tr('تاريخ انتهاء التأمين')}><Input type="date" dir="ltr" className="num text-right" value={v.insuranceUntil} onChange={(e) => set('insuranceUntil', e.target.value)} /></Field>
                <Field label={tr('تاريخ انتهاء الفحص الدوري')}><Input type="date" dir="ltr" className="num text-right" value={v.inspectionUntil} onChange={(e) => set('inspectionUntil', e.target.value)} /></Field>
                <Field label={tr('تاريخ انتهاء الاستمارة')}><Input type="date" dir="ltr" className="num text-right" value={v.registrationUntil} onChange={(e) => set('registrationUntil', e.target.value)} /></Field>
                <Field label={tr('حالة المركبة')}>
                  <Select value={v.status} onValueChange={(x) => set('status', x)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owned">{tr('مملوكة')}</SelectItem>
                      <SelectItem value="sold">{tr('مُباعة')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {v.status === 'sold' && (
                  <>
                    <Field label={tr(`مبلغ البيع (${v.currency})`)}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.soldPrice} onChange={(e) => set('soldPrice', e.target.value)} placeholder="0" /></Field>
                    <Field label={tr('تاريخ البيع')}><Input type="date" dir="ltr" className="num text-right" value={v.soldDate} onChange={(e) => set('soldDate', e.target.value)} /></Field>
                  </>
                )}
              </div>
            </div>
          )}
          {v.category === 'عقار' && (
            <div className="space-y-3 rounded-xl border border-[#3D5A80]/30 bg-[#3D5A80]/5 p-3">
              <div className="text-xs font-black text-[#3D5A80]">{tr('بيانات العقار')}</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('حالة العقار')}>
                  <Select value={v.occupancy} onValueChange={(x) => set('occupancy', x)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">{tr('شاغر')}</SelectItem>
                      <SelectItem value="rented">{tr('مؤجر')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {v.occupancy === 'rented' && (
                  <Field label={tr('الإيجار الشهري (ر.س)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.rentAmount} onChange={(e) => set('rentAmount', e.target.value)} placeholder="0" /></Field>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('العملة')}>
              <Select value={v.currency} onValueChange={(x) => set('currency', x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{tr(c)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={tr('تاريخ الاقتناء')}><Input type="date" dir="ltr" className="num text-right" value={v.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} /></Field>
            <Field label={tr(`قيمة الشراء (${v.currency})`)}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.purchaseValue} onChange={(e) => set('purchaseValue', e.target.value)} placeholder="0" /></Field>
            <Field label={tr(`القيمة الحالية (${v.currency})`)}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.currentValue} onChange={(e) => set('currentValue', e.target.value)} placeholder={tr('تساوي الشراء إن تُركت فارغة')} /></Field>
          </div>
          <Field label={tr('معلومات إضافية')}><Textarea rows={2} value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder={tr('ملاحظات، موقع، حالة…')} /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{asset ? tr('حفظ التعديلات') : tr('إضافة الأصل')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- مصروف أصل ---------------- */
export function AssetExpenseDialog({
  open, onClose, assetId,
}: { open: boolean; onClose: () => void; assetId: string }) {
  const [v, set] = useDraft(open, { label: '', amount: '', date: today() })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.label.trim()) return setErr(tr('أدخل وصف المصروف'))
    if (num(v.amount) <= 0) return setErr(tr('أدخل مبلغاً صحيحاً'))
    store.set((db) => {
      const a = db.assets.find((x) => x.id === assetId)
      if (a) {
        const exp = { id: uid(), date: v.date, label: v.label.trim(), amount: num(v.amount) }
        a.expenses.push(exp)
        syncAddAssetExpense(assetId, exp)
        pushAudit(db, a.wsId, `مصروف «${v.label.trim()}» بقيمة ${num(v.amount).toLocaleString('en-US')} ر.س على أصل`)
      }
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('تسجيل مصروف على الأصل')}</DialogTitle>
          <DialogDescription>{tr('يُضاف لسجل المصاريف ويُحتسب ضمن إجمالي المدفوع على الأصل.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('الوصف')}><Input value={v.label} onChange={(e) => set('label', e.target.value)} placeholder={tr('مثال: صيانة، تأمين، ترخيص')} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('المبلغ (ر.س)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
            <Field label={tr('التاريخ')}><Input type="date" dir="ltr" className="num text-right" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('حفظ المصروف')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- محفظة ---------------- */
export function WalletFormDialog({ open, onClose, wsId }: { open: boolean; onClose: () => void; wsId: string }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!name.trim()) return setErr(tr('أدخل اسم المحفظة'))
    store.set((db) => { db.wallets.push({ id: uid(), wsId, name: name.trim() }) })
    apiRequest(`/workspaces/${wsId}/wallets`, {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() })
    }).catch(() => {})
    setName(''); setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('محفظة جديدة')}</DialogTitle>
          <DialogDescription>{tr('مثال: رواتب الموظفين، عملاء وتجار، مصاريف المنزل.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('اسم المحفظة')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('إنشاء المحفظة')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- شخص ---------------- */
export function PersonFormDialog({
  open, onClose, wsId, walletId,
}: { open: boolean; onClose: () => void; wsId: string; walletId?: string }) {
  const [v, set] = useDraft(open, { name: '', phone: '', walletId: walletId ?? '' })
  const wallets = store.get().wallets.filter((w) => w.wsId === wsId)
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.name.trim()) return setErr(tr('أدخل اسم الشخص'))
    if (!v.walletId) return setErr(tr('اختر المحفظة'))
    store.set((db) => {
      const pData = { id: uid(), wsId, walletId: v.walletId, name: v.name.trim(), phone: v.phone.trim() || undefined }
      db.people.push(pData)
      syncCreatePerson(wsId, pData)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('إضافة شخص')}</DialogTitle>
          <DialogDescription>{tr('سيتم فتح كشف حساب مستقل له (له / عليه) مع إمكانية الطباعة.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('الاسم')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('الجوال (واتساب)')}><Input type="tel" dir="ltr" className="num text-right" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xxxxxxxx" /></Field>
            <Field label={tr('المحفظة')}>
              <Select value={v.walletId} onValueChange={(x) => set('walletId', x)}>
                <SelectTrigger><SelectValue placeholder={tr('اختر…')} /></SelectTrigger>
                <SelectContent>{wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('إضافة الشخص')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- قيد له/عليه ---------------- */
export function EntryFormDialog({
  open, onClose, wsId, personId, entry,
}: { open: boolean; onClose: () => void; wsId: string; personId?: string; entry?: LedgerEntry }) {
  const wallets = store.get().wallets.filter((w) => w.wsId === wsId)
  const [v, set] = useDraft(open, {
    personId: entry?.personId ?? personId ?? '',
    direction: entry?.direction ?? 'for',
    amount: entry ? String(entry.amount) : '',
    date: entry?.date ?? today(),
    dueDate: entry?.dueDate ?? '',
    interest: entry?.interest ? String(entry.interest) : '',
    note: entry?.note ?? '',
  })
  const [newPerson, setNewPerson] = useState({ name: '', phone: '', walletId: '' })
  const [err, setErr] = useState('')
  const isNewPerson = v.personId === '__new__'

  useEffect(() => {
    if (open) setNewPerson({ name: '', phone: '', walletId: wallets[0]?.id ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = () => {
    if (isNewPerson && !newPerson.name.trim()) return setErr(tr('أدخل اسم الشخص الجديد'))
    if (!v.personId) return setErr(tr('اختر الشخص'))
    if (num(v.amount) <= 0) return setErr(tr('أدخل مبلغاً صحيحاً'))
    store.set((db) => {
      let pid = v.personId
      if (isNewPerson) {
        pid = uid()
        const newP = {
          id: pid, wsId,
          walletId: newPerson.walletId || wallets[0]?.id || '',
          name: newPerson.name.trim(),
          phone: newPerson.phone.trim() || undefined,
        }
        db.people.push(newP)
        syncCreatePerson(wsId, newP)
      }
      if (entry) {
        const e = db.entries.find((x) => x.id === entry.id)
        const updatePayload = {
          personId: pid, direction: v.direction as 'for' | 'against',
          amount: num(v.amount), date: v.date, dueDate: v.dueDate || undefined,
          interest: num(v.interest) || undefined, note: v.note.trim(), edited: true,
        }
        if (e) Object.assign(e, updatePayload)
        syncUpdateDebt(entry.id, updatePayload)
        pushAudit(db, wsId, `تعديل قيد بقيمة ${num(v.amount)} ر.س`)
      } else {
        const debtPayload = {
          id: uid(), wsId, personId: pid, direction: v.direction as 'for' | 'against',
          amount: num(v.amount), date: v.date, dueDate: v.dueDate || undefined,
          interest: num(v.interest) || undefined, note: v.note.trim(), payments: [],
        }
        db.entries.push(debtPayload)
        syncCreateDebt(wsId, debtPayload)
        pushAudit(db, wsId, `قيد جديد (${v.direction === 'for' ? 'له علينا' : 'لنا عليه'}) بقيمة ${num(v.amount)} ر.س`)
      }
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{entry ? tr('تعديل قيد (دون حذف)') : tr('قيد جديد (له / عليه)')}</DialogTitle>
          <DialogDescription>{tr('أي تعديل لاحق يُوثَّق على القيد ولا يُحذف.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          {!personId && (
            <Field label={tr('الشخص')}>
              <Select value={v.personId} onValueChange={(x) => set('personId', x)}>
                <SelectTrigger><SelectValue placeholder={tr('اختر الشخص…')} /></SelectTrigger>
                <SelectContent>
                  {store.get().people.filter((p) => p.wsId === wsId).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  {!entry && <SelectItem value="__new__">{tr('＋ إضافة شخص جديد…')}</SelectItem>}
                </SelectContent>
              </Select>
            </Field>
          )}
          {isNewPerson && (
            <div className="space-y-3 rounded-xl border border-[#D8B36A]/50 bg-[#D8B36A]/10 p-3">
              <div className="text-xs font-black text-[#B08D3E]">{tr('بيانات الشخص الجديد')}</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('الاسم')}><Input value={newPerson.name} onChange={(e) => setNewPerson((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label={tr('الجوال (واتساب)')}><Input type="tel" dir="ltr" className="num text-right" value={newPerson.phone} onChange={(e) => setNewPerson((p) => ({ ...p, phone: e.target.value }))} placeholder="05xxxxxxxx" /></Field>
              </div>
              <Field label={tr('المحفظة (اختياري — بلا محفظة يُضاف لأول محفظة)')}>
                <Select value={newPerson.walletId} onValueChange={(x) => setNewPerson((p) => ({ ...p, walletId: x }))}>
                  <SelectTrigger><SelectValue placeholder={tr('اختر المحفظة…')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{tr('بدون محفظة محددة')}</SelectItem>
                    {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('الاتجاه')}>
              <Select value={v.direction} onValueChange={(x) => set('direction', x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="for">{tr('له (مستحق له علينا)')}</SelectItem>
                  <SelectItem value="against">{tr('عليه (لنا عليه)')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={tr('المبلغ (ر.س)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
            <Field label={tr('تاريخ القيد')}><Input type="date" dir="ltr" className="num text-right" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label={tr('تاريخ الاستحقاق (اختياري)')}><Input type="date" dir="ltr" className="num text-right" value={v.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
            <Field label={tr('فائدة % (اختياري)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.interest} onChange={(e) => set('interest', e.target.value)} placeholder="0" /></Field>
          </div>
          <Field label={tr('ملاحظة')}><Textarea rows={2} value={v.note} onChange={(e) => set('note', e.target.value)} placeholder={tr('سبب الدين، رقم العقد…')} /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{entry ? tr('حفظ التعديل') : tr('حفظ القيد')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- دفعة ---------------- */
export function PaymentDialog({
  open, onClose, entry, personName, payment,
}: { open: boolean; onClose: () => void; entry: LedgerEntry | null; personName: string; payment?: Payment }) {
  const [v, set] = useDraft(open, {
    amount: payment ? String(payment.amount) : '',
    date: payment?.date ?? today(),
    note: payment?.note ?? '',
  })
  const [err, setErr] = useState('')
  useEffect(() => {
    if (open) {
      set('amount', payment ? String(payment.amount) : '')
      set('date', payment?.date ?? today())
      set('note', payment?.note ?? '')
      setErr('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const remaining = entry ? entry.amount - entry.payments.reduce((a, p) => a + p.amount, 0) : 0
  const maxAllowed = remaining + (payment ? payment.amount : 0)
  const submit = () => {
    if (!entry) return
    const val = num(v.amount)
    if (val <= 0) return setErr(tr('أدخل مبلغاً صحيحاً'))
    if (val > maxAllowed) return setErr(tr(`المبلغ أكبر من المتاح (${maxAllowed.toLocaleString('en-US')} ر.س)`))
    store.set((db) => {
      const e = db.entries.find((x) => x.id === entry.id)
      if (!e) return
      const payObj = { id: uid(), date: v.date, amount: val, note: v.note.trim() }
      if (payment) {
        const p = e.payments.find((x) => x.id === payment.id)
        if (p) Object.assign(p, { amount: val, date: v.date, note: v.note.trim() })
      } else {
        e.payments.push(payObj as Payment)
        syncAddDebtPayment(entry.id, payObj)
      }
      pushAudit(db, e.wsId, payment ? `تعديل دفعة بقيمة ${val.toLocaleString('en-US')} ر.س` : `دفعة ${val.toLocaleString('en-US')} ر.س على قيد ${personName}`)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{payment ? tr('تعديل دفعة') : tr('تسجيل دفعة')} — {personName}</DialogTitle>
          <DialogDescription>{payment ? tr('عدّل بيانات الدفعة دون حذفها.') : <>{tr('المتبقي على هذا القيد:')} <b className="num">{remaining.toLocaleString('en-US')}</b> {tr('ر.س')}</>}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('مبلغ الدفعة (ر.س)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
            <Field label={tr('التاريخ')}><Input type="date" dir="ltr" className="num text-right" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Field label={tr('ملاحظة')}><Input value={v.note} onChange={(e) => set('note', e.target.value)} placeholder={tr('تحويل بنكي، نقدي…')} /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{payment ? tr('حفظ التعديل') : tr('حفظ الدفعة')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- صنف مستودع ---------------- */
export function ItemFormDialog({
  open, onClose, wsId, item, warehouseId,
}: { open: boolean; onClose: () => void; wsId: string; item?: StockItem; warehouseId?: string }) {
  const [v, set] = useDraft(open, {
    name: item?.name ?? '', sku: item?.sku ?? '', category: item?.category ?? 'تغليف',
    quantity: item ? String(item.quantity) : '', minQuantity: item ? String(item.minQuantity) : '0',
    unitPrice: item ? String(item.unitPrice) : '',
  })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.name.trim()) return setErr(tr('أدخل اسم الصنف'))
    if (num(v.unitPrice) <= 0) return setErr(tr('أدخل سعر وحدة صحيحاً'))
    store.set((db) => {
      if (item) {
        const s = db.stock.find((x) => x.id === item.id)
        const updatePayload = { name: v.name.trim(), sku: v.sku.trim() || s?.sku, category: v.category, quantity: num(v.quantity), minQuantity: num(v.minQuantity), unitPrice: num(v.unitPrice) }
        if (s) Object.assign(s, updatePayload)
        syncUpdateStockItem(item.id, updatePayload)
      } else {
        const itemPayload = { id: uid(), wsId, warehouseId, name: v.name.trim(), sku: v.sku.trim() || `SKU-${Date.now().toString().slice(-5)}`, category: v.category, quantity: num(v.quantity), minQuantity: num(v.minQuantity), unitPrice: num(v.unitPrice) }
        db.stock.push(itemPayload)
        syncCreateStockItem(wsId, itemPayload)
      }
      pushAudit(db, wsId, `${item ? 'تعديل' : 'إضافة'} صنف «${v.name.trim()}» في المخزون`)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{item ? tr('تعديل صنف') : tr('إضافة صنف للمستودع')}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('اسم الصنف')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('رمز SKU')}><Input className="num" dir="ltr" value={v.sku} onChange={(e) => set('sku', e.target.value)} placeholder={tr('تلقائي إن تُرك فارغاً')} /></Field>
            <Field label={tr('الفئة')}>
              <Select value={v.category} onValueChange={(x) => set('category', x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['تغليف', 'مواد خام', 'مستلزمات', 'منتجات', 'أخرى'].map((c) => <SelectItem key={c} value={c}>{tr(c)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={tr('الكمية الحالية')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
            <Field label={tr('حد إعادة الطلب')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.minQuantity} onChange={(e) => set('minQuantity', e.target.value)} /></Field>
            <Field label={tr('سعر الوحدة (ر.س)')}><Input type="number" min="0" step="0.01" dir="ltr" className="num text-right" value={v.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} /></Field>
          </div>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{item ? tr('حفظ التعديلات') : tr('إضافة الصنف')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- حركة مخزون (توريد) ---------------- */
export function MovementDialog({
  open, onClose, wsId, item,
}: { open: boolean; onClose: () => void; wsId: string; item: StockItem | null }) {
  const [v, set] = useDraft(open, { qty: '', ref: '', date: today() })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!item) return
    const q = num(v.qty)
    if (q <= 0) return setErr(tr('أدخل كمية صحيحة'))
    store.set((db) => {
      const s = db.stock.find((x) => x.id === item.id)
      if (s) s.quantity += q
      const movPayload = { id: uid(), wsId, itemId: item.id, type: 'in' as const, qty: q, date: v.date, ref: v.ref.trim() || 'توريد يدوي' }
      db.movements.push(movPayload)
      syncRecordStockMovement(wsId, movPayload)
      pushAudit(db, wsId, `توريد ${q.toLocaleString('en-US')} وحدة إلى «${item.name}»`)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('توريد مخزون')} — {item?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('الكمية الواردة')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.qty} onChange={(e) => set('qty', e.target.value)} /></Field>
            <Field label={tr('التاريخ')}><Input type="date" dir="ltr" className="num text-right" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Field label={tr('مرجع / مورد')}><Input value={v.ref} onChange={(e) => set('ref', e.target.value)} placeholder={tr('مثال: توريد — مورد الخليج')} /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('تسجيل التوريد')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- صندوق نقدي ---------------- */
export function CashboxFormDialog({ open, onClose, wsId }: { open: boolean; onClose: () => void; wsId: string }) {
  const [v, set] = useDraft(open, { name: '', balance: '' })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.name.trim()) return setErr(tr('أدخل اسم الصندوق'))
    store.set((db) => {
      db.cashboxes.push({ id: uid(), wsId, name: v.name.trim(), balance: num(v.balance) })
      pushAudit(db, wsId, `إضافة صندوق نقدي «${v.name.trim()}»`)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('صندوق نقدي جديد')}</DialogTitle>
          <DialogDescription>{tr('مثال: الصندوق الرئيسي، حساب البنك، محفظة نقدية.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('اسم الصندوق')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label={tr('الرصيد الافتتاحي (ر.س)')}><Input type="number" min="0" dir="ltr" className="num text-right" value={v.balance} onChange={(e) => set('balance', e.target.value)} placeholder="0" /></Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('إضافة الصندوق')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- عضو ---------------- */
export function MemberFormDialog({ open, onClose, ws }: { open: boolean; onClose: () => void; ws: { id: string } & { members: any[] } }) {
  const [v, set] = useDraft(open, { name: '', email: '', role: 'accountant' })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.name.trim() || !v.email.trim()) return setErr(tr('أدخل الاسم والبريد'))
    if (ws.members.some((m) => m.email === v.email.trim())) return setErr(tr('هذا البريد مضاف مسبقاً'))
    store.set((db) => {
      const w = db.workspaces.find((x) => x.id === ws.id)
      w?.members.push({ id: uid(), name: v.name.trim(), email: v.email.trim(), role: v.role as any })
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('دعوة عضو للمساحة')}</DialogTitle>
          <DialogDescription>{tr('الصلاحيات: مالك (كل شيء)، محاسب (إضافة وتعديل)، مشاهد (عرض فقط).')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('الاسم')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr('البريد الإلكتروني')}><Input type="email" dir="ltr" className="text-right" value={v.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label={tr('الصلاحية')}>
              <Select value={v.role} onValueChange={(x) => set('role', x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{tr('مالك')}</SelectItem>
                  <SelectItem value="accountant">{tr('محاسب')}</SelectItem>
                  <SelectItem value="viewer">{tr('مشاهد')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('إضافة العضو')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- إنشاء مساحة / مؤسسة ---------------- */
export function WorkspaceFormDialog({
  open, onClose, user, onCreated,
}: { open: boolean; onClose: () => void; user: { name: string; email: string }; onCreated?: (id: string) => void }) {
  const [v, set] = useDraft(open, { name: '', kind: 'business', warehouse: true, invoices: true })
  const [err, setErr] = useState('')
  const submit = () => {
    if (!v.name.trim()) return setErr(tr('أدخل اسم المساحة'))
    store.set((db) => {
      const ws = seedWorkspace(v.name.trim(), v.kind as 'personal' | 'business', user.name, user.email)
      ws.modules = { warehouse: v.warehouse, invoices: v.invoices }
      db.workspaces.push(ws)
      onCreated?.(ws.id)
    })
    setErr(''); onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{tr('إنشاء مساحة جديدة')}</DialogTitle>
          <DialogDescription>{tr('مساحة مستقلة ببياناتها وأعضائها — شخصية لأمورك أو منشأة لعملك.')}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label={tr('اسم المساحة')}><Input value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={tr('مثال: منشأة الأفق التجارية، مساحتي الشخصية')} /></Field>
          <Field label={tr('النوع')}>
            <Select value={v.kind} onValueChange={(x) => set('kind', x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="business">{tr('منشأة / مؤسسة تجارية')}</SelectItem>
                <SelectItem value="personal">{tr('مساحة شخصية')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={tr('الوحدات المفعّلة في هذه المساحة')}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('warehouse', !v.warehouse)}
                className={`rounded-xl border p-3 text-sm font-bold transition-all ${v.warehouse ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A]' : 'bg-card text-muted-foreground'}`}
              >
                {tr('المستودع')} {v.warehouse ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => set('invoices', !v.invoices)}
                className={`rounded-xl border p-3 text-sm font-bold transition-all ${v.invoices ? 'border-[#D8B36A] bg-[#101C32] text-[#D8B36A]' : 'bg-card text-muted-foreground'}`}
              >
                {tr('الفواتير')} {v.invoices ? '✓' : ''}
              </button>
            </div>
          </Field>
          <Err msg={err} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>{tr('إلغاء')}</Button>
          <Button onClick={submit}>{tr('إنشاء المساحة')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* طبقة البيانات المركزية لـ «أصول» — تخزين محلي يحاكي قاعدة بيانات سحابية */
import { tr } from './i18n'

export const fmtSAR = (n: number) =>
  currentPrefs().hideAmounts ? '•••••' : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${tr('ر.س')}`

/* تفضيلات المستخدم الحالي (لغة، تقويم، إخفاء مبالغ) */
export interface UserPrefs { lang?: 'ar' | 'en'; calendar?: 'hijri' | 'gregorian'; hideAmounts?: boolean }
export const currentPrefs = (): UserPrefs => {
  try {
    const u = db.users.find((x) => x.id === db.sessionUserId)
    return u?.prefs ?? {}
  } catch { return {} }
}

/* عرض التاريخ حسب تفضيل التقويم */
export function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  if (currentPrefs().calendar === 'hijri') {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00`))
    } catch { return iso }
  }
  return iso
}

export const fmtNum = (n: number) => n.toLocaleString('en-US')

export const today = () => new Date().toISOString().slice(0, 10)

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/* ---------------- الأنواع ---------------- */

export type Role = 'owner' | 'accountant' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
  trialEndsAt: string
  planId: string
  isAdmin?: boolean
  prefs?: UserPrefs
}

export interface SupportTicket {
  id: string
  userId: string
  userName: string
  subject: string
  message: string
  date: string
  status: 'open' | 'closed'
}

export interface Member {
  id: string
  name: string
  email: string
  role: Role
}

export interface Workspace {
  id: string
  name: string
  kind: 'personal' | 'business'
  logo?: string
  stamp?: string
  vatNumber?: string
  phone?: string
  address?: string
  members: Member[]
  createdAt: string
  currency?: string // عملة المؤسسة الافتراضية
  modules?: { warehouse: boolean; invoices: boolean } // تفعيل وحدات المستودع والفواتير
}

export interface AssetExpense {
  id: string
  date: string
  label: string
  amount: number
}

export interface Asset {
  id: string
  wsId: string
  code?: string // رمز تعريفي
  name: string
  category: string
  currency?: string // عملة القيمة
  purchaseDate: string
  purchaseValue: number
  currentValue: number
  expenses: AssetExpense[]
  // حقول خاصة بالمركبات
  plateNo?: string
  insuranceUntil?: string
  inspectionUntil?: string
  registrationUntil?: string
  // بيع المركبة/الأصل
  sold?: boolean
  soldPrice?: number
  soldDate?: string
  // حقول خاصة بالعقارات
  occupancy?: 'vacant' | 'rented' // شاغر / مؤجر
  rentAmount?: number
  notes?: string
}

export interface Wallet {
  id: string
  wsId: string
  name: string
}

export interface Person {
  id: string
  wsId: string
  walletId: string
  name: string
  phone?: string
}

export interface Payment {
  id: string
  date: string
  amount: number
  note: string
}

export interface LedgerEntry {
  id: string
  wsId: string
  personId: string
  direction: 'for' | 'against' // له / عليه
  amount: number
  date: string
  dueDate?: string
  interest?: number
  note: string
  payments: Payment[]
  edited?: boolean
}

export interface StockItem {
  id: string
  wsId: string
  name: string
  sku: string
  category: string
  quantity: number
  minQuantity: number
  unitPrice: number
  warehouseId?: string
}

export interface StockMovement {
  id: string
  wsId: string
  itemId: string
  type: 'in' | 'out'
  qty: number
  date: string
  ref: string
}

export interface InvoiceItem {
  itemId?: string
  name: string
  qty: number
  price: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export interface Invoice {
  id: string
  wsId: string
  number: string
  client: string
  clientPhone?: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  vatRate: number
  status: InvoiceStatus
  paidAmount: number
}

export interface Cashbox {
  id: string
  wsId: string
  name: string
  balance: number
}

export interface CashboxTxn {
  id: string
  boxId: string
  type: 'in' | 'out'
  amount: number
  note: string
  date: string
}

export interface Warehouse {
  id: string
  wsId: string
  name: string
}

export interface ExchangeRate {
  id: string
  wsId: string
  from: string
  to: string
  rate: number
}

export interface AuditEntry {
  id: string
  wsId: string
  userName: string
  action: string
  date: string // ISO كامل بالوقت
}

export interface Plan {
  id: string
  name: string
  price: number
  workspaces: number // -1 غير محدود
  warehouses: number // -1 غير محدود — عدد المستودعات المسموح
  users: number // -1 غير محدود
  features: string[]
  warehouse: boolean
  invoices: boolean
  active: boolean
}

export interface DB {
  users: User[]
  sessionUserId: string | null
  workspaces: Workspace[]
  plans: Plan[]
  assets: Asset[]
  wallets: Wallet[]
  people: Person[]
  entries: LedgerEntry[]
  stock: StockItem[]
  movements: StockMovement[]
  invoices: Invoice[]
  cashboxes: Cashbox[]
  cashboxTxns: CashboxTxn[]
  warehouses: Warehouse[]
  exchangeRates: ExchangeRate[]
  audit: AuditEntry[]
  dismissed: string[] // تنبيهات تم إغفالها
  tickets: SupportTicket[]
}

/* ---------------- البذور ---------------- */

const seedPlans = (): Plan[] => [
  {
    id: 'free', name: 'الباقة المجانية', price: 0, workspaces: 1, warehouses: 0, users: 1,
    features: ['مساحة عمل واحدة', 'الأصول والديون والمحافظ بحدود أساسية', 'تقارير صافي الثروة'],
    warehouse: false, invoices: false, active: true,
  },
  {
    id: 'pro', name: 'الباقة الاحترافية', price: 99, workspaces: 3, warehouses: 3, users: 5,
    features: ['3 مساحات عمل', 'المستودع والفواتير الضريبية', 'حتى 5 مستخدمين بصلاحيات'],
    warehouse: true, invoices: true, active: true,
  },
  {
    id: 'full', name: 'الباقة الشاملة', price: 150, workspaces: -1, warehouses: -1, users: -1,
    features: ['مساحات ومستخدمون غير محدودين', 'كل الميزات', 'أولوية في الدعم الفني'],
    warehouse: true, invoices: true, active: true,
  },
]

export const seedWorkspace = (name: string, kind: 'personal' | 'business', ownerName: string, email: string): Workspace => ({
  id: uid(),
  name,
  kind,
  vatNumber: kind === 'business' ? '310122393500003' : undefined,
  phone: kind === 'business' ? '0551234567' : undefined,
  address: kind === 'business' ? 'الرياض — حي العليا، طريق الملك فهد' : undefined,
  members: [{ id: uid(), name: ownerName, email, role: 'owner' }],
  createdAt: today(),
  currency: 'ر.س',
  modules: { warehouse: true, invoices: true },
})

export function seedDemoData(_db: DB, _ws: Workspace, _personalWsId: string) {}

/* ---------------- المتجر ---------------- */

const DB_KEY = 'osool_db_v1'

function load(): DB {
  const empty = (): DB => ({ users: [], sessionUserId: null, workspaces: [], plans: seedPlans(), assets: [], wallets: [], people: [], entries: [], stock: [], movements: [], invoices: [], cashboxes: [], cashboxTxns: [], warehouses: [], exchangeRates: [], audit: [], dismissed: [], tickets: [] })
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = { ...empty(), ...(JSON.parse(raw) as DB) }
      // ترحيل: حدود المستودعات للباقات المحفوظة قبل إضافة الحقل
      parsed.plans.forEach((p) => {
        if (p.warehouses === undefined) p.warehouses = p.id === 'free' ? 0 : p.id === 'pro' ? 3 : -1
      })
      // ضمان وجود حساب مدير المنصة
      if (!parsed.users.some((u) => u.isAdmin)) {
        parsed.users.push({
          id: uid(), name: 'مدير المنصة', email: 'admin@osool.app', password: 'admin123',
          createdAt: today(), trialEndsAt: today(), planId: 'full', isAdmin: true,
        })
      }
      return parsed
    }
  } catch {
    /* تجاهل وابدأ من جديد */
  }
  return empty()
}

let db: DB = load()
const listeners = new Set<() => void>()

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* تجاوز اكتمال التخزين */
  }
}

export const store = {
  get(): DB {
    return db
  },
  set(mutate: (draft: DB) => void) {
    mutate(db)
    // مرجع جديد ليلتقطه useSyncExternalStore ويعيد التصيير
    db = { ...db }
    save()
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

/* ---------------- حسابات مشتقة ---------------- */

/* تسجيل حدث في سجل التدقيق — يُستدعى داخل استدعاءات store.set */
export function pushAudit(d: DB, wsId: string, action: string) {
  const u = d.users.find((x) => x.id === d.sessionUserId)
  d.audit.push({ id: uid(), wsId, userName: u?.name ?? 'مستخدم غير معروف', action, date: new Date().toISOString() })
}

export const entryRemaining = (e: LedgerEntry) => e.amount - e.payments.reduce((a, p) => a + p.amount, 0)
export const entrySettled = (e: LedgerEntry) => entryRemaining(e) <= 0

export const invoiceSubtotal = (inv: Invoice) => inv.items.reduce((a, i) => a + i.qty * i.price, 0)
export const invoiceVat = (inv: Invoice) => invoiceSubtotal(inv) * (inv.vatRate / 100)
export const invoiceTotal = (inv: Invoice) => invoiceSubtotal(inv) + invoiceVat(inv)

export function netWorth(db: DB, wsId: string) {
  const assets = db.assets.filter((a) => a.wsId === wsId).reduce((a, x) => a + x.currentValue, 0)
  // «عليه» = لنا عليهم (مستحق لنا) — «له» = لهم علينا (مستحق لهم)
  const receivables = db.entries.filter((e) => e.wsId === wsId && e.direction === 'against').reduce((a, e) => a + entryRemaining(e), 0)
  const liabilities = db.entries.filter((e) => e.wsId === wsId && e.direction === 'for').reduce((a, e) => a + entryRemaining(e), 0)
  const boxes = db.cashboxes.filter((c) => c.wsId === wsId).reduce((a, c) => a + c.balance, 0)
  const stock = db.stock.filter((s) => s.wsId === wsId).reduce((a, s) => a + s.quantity * s.unitPrice, 0)
  const invoicesReceivable = db.invoices.filter((i) => i.wsId === wsId && (i.status === 'sent' || i.status === 'overdue')).reduce((a, i) => a + (invoiceTotal(i) - i.paidAmount), 0)
  // الأرباح المتحققة من بيع الأصول (مبلغ البيع − ما دُفع عليها) — تُضاف لصافي الثروة
  const profits = db.assets.filter((a) => a.wsId === wsId && a.sold).reduce((a, x) => a + (x.soldPrice ?? 0) - x.purchaseValue - x.expenses.reduce((y, e) => y + e.amount, 0), 0)
  return { assets, receivables, liabilities, boxes, stock, invoicesReceivable, profits, net: assets + receivables + boxes + stock + invoicesReceivable + profits - liabilities }
}

export const nextInvoiceNumber = (db: DB, wsId: string) => {
  const nums = db.invoices.filter((i) => i.wsId === wsId).map((i) => parseInt(i.number.replace(/\D/g, ''), 10) || 0)
  return `INV-${(Math.max(0, ...nums) + 1).toString().padStart(3, '0')}`
}

export const daysUntil = (date?: string) => {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export interface Alert {
  id: string
  kind: 'due' | 'stock' | 'invoice'
  title: string
  sub: string
  page: 'debts' | 'warehouse' | 'invoices'
}

/* تنبيهات مساحة عمل — تُرجع كل التنبيهات (غير مُغفَلة ومُغفَلة) مع حالتها */
export function workspaceAlerts(db: DB, wsId: string): Alert[] {
  const alerts: Alert[] = []
  db.entries
    .filter((e) => e.wsId === wsId && e.dueDate && !entrySettled(e))
    .forEach((e) => {
      const days = daysUntil(e.dueDate)
      if (days !== null && days <= 7) {
        const p = db.people.find((x) => x.id === e.personId)
        alerts.push({
          id: `due-${e.id}`, kind: 'due', page: 'debts',
          title: `${tr('استحقاق قريب:')} ${p?.name ?? tr('قيد')}`,
          sub: `${fmtSAR(entryRemaining(e))} ${tr('خلال')} ${days} ${days === 1 ? tr('يوم') : tr('أيام')}`,
        })
      }
    })
  db.invoices
    .filter((i) => i.wsId === wsId && i.status === 'overdue')
    .forEach((i) => alerts.push({
      id: `inv-${i.id}`, kind: 'invoice', page: 'invoices',
      title: `${tr('فاتورة متأخرة:')} ${i.number}`,
      sub: `${i.client} — ${fmtSAR(invoiceTotal(i) - i.paidAmount)}`,
    }))
  db.stock
    .filter((s) => s.wsId === wsId && s.quantity <= s.minQuantity)
    .forEach((s) => alerts.push({
      id: `stock-${s.id}`, kind: 'stock', page: 'warehouse',
      title: `${tr('مخزون منخفض:')} ${s.name}`,
      sub: `${tr('المتبقي')} ${fmtNum(s.quantity)} — ${tr('الحد')} ${fmtNum(s.minQuantity)}`,
    }))
  return alerts
}

export const dismissAlert = (id: string) =>
  store.set((db) => { if (!db.dismissed.includes(id)) db.dismissed.push(id) })

export const dismissAllAlerts = (ids: string[]) =>
  store.set((db) => { ids.forEach((id) => { if (!db.dismissed.includes(id)) db.dismissed.push(id) }) })

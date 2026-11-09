import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Boxes, HandCoins, Package, FileText,
  BarChart3, Settings, Crown, ShieldCheck, LogOut, Bell,
  CalendarClock, FileWarning, AlertTriangle, LifeBuoy, X,
  Check, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PageKey, SubPageKey } from '@/types/nav'
import type { DB, User, Workspace } from '@/lib/store'
import { store, daysUntil, workspaceAlerts, dismissAlert, dismissAllAlerts, currentPrefs } from '@/lib/store'
import { tr, setLang, useLang } from '@/lib/i18n'
import { Logo } from '@/components/Logo'
import { BottomNav } from '@/components/BottomNav'
import { QuickAddFab, type QuickAction } from '@/components/QuickAddFab'
import { Dashboard } from '@/pages/Dashboard'
import { AssetsPage } from '@/pages/Assets'
import { DebtsPage } from '@/pages/Debts'
import { WarehousePage } from '@/pages/Warehouse'
import { InvoicesPage } from '@/pages/Invoices'
import { ReportsPage, SettingsPage, SubscriptionPage, AdminPage, SupportPage } from '@/pages/Org'
import {
  AssetFormDialog, EntryFormDialog, ItemFormDialog, CashboxFormDialog, WorkspaceFormDialog,
} from '@/components/forms'
import { InvoiceFormDialog } from '@/components/Invoice'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const mainNav: { key: PageKey; label: string; en: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'الرئيسية', en: 'Dashboard', icon: LayoutDashboard },
  { key: 'assets', label: 'الأصول', en: 'Assets', icon: Boxes },
  { key: 'debts', label: 'الديون', en: 'Debts', icon: HandCoins },
  { key: 'warehouse', label: 'المستودع', en: 'Inventory', icon: Package },
  { key: 'invoices', label: 'الفواتير', en: 'Invoices', icon: FileText },
]

const orgNav: { key: SubPageKey; label: string; en: string; icon: typeof LayoutDashboard }[] = [
  { key: 'reports', label: 'التقارير', en: 'Reports', icon: BarChart3 },
  { key: 'subscription', label: 'الاشتراك', en: 'Subscription', icon: Crown },
  { key: 'support', label: 'الدعم', en: 'Support', icon: LifeBuoy },
  { key: 'admin', label: 'إدارة المنصة', en: 'Admin', icon: ShieldCheck },
  { key: 'settings', label: 'الإعدادات', en: 'Settings', icon: Settings },
]

const alertIcon = { due: CalendarClock, invoice: FileWarning, stock: AlertTriangle }

export function AppShell({
  db, user, ws, page, sub, onNavigate, onSub, onSwitchWs, onLogout,
}: {
  db: DB
  user: User
  ws: Workspace
  page: PageKey
  sub: SubPageKey | null
  onNavigate: (p: PageKey) => void
  onSub: (s: SubPageKey | null) => void
  onSwitchWs: (id: string) => void
  onLogout: () => void
}) {
  const [quick, setQuick] = useState<QuickAction | null>(null)
  const [addWs, setAddWs] = useState(false)

  const prefLang = currentPrefs().lang ?? 'ar'
  const lang = useLang()
  useEffect(() => {
    setLang(prefLang)
    document.documentElement.lang = prefLang
    document.documentElement.dir = prefLang === 'en' ? 'ltr' : 'rtl'
  }, [prefLang])
  const applyDir = (l: 'ar' | 'en') => {
    document.documentElement.lang = l
    document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl'
  }
  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    applyDir(next)
    setLang(next)
    store.set((db) => {
      const u = db.users.find((x) => x.id === user.id)
      if (u) u.prefs = { ...u.prefs, lang: next }
    })
  }
  const navLabel = (ar: string, en: string) => (lang === 'en' ? en : ar)
  const myWorkspaces = db.workspaces.filter((w) => w.members.some((m) => m.email === user.email))
  const warehouseOn = ws.modules?.warehouse !== false
  const invoicesOn = ws.modules?.invoices !== false
  const effPage: PageKey =
    (page === 'warehouse' && !warehouseOn) || (page === 'invoices' && !invoicesOn) ? 'dashboard' : page

  const trialDays = user.trialEndsAt ? daysUntil(user.trialEndsAt) : null
  const alerts = workspaceAlerts(db, ws.id).filter((a) => !db.dismissed.includes(a.id))

  return (
    <div className="min-h-dvh bg-ivory">
      {/* الشريط الجانبي — ديسكتوب */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-navy text-ivory lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Logo light />
          <p className="mt-3 text-[11px] leading-relaxed text-ivory/50">{tr('إدارة أذكى .. لحياة أسهل')}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ivory/40">{tr('الأنظمة')}</p>
          {mainNav.filter((item) => (item.key !== 'warehouse' || warehouseOn) && (item.key !== 'invoices' || invoicesOn)).map((item) => {
            const active = sub === null && effPage === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-[#D8B36A] font-black text-[#101C32] shadow-md' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                {navLabel(item.label, item.en)}
              </button>
            )
          })}
          <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-wider text-ivory/40">{lang === 'en' ? 'ORGANIZATION' : 'المنظمة'}</p>
          {orgNav.filter((item) => item.key !== 'admin' || user.isAdmin).map((item) => {
            const active = sub === item.key
            return (
              <button
                key={item.key}
                onClick={() => onSub(item.key)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-[#D8B36A] font-black text-[#101C32] shadow-md' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                {navLabel(item.label, item.en)}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-gold/40 bg-gold/20">
              <AvatarFallback className="bg-transparent text-sm font-bold text-gold">
                {user.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-ivory/50">{ws.name}</p>
            </div>
            <button
              onClick={onLogout}
              title={tr('تسجيل الخروج')}
              className="rounded-lg p-2 text-ivory/50 transition-colors hover:bg-white/5 hover:text-ivory"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* الشريط العلوي */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:ms-64">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <DropdownMenu>
              <DropdownMenuTrigger
                title={tr('اضغط للتبديل بين المساحات أو إنشاء مساحة جديدة')}
                className="flex items-center gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-navy/5"
              >
                <h1 className="text-sm font-bold text-navy">{ws.name}</h1>
                <svg className="h-3.5 w-3.5 text-navy/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {myWorkspaces.map((w) => (
                  <DropdownMenuItem key={w.id} onClick={() => onSwitchWs(w.id)} className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center">
                      {w.id === ws.id && <Check className="h-4 w-4 text-[#B08D3E]" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAddWs(true)} className="gap-2 font-bold">
                  <span className="flex h-4 w-4 items-center justify-center text-lg leading-none">＋</span>
                  {lang === 'en' ? 'New workspace' : 'مساحة جديدة'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">
              {db.plans.find((p) => p.id === user.planId)?.name ?? tr('مجاني')}
            </span>
            {trialDays !== null && trialDays > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                {tr('تجربة متبقي')} {trialDays} {tr('يوم')}
              </span>
            )}
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <button
              onClick={toggleLang}
              title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              className="num flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-black text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy"
            >
              <Globe className="h-[16px] w-[16px]" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="relative rounded-xl p-2.5 text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy" aria-label={tr('الإشعارات')}>
                <Bell className="h-[18px] w-[18px]" />
                {alerts.length > 0 && (
                  <span className="absolute end-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {alerts.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">{tr('لا توجد تنبيهات — كل شيء تحت السيطرة')}</div>
                ) : (
                  <>
                    {alerts.map((a) => {
                      const Icon = alertIcon[a.kind]
                      return (
                        <div key={a.id} className="flex items-start gap-2.5 px-3 py-2.5">
                          <button className="min-w-0 flex-1 text-start" onClick={() => { onSub(null); onNavigate(a.page as PageKey) }}>
                            <span className="flex items-center gap-1.5 text-[13px] font-bold text-navy">
                              <Icon className={`h-3.5 w-3.5 shrink-0 ${a.kind === 'due' ? 'text-amber-600' : 'text-red-600'}`} />
                              {tr(a.title)}
                            </span>
                            <span className="num mt-0.5 block text-xs text-muted-foreground">{tr(a.sub)}</span>
                          </button>
                          <button
                            aria-label={tr('إغفال التنبيه')}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => dismissAlert(a.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => dismissAllAlerts(alerts.map((a) => a.id))} className="justify-center text-xs font-bold text-muted-foreground">
                      {tr('إغفال الكل')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full lg:hidden">
                <Avatar className="h-8 w-8 border border-gold/50 bg-gold/20">
                  <AvatarFallback className="bg-transparent text-xs font-bold text-gold-dark">
                    {user.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSub('reports')}>{tr('التقارير')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSub('subscription')}>{tr('الاشتراك')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSub('support')}>{tr('الدعم')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSub('settings')}>{tr('الإعدادات')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  {tr('تسجيل الخروج')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* المحتوى */}
      <main className="pb-24 lg:ms-64 lg:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {sub === 'reports' ? (
          <ReportsPage db={db} ws={ws} />
        ) : sub === 'settings' ? (
          <SettingsPage db={db} ws={ws} user={user} onSwitchWs={onSwitchWs} />
        ) : sub === 'subscription' ? (
          <SubscriptionPage db={db} user={user} />
        ) : sub === 'support' ? (
          <SupportPage db={db} user={user} />
        ) : sub === 'admin' ? (
          <AdminPage db={db} user={user} />
        ) : effPage === 'dashboard' ? (
          <Dashboard db={db} ws={ws} onNavigate={(p) => (p === 'reports' ? onSub('reports') : onNavigate(p as PageKey))} />
        ) : effPage === 'assets' ? (
          <AssetsPage db={db} ws={ws} />
        ) : effPage === 'debts' ? (
          <DebtsPage db={db} ws={ws} />
        ) : effPage === 'warehouse' ? (
          <WarehousePage db={db} ws={ws} whLimit={db.plans.find((p) => p.id === user.planId)?.warehouses ?? -1} />
        ) : (
          <InvoicesPage db={db} ws={ws} />
        )}
        </div>
      </main>

      <BottomNav page={effPage} warehouse={warehouseOn} invoices={invoicesOn} onNavigate={(p) => { onSub(null); onNavigate(p) }} />
      <QuickAddFab onAction={(a) => setQuick(a)} />

      {/* نوافذ الإضافة السريعة */}
      <AssetFormDialog open={quick === 'asset'} onClose={() => setQuick(null)} wsId={ws.id} />
      <EntryFormDialog open={quick === 'entry'} onClose={() => setQuick(null)} wsId={ws.id} />
      <InvoiceFormDialog open={quick === 'invoice'} onClose={() => setQuick(null)} wsId={ws.id} />
      <ItemFormDialog open={quick === 'item'} onClose={() => setQuick(null)} wsId={ws.id} />
      <CashboxFormDialog open={quick === 'cashbox'} onClose={() => setQuick(null)} wsId={ws.id} />
      <WorkspaceFormDialog open={addWs} onClose={() => setAddWs(false)} user={{ name: user.name, email: user.email }} onCreated={(id) => onSwitchWs(id)} />
    </div>
  )
}

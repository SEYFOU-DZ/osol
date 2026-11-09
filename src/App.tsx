import { useEffect, useState } from 'react'
import { useDB, useSession, userWorkspaces } from '@/lib/useDB'
import { seedWorkspace } from '@/lib/store'
import type { PageKey, SubPageKey } from '@/types/nav'
import { Landing, Auth, PlanPicker } from '@/pages/Gate'
import { AppShell } from '@/components/AppShell'
import { InvoiceDoc } from '@/components/Invoice'
import { Logo } from '@/components/Logo'
import { apiRequest, removeAuthToken } from '@/lib/api'

const pageKeys: PageKey[] = ['dashboard', 'assets', 'debts', 'warehouse', 'invoices']
const subKeys: SubPageKey[] = ['reports', 'settings', 'subscription', 'admin']

function parseHash(): { page: PageKey; sub: SubPageKey | null } {
  const h = window.location.hash.replace(/^#\/?/, '')
  if ((subKeys as string[]).includes(h)) return { page: 'dashboard', sub: h as SubPageKey }
  if ((pageKeys as string[]).includes(h)) return { page: h as PageKey, sub: null }
  return { page: 'dashboard', sub: null }
}

export default function App() {
  const [db, setDb] = useDB()
  const user = useSession(db)
  const [gate, setGate] = useState<'landing' | 'auth'>('landing')
  const [justRegistered, setJustRegistered] = useState(false)
  const [route, setRoute] = useState(parseHash)
  const [wsId, setWsId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // مزامنة البيانات الحية من الباك إند عند تحديد مساحة العمل
  useEffect(() => {
    if (!user || !wsId) return

    let isMounted = true
    const syncData = async () => {
      try {
        setSyncing(true)
        const [assets, debts, people, stock, invoices, wallets] = await Promise.all([
          apiRequest(`/workspaces/${wsId}/assets`).catch(() => []),
          apiRequest(`/workspaces/${wsId}/debts`).catch(() => []),
          apiRequest(`/workspaces/${wsId}/people`).catch(() => []),
          apiRequest(`/workspaces/${wsId}/stock`).catch(() => []),
          apiRequest(`/workspaces/${wsId}/invoices`).catch(() => []),
          apiRequest(`/workspaces/${wsId}/wallets`).catch(() => [])
        ])

        if (!isMounted) return

        setDb((d) => {
          if (Array.isArray(assets)) {
            d.assets = [...d.assets.filter((a) => a.wsId !== wsId), ...assets]
          }
          if (Array.isArray(debts)) {
            d.entries = [...d.entries.filter((e) => e.wsId !== wsId), ...debts]
          }
          if (Array.isArray(people)) {
            d.people = [...d.people.filter((p) => p.wsId !== wsId), ...people]
          }
          if (Array.isArray(stock)) {
            d.stock = [...d.stock.filter((s) => s.wsId !== wsId), ...stock]
          }
          if (Array.isArray(invoices)) {
            d.invoices = [...d.invoices.filter((i) => i.wsId !== wsId), ...invoices]
          }
          if (Array.isArray(wallets)) {
            d.wallets = [...d.wallets.filter((w) => w.wsId !== wsId), ...wallets]
          }
        })
      } catch (err) {
        console.warn('Backend sync failed, using offline store:', err)
      } finally {
        if (isMounted) setSyncing(false)
      }
    }

    syncData()
    return () => {
      isMounted = false
    }
  }, [user?.id, wsId, setDb])

  // مساحة افتراضية لأي مستخدم بلا مساحات
  useEffect(() => {
    if (!user) return
    const has = db.workspaces.some((w) => w.members.some((mm) => mm.email === user.email))
    if (!has) {
      setDb((d) => {
        d.workspaces.push(seedWorkspace('مساحتي الشخصية', 'personal', user.name, user.email))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // مسار الفاتورة العامة: #/invoice/<id>
  const m = window.location.hash.match(/^#\/invoice\/(\w+)/)
  if (m) {
    const inv = db.invoices.find((i) => i.id === m[1])
    const ws = inv ? db.workspaces.find((w) => w.id === inv.wsId) : null
    if (inv && ws) {
      return (
        <div dir="rtl" className="min-h-dvh bg-slate-200/60 py-8 print:bg-white print:py-0">
          <div className="mb-6 flex items-center justify-center gap-2 print:hidden">
            <Logo />
          </div>
          <div className="mx-auto max-w-3xl px-4">
            <InvoiceDoc inv={inv} ws={ws} />
          </div>
        </div>
      )
    }
  }

  // إذا لم يكن المستخدم مسجل دخول، تظهر صفحة الهبوط أو شاشة تسجيل الدخول
  if (!user) {
    return gate === 'landing' ? (
      <Landing onStart={() => setGate('auth')} />
    ) : (
      <Auth
        onDone={(registered) => {
          if (registered) setJustRegistered(true)
          else setGate('landing')
          window.location.hash = '/'
        }}
      />
    )
  }

  // بعد التسجيل الجديد
  if (justRegistered) {
    return <PlanPicker userName={user.name} onDone={() => setJustRegistered(false)} />
  }

  const workspaces = userWorkspaces(db, user.id)
  const wsScore = (w: (typeof workspaces)[number]) =>
    db.assets.filter((a) => a.wsId === w.id).length +
    db.entries.filter((e) => e.wsId === w.id).length +
    db.invoices.filter((i) => i.wsId === w.id).length +
    db.stock.filter((s) => s.wsId === w.id).length
  const ws =
    workspaces.find((w) => w.id === wsId) ??
    [...workspaces].sort((a, b) => wsScore(b) - wsScore(a))[0]
  if (!ws) return null

  // ضبط wsId تلقائياً إذا لم يكن معيّناً
  if (!wsId && ws.id) {
    setWsId(ws.id)
  }

  const navigate = (p: PageKey) => {
    window.location.hash = `/${p}`
    setRoute({ page: p, sub: null })
  }
  const goSub = (s: SubPageKey | null) => {
    window.location.hash = s ? `/${s}` : '/dashboard'
    setRoute({ page: s ? 'dashboard' : route.page, sub: s })
  }

  return (
    <div className="relative">
      {syncing && (
        <div className="fixed top-2 end-2 z-50 bg-[#101C32] text-[#D8B36A] text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-amber-400/30 font-bold flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          مزامنة مع السيرفر...
        </div>
      )}
      <AppShell
        db={db}
        user={user}
        ws={ws}
        page={route.page}
        sub={route.sub}
        onNavigate={navigate}
        onSub={goSub}
        onSwitchWs={(id) => setWsId(id)}
        onLogout={() => {
          removeAuthToken()
          window.location.hash = '/'
          setDb((d) => { d.sessionUserId = null })
        }}
      />
    </div>
  )
}

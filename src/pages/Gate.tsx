import { useState } from 'react'
import { tr, useLang, setLang } from '@/lib/i18n'
import { Logo, LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store, type DB } from '@/lib/store'
import { apiRequest, setAuthToken } from '@/lib/api'
import {
  Boxes, HandCoins, Package, FileText, Landmark,
  Menu, X, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const WHATSAPP = '966500000000'

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`
}

/* ================= الصفحة التعريفية (Landing) ================= */

export function Landing({ onStart }: { onStart: () => void }) {
  const [menu, setMenu] = useState(false)
  const lang = useLang()

  const navLinks = [
    ['#features', tr('المزايا')],
    ['#how', tr('كيف يعمل')],
    ['#pricing', tr('الأسعار')],
    ['#contact', tr('تواصل')],
  ]

  const features = [
    { icon: Boxes, title: tr('الأصول'), desc: tr('سجّل عقاراتك ومركباتك ورؤوس أموالك مع مصاريف الصيانة والتشغيل.') },
    { icon: HandCoins, title: tr('الديون والمستحقات'), desc: tr('إدارة دقيقة (له وعليه)، تتبع السداد الجزئي والكامل وسجلات المبالغ.') },
    { icon: Package, title: tr('المستودع والمخزون'), desc: tr('أصناف وكميات وتنبيهات النواقص مع ربط فوري بحركات المخزن.') },
    { icon: FileText, title: tr('الفواتير والـ PDF'), desc: tr('إنشاء فواتير احترافية وتصديرها بصيغة PDF قابلة للطباعة بنقرة واحدة.') },
    { icon: Landmark, title: tr('المحافظ والصناديق'), desc: tr('متابعة أرصدة الحسابات البنكية والنقدية في شاشة موحدة.') },
    { icon: BarChart3, title: tr('صافي الثروة'), desc: tr('معادلة دقيقة: أصولك + مستحقاتك − التزاماتك محسوبة لحظياً.') },
  ]

  const steps = [
    { t: tr('أنشئ حسابك'), d: tr('سجّل مجاناً بريدك الإلكتروني وابدأ إدارة مساحتك الشخصية فوراً.') },
    { t: tr('سجّل بياناتك'), d: tr('أضف أصولك، ديونك، وأصناف المستودع بكل سهولة ويسر من الهاتف أو الكمبيوتر.') },
    { t: tr('تابع صافي ثروتك'), d: tr('لوحة قيادة تفاعلية واضحة تعطيك صورة حقيقية عن وضعك المالي.') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="text-slate-600 transition-colors hover:text-slate-950">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button onClick={onStart} className="bg-[#101C32] hover:bg-[#1b2c4e] text-[#D8B36A] font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl shadow-sm">
              {tr('دخول / تسجيل')}
            </Button>
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button className="rounded-xl p-2 md:hidden hover:bg-slate-100" onClick={() => setMenu((m) => !m)}>
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden space-y-1">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{label}</a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-100 py-12 sm:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-amber-100 text-[#967425] border border-amber-300/50 px-3 py-1 text-xs font-bold mb-4">
            🚀 {tr('منصة إدارة الأصول والديون السحابية')}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-[#101C32] tracking-tight leading-tight">
            {tr('إدارة أذكى لثروتك وديونك')} <br />
            <span className="text-[#B08D3E]">{tr('لحياة مالية أسهل وأوضح')}</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto">
            {tr('نظام متكامل يجمع الأصول، كشوفات الديون، المستودع، والفواتير الضريبية مع حساب لحظي دقيق لصافي الثروة بدون تعقيدات.')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={onStart} className="bg-[#101C32] text-[#D8B36A] hover:bg-[#1a2d52] font-black px-6 py-6 text-base rounded-2xl shadow-md">
              {tr('ابدأ الآن مجاناً')}
            </Button>
            <Button variant="outline" onClick={() => window.open(waLink('مرحباً أرغب بالاستفسار عن أصول'), '_blank')} className="border-slate-300 font-bold px-6 py-6 text-base rounded-2xl hover:bg-white">
              {tr('تواصل معنا')}
            </Button>
          </div>
        </div>
      </section>

      {/* المزايا */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-[#101C32]">{tr('أنظمة شاملة ومترابطة')}</h2>
          <p className="mt-2 text-sm text-slate-500">{tr('كل ما تحتاجه لإدارة أعمالك ومالياتك الشخصية والتجارية')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#B08D3E] mb-4">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-[#101C32]">{f.title}</h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* خطوات العمل */}
      <section id="how" className="bg-[#101C32] py-14 px-4 sm:px-6 text-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-black mb-10">{tr('كيف تبدأ مع أصول؟')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
                <span className="w-8 h-8 rounded-full bg-[#D8B36A] text-[#101C32] font-black flex items-center justify-center absolute -top-4 start-4">
                  {idx + 1}
                </span>
                <h3 className="text-lg font-black mt-2 text-white">{s.t}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* التذييل */}
      <footer id="contact" className="border-t border-slate-200 bg-white py-10 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <Logo />
          <p className="mt-2 text-xs text-slate-500">{tr('© 2026 أصول OSOOL — جميع الحقوق محفوظة')}</p>
        </div>
      </footer>
    </div>
  )
}

/* ================= الدخول / التسجيل مع الباك إند الحقيقي ================= */

export function Auth({ onDone }: { onDone: (registered: boolean) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const lang = useLang()

  const submit = async () => {
    const em = email.trim().toLowerCase()
    if (!em || !password) {
      setErr(tr('يرجى إدخال البريد الإلكتروني وكلمة المرور'))
      return
    }

    if (mode === 'register' && !name.trim()) {
      setErr(tr('يرجى كتابة الاسم الكامل'))
      return
    }

    setErr('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), email: em, password })
        })

        if (res.token) {
          setAuthToken(res.token)
        }

        // تحديث حالة التطبيق المحلية بالبيانات المؤكدة من السيرفر
        store.set((db: DB) => {
          const userObj = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            password: '',
            createdAt: new Date().toISOString(),
            trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            planId: 'pro',
            prefs: res.user.prefs || {}
          }
          if (!db.users.some(u => u.id === userObj.id)) {
            db.users.push(userObj)
          }
          db.sessionUserId = userObj.id

          if (res.workspace) {
            const ws = {
              id: res.workspace.id,
              name: res.workspace.name,
              kind: res.workspace.kind || 'personal',
              members: res.workspace.members || [{ id: res.user.id, name: res.user.name, email: res.user.email, role: 'owner' as const }],
              createdAt: new Date().toISOString(),
              currency: 'ر.س',
              modules: { warehouse: true, invoices: true }
            }
            if (!db.workspaces.some(w => w.id === ws.id)) {
              db.workspaces.push(ws)
            }
          }
        })

        onDone(true)
      } else {
        // تسجيل الدخول
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: em, password })
        })

        if (res.token) {
          setAuthToken(res.token)
        }

        store.set((db: DB) => {
          const userObj = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            password: '',
            createdAt: new Date().toISOString(),
            trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
            planId: 'pro',
            prefs: res.user.prefs || {}
          }
          const existingUserIdx = db.users.findIndex(u => u.id === userObj.id || u.email === userObj.email)
          if (existingUserIdx !== -1) {
            db.users[existingUserIdx] = userObj
          } else {
            db.users.push(userObj)
          }
          db.sessionUserId = userObj.id

          if (Array.isArray(res.workspaces) && res.workspaces.length > 0) {
            res.workspaces.forEach((w: any) => {
              if (!db.workspaces.some(x => x.id === w.id)) {
                db.workspaces.push({
                  id: w.id,
                  name: w.name,
                  kind: w.kind || 'personal',
                  members: w.members || [{ id: res.user.id, name: res.user.name, email: res.user.email, role: 'owner' as const }],
                  createdAt: new Date().toISOString(),
                  currency: 'ر.س',
                  modules: { warehouse: true, invoices: true }
                })
              }
            })
          }
        })

        onDone(false)
      }
    } catch (e: any) {
      setErr(e.message || 'تعذر إتمام العملية، يرجى المحاولة لاحقاً')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={50} />
          <div className="mt-3 text-2xl font-black text-[#101C32]">
            {tr('أصول')} <span className="text-xs font-bold text-[#D8B36A]">OSOOL</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{tr('إدارة أذكى .. لحياة أسهل')}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          {/* التبديل بين الدخول والتسجيل */}
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setErr('') }}
              className={cn('rounded-xl py-2.5 transition-all', mode === 'login' ? 'bg-white text-[#101C32] shadow-sm' : 'text-slate-500 hover:text-slate-900')}
            >
              {tr('تسجيل الدخول')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErr('') }}
              className={cn('rounded-xl py-2.5 transition-all', mode === 'register' ? 'bg-white text-[#101C32] shadow-sm' : 'text-slate-500 hover:text-slate-900')}
            >
              {tr('حساب جديد')}
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">{tr('الاسم بالكامل')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr('مثال: أحمد عبد الله')}
                  className="rounded-xl h-11 border-slate-200 text-sm"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">{tr('البريد الإلكتروني')}</Label>
              <Input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="rounded-xl h-11 border-slate-200 text-sm text-left font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">{tr('كلمة المرور')}</Label>
              <Input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-11 border-slate-200 text-sm text-left font-mono"
                required
              />
            </div>

            {err && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#101C32] text-[#D8B36A] hover:bg-[#192b4d] font-bold text-sm shadow-md transition-all mt-2"
            >
              {loading ? tr('جارٍ التحقق...') : mode === 'register' ? tr('إنشاء حساب جديد') : tr('دخول إلى حسابي')}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {tr('← العودة للصفحة الرئيسية')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= اختيار الباقة (PlanPicker) ================= */

export function PlanPicker({ userName, onDone }: { userName: string; onDone: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md text-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <LogoMark size={52} />
        <h2 className="text-xl font-black text-[#101C32] mt-4">أهلاً بك يا {userName} 🎉</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          تم تفعيل نسختك وتجهيز مساحة العمل الخاصة بك على السيرفر بنجاح. يمكنك الآن البدء مباشرة في تسجيل أصولك وديونك.
        </p>
        <Button onClick={onDone} className="mt-6 w-full h-11 rounded-xl bg-[#101C32] text-[#D8B36A] hover:bg-[#1a2c4e] font-bold">
          الدخول إلى لوحة التحكم
        </Button>
      </div>
    </div>
  )
}

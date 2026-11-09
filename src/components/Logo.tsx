import { tr } from '@/lib/i18n'

const ASPECT = 1200 / 410 // عرض الشعار / ارتفاعه

/* شعار أصول OSOOL الرسمي — كلمة إنجليزية بخلفية شفافة */
export function LogoMark({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <img
      src={light ? '/osool-logo-light.png' : '/osool-logo.png'}
      alt="OSOOL"
      width={Math.round(size * ASPECT)}
      height={size}
      className="select-none object-contain"
      draggable={false}
    />
  )
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 26 : 34} light={light} />
      {!compact && (
        <div className="leading-tight">
          <div className={`text-lg font-black tracking-tight ${light ? 'text-white' : 'text-foreground'}`}>
            {tr('أصول')}
          </div>
          <div className={`text-[11px] font-semibold ${light ? 'text-sidebar-foreground' : 'text-muted-foreground'}`}>
            {tr('إدارة أذكى .. لحياة أسهل')}
          </div>
        </div>
      )}
    </div>
  )
}

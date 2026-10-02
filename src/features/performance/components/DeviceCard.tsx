import { motion } from 'framer-motion'
import { Laptop, Monitor } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatBytesCompact } from '@/lib/format'
import { usePerformanceStore } from '../usePerformanceStore'
import { batteryConditionLabel, formatMemory } from '../format'
import { Skeleton } from './primitives'
import { useTranslation } from 'react-i18next'

/** The "About This Mac"-style hero card. Shows only facts macOS reported. */
export function DeviceCard({ large = false }: { large?: boolean }) {
  const { t } = useTranslation()
  const info = usePerformanceStore((s) => s.systemInfo)
  const battery = usePerformanceStore((s) => s.battery)
  const disk = useAppStore((s) => s.diskSummary)
  const laptop = (info?.modelName ?? '').startsWith('MacBook')
  const Icon = laptop ? Laptop : Monitor

  const specs = [
    info?.chip,
    info?.memoryBytes ? t('performance.device.memory', { size: formatMemory(info.memoryBytes, 0) }) : null,
    disk && disk.totalBytes > 0 ? t('performance.device.storage', { size: formatBytesCompact(disk.totalBytes) }) : null,
    info?.os.version ? `${info.os.name} ${info.os.version}` : null,
  ].filter((s): s is string => !!s)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-full overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-[0_24px_60px_-24px_rgba(70,50,200,0.65)]"
      style={{
        background:
          'radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.22), transparent 55%), radial-gradient(80% 80% at 100% 100%, rgba(62,240,200,0.28), transparent 60%), linear-gradient(140deg, #4f6dff 0%, #6e5bff 50%, #9b4df5 100%)',
      }}
    >
      <div className="pointer-events-none absolute -top-10 -end-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25 backdrop-blur">
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.12em] text-white/70 uppercase">{t('performance.device.thisMac')}</p>
          {info ? (
            <>
              <h2 className={`font-display font-bold tracking-[-0.025em] ${large ? 'text-[26px]' : 'text-[22px]'} leading-tight`}>{info.modelName ?? 'Mac'}</h2>
              {info.marketingName && info.marketingName !== info.modelName && <p className="text-[13px] text-white/80">{info.marketingName}</p>}
            </>
          ) : (
            <Skeleton className="mt-1 h-7 w-44 !bg-white/20" />
          )}
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2">
        {specs.map((s) => (
          <span key={s} className="rounded-full bg-white/16 px-3 py-1 text-[12px] font-semibold ring-1 ring-white/20 backdrop-blur">
            {s}
          </span>
        ))}
        {battery && battery.condition && (
          <span className="rounded-full bg-white/16 px-3 py-1 text-[12px] font-semibold ring-1 ring-white/20 backdrop-blur">{t('performance.device.battery', { condition: batteryConditionLabel(battery.condition) })}</span>
        )}
      </div>
    </motion.div>
  )
}

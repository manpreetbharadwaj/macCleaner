import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ScanSearch } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { progressLabel } from '@/i18n/progress'

/** Shows children once a scan exists; otherwise a friendly prompt (or live progress) instead of an empty page. */
export type ScanGateArea = 'largeFiles' | 'downloads' | 'duplicates' | 'apps' | 'systemJunk' | 'storage' | 'smartClean'

export function ScanGate({ children, area }: { children: ReactNode; area: ScanGateArea }) {
  const { t } = useTranslation()
  const hasScanned = useAppStore((s) => s.hasScanned)
  const scanning = useAppStore((s) => s.scanning)
  const progress = useAppStore((s) => s.scanProgress)
  const runScan = useAppStore((s) => s.runScan)

  if (hasScanned) return <>{children}</>

  if (scanning) {
    return (
      <Card className="flex flex-col items-center py-16 text-center">
        <div className="relative mb-5 h-20 w-20">
          <div className="animate-pulse-ring absolute inset-0 rounded-full brand-gradient" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full brand-gradient text-white">
            <ScanSearch size={32} />
          </div>
        </div>
        <h3 className="font-display text-[18px] font-semibold text-ink">{t('scanGate.scanningTitle')}</h3>
        <motion.p key={progress?.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-[13px] text-ink-3">
          {progress ? progressLabel(progress) : t('scanGate.gettingStarted')}
        </motion.p>
      </Card>
    )
  }

  return (
    <Card>
      <EmptyState
        icon={ScanSearch}
        title={t(`scanGate.promptTitle.${area}`)}
        subtitle={t('scanGate.promptSubtitle')}
        action={
          <Button variant="primary" size="lg" onClick={() => runScan()}>
            {t('scanGate.scanButton')}
          </Button>
        }
      />
    </Card>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useUpdateStore } from '../useUpdateStore'

const DOWNLOAD_PAGE = 'https://macbookcleaner.com/download'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Settings' "Check for Updates" row. Never installs anything without an
 * explicit click on the confirm dialog, and never restarts the app
 * without a second explicit click afterward — see useUpdateStore.ts and
 * src-tauri/src/update.rs for why each of those is a separate step.
 */
export function UpdateButton() {
  const { t } = useTranslation()
  const checkStatus = useUpdateStore((s) => s.checkStatus)
  const installStatus = useUpdateStore((s) => s.installStatus)
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates)

  const checking = checkStatus === 'checking'
  const downloading = installStatus === 'downloading'

  return (
    <Button variant="secondary" disabled={checking || downloading} onClick={() => void checkForUpdates()}>
      <RefreshCw size={14} className={checking ? 'animate-spin' : undefined} /> {t('settings.checkUpdates')}
    </Button>
  )
}

export function UpdateStatusArea() {
  const { t } = useTranslation()
  const { checkStatus, available, checkError, installStatus, downloadedBytes, totalBytes, installError, downloadAndInstall, restartApp, reset } = useUpdateStore()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      {checkStatus === 'upToDate' && <p className="mt-2 text-[12px] text-ink-3">{t('update.upToDate')}</p>}
      {checkStatus === 'error' && <p className="mt-2 text-[12px] text-danger">{t('update.checkFailed', { error: checkError })}</p>}

      {checkStatus === 'available' && available && installStatus === 'idle' && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <p className="text-[13px] font-semibold text-ink">{t('update.availableTitle', { version: available.version })}</p>
          <p className="text-[12px] text-ink-3">{t('update.currentVersion', { version: available.currentVersion })}</p>
          {available.notes && <p className="mt-2 whitespace-pre-line text-[12px] text-ink-2">{available.notes}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              <Download size={13} /> {t('update.installNow')}
            </Button>
            <a href={DOWNLOAD_PAGE} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                {t('update.downloadManually')}
              </Button>
            </a>
          </div>
        </div>
      )}

      {installStatus === 'downloading' && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <p className="text-[12.5px] font-semibold text-ink">{t('update.downloading')}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full brand-gradient transition-all"
              style={{ width: totalBytes ? `${Math.min(100, (downloadedBytes / totalBytes) * 100)}%` : '35%' }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-3 tabular">{totalBytes ? `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}` : formatBytes(downloadedBytes)}</p>
        </div>
      )}

      {installStatus === 'readyToRestart' && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <p className="flex-1 text-[12.5px] text-ink">{t('update.readyToRestart')}</p>
          <Button size="sm" onClick={() => void restartApp()}>
            {t('update.restartNow')}
          </Button>
        </div>
      )}

      {installStatus === 'error' && (
        <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <p className="text-[12.5px] text-danger">{t('update.installFailed', { error: installError })}</p>
          <p className="mt-1 text-[12px] text-ink-3">{t('update.installFailedFallback')}</p>
          <div className="mt-2 flex gap-2">
            <a href={DOWNLOAD_PAGE} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                {t('update.downloadManually')}
              </Button>
            </a>
            <Button size="sm" variant="ghost" onClick={() => reset()}>
              {t('common.dismiss')}
            </Button>
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} width={440}>
        <div className="p-7">
          <h2 className="font-display text-[19px] font-bold text-ink">{t('update.confirmTitle')}</h2>
          <p className="mt-2 text-[13px] text-ink-2">{t('update.confirmBody', { version: available?.version ?? '' })}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                void downloadAndInstall()
              }}
            >
              {t('update.installNow')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

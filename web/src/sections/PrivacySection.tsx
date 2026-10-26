import { Link } from 'react-router'
import { Bell, CloudOff, FileLock2, FolderOpen, HardDrive, MousePointerClick, UserX, Wand2 } from 'lucide-react'
import { Reveal } from '@/components/Reveal'

const POINTS = [
  { icon: HardDrive, title: 'Scanned on your Mac', body: 'Every scan and every cleanup runs locally. There’s no cloud service involved.' },
  { icon: CloudOff, title: 'Nothing is uploaded', body: 'No analytics, telemetry or crash reporting. Your files, running apps, battery and Mac details never leave your Mac.' },
  { icon: UserX, title: 'No account needed to try it', body: 'No sign-up, no email, no credit card — download it and your free trial starts. Buying a lifetime license later only needs the key from your purchase, never a new account.' },
  { icon: FileLock2, title: 'Contents stay unread', body: 'The app looks at sizes and dates. File contents are only read to confirm two files are exact duplicates.' },
]

const PERMISSIONS = [
  { icon: FolderOpen, title: 'Downloads, Desktop & Documents', body: 'macOS asks before the app can look in these folders, so it can find large files and old downloads.' },
  { icon: Wand2, title: 'Control Finder', body: 'Asked the first time you clean. The app asks Finder to move items to the Trash, so “Put Back” works.' },
  { icon: HardDrive, title: 'Full Disk Access — optional', body: 'Lets the app measure locations macOS keeps private, like some caches and the Trash. It works without it.' },
  { icon: Bell, title: 'Notifications — optional', body: 'Only for scheduled-cleanup reminders and summaries.' },
]

export function PrivacySection({ showPermissions = true }: { showPermissions?: boolean }) {
  return (
    <section className="privacy-band" aria-labelledby="privacy-title">
      <div className="container">
        <Reveal className="section-heading is-light">
          <p className="eyebrow">Privacy first</p>
          <h2 id="privacy-title" className="display-2">
            Your files stay on your Mac.
          </h2>
          <p className="lead">A cleaner needs deep access to your disk. That’s exactly why MacBook Cleaner is built to need your trust as little as possible.</p>
        </Reveal>
        <div className="privacy-grid">
          {POINTS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} className="glass-card" delay={i * 70}>
                <span className="glass-card__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            )
          })}
        </div>

        {showPermissions && (
          <Reveal className="perm-panel" delay={60}>
            <div className="perm-panel__head">
              <MousePointerClick size={18} aria-hidden="true" />
              <h3>What macOS may ask you to allow — and why</h3>
            </div>
            <ul>
              {PERMISSIONS.map((p) => {
                const Icon = p.icon
                return (
                  <li key={p.title}>
                    <Icon size={18} aria-hidden="true" />
                    <div>
                      <b>{p.title}</b>
                      <p>{p.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="perm-panel__foot">
              You can review or revoke any of these in System Settings → Privacy &amp; Security. <Link to="/privacy">Read the Privacy Policy →</Link>
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}

import type { CSSProperties } from 'react'
import { Ban, EyeOff, FolderLock, Hand, ListChecks, ShieldCheck, Undo2 } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const LEVELS = [
  { tone: 'safe', label: 'Safe', title: 'Rebuilds itself', body: 'Caches and logs your apps re-create on their own. Preselected for you.', example: 'Xcode DerivedData', size: '18.6 GB' },
  { tone: 'review', label: 'Review', title: 'Worth a look first', body: 'Things that may hold state you care about. Never preselected.', example: 'Simulator Devices', size: '6.2 GB' },
  { tone: 'protected', label: 'Protected', title: 'Can’t be selected', body: 'Anything that looks like a backup, keychain or key — refused by the app’s native safety layer.', example: 'MobileSync Backup', size: 'Locked' },
] as const

const PRINCIPLES = [
  { icon: ListChecks, title: 'Review before anything is removed', body: 'Every cleanup shows exactly what will be moved and asks you to confirm.' },
  { icon: Undo2, title: 'Trash first, always', body: 'Items go to the Trash — never permanently deleted. The app never empties your Trash.' },
  { icon: Hand, title: 'Your files are your call', body: 'Downloads, Desktop, Documents and Movies are never preselected and always need an extra confirmation.' },
  { icon: FolderLock, title: 'Guardrails that can’t be bypassed', body: 'A native check refuses system folders, your home folder, its main folders and anything outside your home folder.' },
  { icon: EyeOff, title: '“Never suggest this again”', body: 'Exclude any file or folder and it won’t be suggested again — manually or on a schedule.' },
  { icon: Ban, title: 'No surprise automation', body: 'Automatic cleaning is off by default, needs explicit consent, and only touches six developer caches.' },
]

export function SafeCleaning() {
  return (
    <section className="section" aria-labelledby="safe-title">
      <div className="container">
        <SectionHeading
          eyebrow="Safe by design"
          id="safe-title"
          title={
            <>
              You stay in control. <span className="grad-text">Always.</span>
            </>
          }
          intro="Cleaning tools need deep access to your disk. MacBook Cleaner is built so that a mistake is hard to make — and easy to undo."
        />

        <div className="levels">
          {LEVELS.map((l, i) => (
            <Reveal key={l.tone} className={`level level--${l.tone}`} delay={i * 80}>
              <span className={`safety-pill safety-pill--${l.tone}`}>
                <ShieldCheck size={13} aria-hidden="true" /> {l.label}
              </span>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
              <div className="level__row" aria-hidden="true">
                <span className="level__check" />
                <span className="level__name">{l.example}</span>
                <span className="level__size">{l.size}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="principles">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} className="principle" delay={(i % 3) * 70} style={{ '--c': '#5b6cff' } as CSSProperties}>
                <span className="principle__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

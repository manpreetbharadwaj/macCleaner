import type { CSSProperties } from 'react'
import { HardDrive, ListChecks, ScanSearch, Trash2 } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

const STEPS = [
  { icon: ScanSearch, color: '#5b6cff', title: 'Scan your Mac', body: 'One click checks caches, logs, developer tools, apps, Downloads and your largest files — all on your Mac.' },
  { icon: ListChecks, color: '#8b5cf6', title: 'Review recommendations', body: 'Items are labeled Safe or Review, with a plain explanation of what each one is. Untick anything you want to keep.' },
  { icon: Trash2, color: '#19c39a', title: 'Move to Trash', body: 'Confirm, and the items you approved go to the Trash. Your own files always need an extra confirmation.' },
  { icon: HardDrive, color: '#13b5e0', title: 'Reclaim storage', body: 'Changed your mind? Put anything back from the Trash. When you’re sure, empty it to get the space back.' },
]

export function HowItWorks() {
  return (
    <section className="section section--tint" aria-labelledby="how-title">
      <div className="container">
        <SectionHeading eyebrow="How it works" id="how-title" title="Four steps. You’re in charge of every one." />
        <ol className="steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal as="li" key={s.title} className="step" delay={i * 90} style={{ '--c': s.color } as CSSProperties}>
                <span className="step__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="icon-tile icon-tile--lg" aria-hidden="true">
                  <Icon size={26} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

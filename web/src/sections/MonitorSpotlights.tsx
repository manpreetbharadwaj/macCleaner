import type { CSSProperties } from 'react'
import { Check, Zap } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

/** Illustrative values only — labeled as such on the page. */
const APPS = [
  { name: 'Chrome', ram: '1.8 GB', cpu: 14, color: '#ff8a4c', time: '3h 24m' },
  { name: 'VS Code', ram: '860 MB', cpu: 7, color: '#13b5e0', time: '1h 18m' },
  { name: 'Slack', ram: '610 MB', cpu: 2.4, color: '#f0508a', time: '6h 6m' },
  { name: 'Spotify', ram: '420 MB', cpu: 1, color: '#19c39a', time: '5h 12m' },
]

export function RunningAppsSpotlight() {
  return (
    <section className="section" aria-labelledby="apps-spot-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Running Apps"
            id="apps-spot-title"
            title={
              <>
                See which apps are using <span className="grad-text">the most memory and CPU.</span>
              </>
            }
            intro="Running Apps lists what’s open on your Mac with its memory, CPU and how long it’s been running. Helper processes count toward their app, so a browser with dozens of tabs shows one honest total."
          />
          <Reveal as="ul" className="checks" delay={80}>
            <li>
              <Check size={18} aria-hidden="true" /> Sort by memory, CPU, running time or name
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Apps by default — background and system processes only if you ask
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Memory uses the same measure as Activity Monitor
            </li>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="mock-card" role="img" aria-label="Illustration of a running apps list: Chrome 1.8 GB and 14% CPU, VS Code 860 MB and 7%, Slack 610 MB and 2.4%, Spotify 420 MB and 1%. Example values.">
            <div className="mock-card__head" aria-hidden="true">
              <span>App</span>
              <span>CPU</span>
              <span>Memory</span>
              <span>Running</span>
            </div>
            {APPS.map((a, i) => (
              <div key={a.name} className="app-row" style={{ '--c': a.color, '--i': i } as CSSProperties} aria-hidden="true">
                <span className="app-row__name">
                  <span className="app-row__icon">{a.name[0]}</span>
                  {a.name}
                </span>
                <span className="app-row__cpu">
                  <i style={{ width: `${(a.cpu / 14) * 100}%` }} />
                  <b>{a.cpu}%</b>
                </span>
                <span className="app-row__ram">{a.ram}</span>
                <span className="app-row__time">{a.time}</span>
              </div>
            ))}
            <p className="mock-card__note">Example values for illustration — not benchmarks.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function BatterySpotlight() {
  return (
    <section className="section section--tint" aria-labelledby="battery-title">
      <div className="container split split--reverse">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Battery Health"
            id="battery-title"
            title="Understand your battery."
            intro="On MacBooks, see exactly what macOS knows about your battery — no guesswork, no invented scores."
          />
          <Reveal as="ul" className="checks" delay={80}>
            <li>
              <Check size={18} aria-hidden="true" /> Battery percentage and charging state
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Cycle count — the number of full charge cycles completed
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Maximum capacity compared with when it was new
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Battery condition, as shown in System Settings
            </li>
          </Reveal>
          <Reveal as="p" className="fine-print" delay={120}>
            MacBook Cleaner reports battery information; it can’t repair or improve a battery’s physical health. Desktop Macs simply don’t show this section.
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="battery-card" role="img" aria-label="Illustration of a MacBook battery at 87% with 264 cycles, 91% maximum capacity and condition Normal. Example values.">
            <div className="battery-visual" aria-hidden="true">
              <div className="battery-visual__body">
                <div className="battery-visual__fill" />
                <Zap size={30} className="battery-visual__bolt" />
              </div>
              <div className="battery-visual__cap" />
            </div>
            <p className="battery-card__pct" aria-hidden="true">87%</p>
            <dl className="battery-card__stats" aria-hidden="true">
              <div>
                <dt>Cycle count</dt>
                <dd>264</dd>
              </div>
              <div>
                <dt>Maximum capacity</dt>
                <dd>91%</dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd className="is-good">Normal</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>Battery</dd>
              </div>
            </dl>
            <p className="mock-card__note">Example values for illustration.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const SPECS = [
  ['Mac model', 'MacBook Pro (14-inch)'],
  ['Chip', 'Apple M2 Pro'],
  ['Memory', '16 GB'],
  ['Storage', '512 GB'],
  ['macOS', 'Tahoe 26.5 · Up to date'],
  ['Uptime', '2 days 7 hours'],
]

export function MacInfoSpotlight() {
  return (
    <section className="section" aria-labelledby="macinfo-title">
      <div className="container split">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Mac Info"
            id="macinfo-title"
            title={
              <>
                Everything important <span className="grad-text">about your Mac.</span>
              </>
            }
            intro="Model, chip, memory, storage, displays, macOS version and uptime — in one dashboard instead of five different places. MacBook Cleaner also shows whether macOS’s own update check found an update, with a shortcut to Software Update."
          />
          <Reveal as="p" className="fine-print" delay={80}>
            Read locally from macOS and never uploaded. Your serial number isn’t read at all.
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="spec-card" role="img" aria-label="Illustration of a Mac information card: MacBook Pro 14-inch, Apple M2 Pro, 16 GB memory, 512 GB storage, macOS Tahoe 26.5 up to date, uptime 2 days 7 hours. Example values.">
            <div className="spec-card__hero" aria-hidden="true">
              <p>This Mac</p>
              <h3>MacBook Pro</h3>
            </div>
            <dl aria-hidden="true">
              {SPECS.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mock-card__note">Example values for illustration.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

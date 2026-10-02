import { Link } from 'react-router'
import { APP, SITE } from '@/config/site'
import { LegalLayout, type LegalSection } from '@/components/LegalLayout'

/*
 * Every statement about the desktop app below was checked against the
 * source (src-tauri/src/*, src/services/*). If the app gains analytics,
 * crash reporting, an updater, accounts or any network feature, this page
 * MUST be updated before that version ships.
 */

const appSupport = `~/Library/Application Support/${APP.bundleId}`
const appLogs = `~/Library/Logs/${APP.bundleId}`

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          This policy is published by {SITE.companyName} (“we”, “us”), {SITE.companyAddress}, the developer of {SITE.name}. It covers two separate things, which handle information very differently:
        </p>
        <ul>
          <li>
            <b>The {SITE.name} desktop app</b> for macOS (the “App”) — see the sections starting “The App”.
          </li>
          <li>
            <b>This website</b>, {SITE.url.replace(/^https?:\/\//, '')} (the “Website”), including downloads of the App — see the sections starting “The Website”.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'app-local',
    title: 'The App: information processed on your Mac',
    body: (
      <>
        <p>To show what is using your storage and help you clean it, the App reads the following on your Mac. All of this processing happens locally, on your device.</p>
        <h3>File and folder information</h3>
        <p>
          Names, locations (paths), sizes and dates of files and folders in your Downloads, Desktop, Documents and Movies folders; in <code>~/Library/Caches</code> and <code>~/Library/Logs</code>; in known developer-tool locations (for example Xcode DerivedData,
          simulator data and npm, Yarn, pnpm, Gradle and CocoaPods caches); and the overall size of folders such as Pictures and Library to build the storage breakdown. The App also reads your disk’s total, used and available capacity.
        </p>
        <h3>File contents — only for duplicates</h3>
        <p>
          The App does not read the contents of your documents, photos or other files, with one exception: to confirm that two files are exact duplicates, it reads files that already have an identical size and computes a SHA-256 checksum of their contents. The
          checksum is calculated in memory on your Mac and is used only for that comparison.
        </p>
        <h3>Installed applications</h3>
        <p>
          For App Cleanup, the App reads each application’s name, version, bundle identifier and icon from the app’s own <code>Info.plist</code>, measures its size, asks macOS Spotlight for the date the app was last opened, and measures related caches, logs,
          preferences and support files in your Library.
        </p>
        <h3>Web browsers</h3>
        <p>
          For Safari, Chrome, Edge and Firefox, the App measures only the size of each browser’s <b>cache</b> folders. It does not read your browsing history, cookies, passwords, bookmarks, autofill data or extensions.
        </p>
      </>
    ),
  },
  {
    id: 'app-stored',
    title: 'The App: information stored on your Mac',
    body: (
      <>
        <p>The App saves a small amount of information locally so it can remember your preferences. None of it is sent to us.</p>
        <ul>
          <li>
            <b>App state</b> in <code>{appSupport}/state.json</code>: your settings, scan exclusions (file paths you chose to exclude), scheduled-cleanup settings, a history of cleanups (dates, amounts and the items involved) and summaries of scheduled scans.
          </li>
          <li>
            <b>Diagnostic logs</b> in <code>{appLogs}</code>, including a <code>startup-crash.log</code> that records errors if the App fails to start. Logs record things like the App version, your Mac’s processor type and macOS version, where the App is
            installed, and what scans and cleanups did — which can include file paths.
          </li>
          <li>
            <b>Background helpers</b>: if you turn on Scheduled Cleanup or Launch at Login, the App adds a small configuration file to <code>~/Library/LaunchAgents</code> so macOS can start it at the right time. Turning the feature off removes it.
          </li>
        </ul>
        <p>
          You can clear the App’s settings, exclusions, schedule and history at any time with <b>Settings → Reset all data</b>, or delete the folders above after uninstalling.
        </p>
      </>
    ),
  },
  {
    id: 'app-network',
    title: 'The App: no data leaves your Mac',
    body: (
      <>
        <p>The App does not send information about you, your Mac or your files to us or to anyone else. Specifically, the App:</p>
        <ul>
          <li>contains no analytics, usage tracking or telemetry;</li>
          <li>contains no crash-reporting service — crash information is written only to the local log described above;</li>
          <li>has no user accounts, sign-in, or license activation;</li>
          <li>contains no advertising and no third-party SDKs that collect data;</li>
          <li>does not check for its own updates automatically and does not download anything.</li>
        </ul>
        <p>
          The only time the App involves the internet is when you click a link inside it (such as “Check for Updates”, “Privacy Policy” or “Terms”). That opens a page of this Website in your default web browser, and the Website sections below then apply. The App only opens links to this Website’s own domain.
        </p>
        <p>
          Separately from the App, macOS itself may collect diagnostic information if you have enabled sharing analytics with Apple in System Settings. That is governed by Apple’s privacy policy; we do not receive it.
        </p>
      </>
    ),
  },
  {
    id: 'app-cleaning',
    title: 'The App: how your files are handled when you clean',
    body: (
      <>
        <p>
          Items you approve are moved to the macOS Trash — the App asks Finder to do this so that “Put Back” keeps working. The App never permanently deletes files and never empties your Trash. If you enable “Clean automatically” in Scheduled Cleanup, the App moves
          only a fixed list of developer caches to the Trash, under the limits described in the App and on our <Link to="/faq#automatic">FAQ</Link>.
        </p>
        <p>Files stay on your Mac at every step. We never receive copies of them.</p>
      </>
    ),
  },
  {
    id: 'app-permissions',
    title: 'The App: macOS permissions',
    body: (
      <>
        <p>macOS may ask you to grant the App the following. You can review or revoke each one in System Settings → Privacy &amp; Security.</p>
        <ul>
          <li>
            <b>Access to Downloads, Desktop and Documents</b> — to find large files, old downloads and duplicates.
          </li>
          <li>
            <b>Automation (control Finder)</b> — to move the items you approve to the Trash.
          </li>
          <li>
            <b>Full Disk Access (optional)</b> — to measure locations macOS keeps private, such as some app caches and the Trash. The App works without it.
          </li>
          <li>
            <b>Notifications (optional)</b> — for scheduled-cleanup reminders and summaries. Notifications are created locally by macOS; no push service is involved.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'app-device',
    title: 'The App: device information',
    body: <p>The App reads basic information about your Mac — macOS version, processor architecture and disk capacity — to work correctly and to write useful local logs. This information stays on your Mac.</p>,
  },
  {
    id: 'system-monitoring',
    title: 'The App: system monitoring data',
    body: (
      <>
        <p>The App’s Performance tab shows how your Mac is doing. To do that, it reads the following from macOS on your device:</p>
        <ul>
          <li>CPU usage (total, user, system and idle) and memory usage (used, available, compressed, cached, swap and memory pressure);</li>
          <li>the apps and processes currently running — their names, process IDs, CPU and memory use, launch times, thread counts and file locations;</li>
          <li>storage capacity and free space;</li>
          <li>on MacBooks, battery information: charge, charging state, power source, cycle count, capacities and the battery condition macOS reports;</li>
          <li>Mac hardware information: model and model identifier, chip, CPU and GPU cores, memory size, displays and the Mac’s network hostname;</li>
          <li>macOS version, build and kernel version, uptime, and the result of macOS’s own Software Update check, read from a file macOS keeps on your Mac.</li>
        </ul>
        <p>
          This information is used only to display the Performance dashboard. It is processed locally, kept in memory only while the App is open (short-term graphs cover the last 60 seconds and are discarded when you quit), and is not written to disk, uploaded, shared, sold or used for analytics. The App does not read
          your Mac’s serial number, and it does not contact Apple’s servers to check for updates.
        </p>
        <p>Monitoring runs only while the Performance screen is open and pauses when the App’s window is hidden.</p>
      </>
    ),
  },
  {
    id: 'app-sharing-logs',
    title: 'The App: when you choose to share information with us',
    body: (
      <p>
        If you contact support, you might choose to send us screenshots or the App’s log files. Logs can contain file paths from your Mac, so please review them before sending. We use anything you send only to help with your request.
      </p>
    ),
  },
  {
    id: 'website',
    title: 'The Website: what we collect',
    body: (
      <>
        <p>
          The Website is a static site. It does not use cookies, analytics, advertising, tracking pixels, social-media widgets, or third-party scripts or fonts, and it has no user accounts or forms. Your browser may store a cached copy of the pages, as it does for any
          site.
        </p>
        <p>
          <b>Hosting logs.</b> The Website is served by {SITE.hostingProvider}. Like any web host, it automatically processes technical information needed to deliver pages and protect the service — such as your IP address, browser user agent, the page requested,
          the referring page and the time of the request. This is handled under the hosting provider’s own terms and privacy policy, and we do not combine it with any other information.
        </p>
        <p>
          <b>Downloads.</b> The App’s installer file is served from {SITE.downloadHost}, which processes the same kind of technical request information when you download it.
        </p>
        <p>
          <b>Email.</b> If you email us (for example via the Support page), we receive your email address, name if you include it, and whatever you write or attach. We use it only to respond to you and to improve the App based on your feedback.
        </p>
      </>
    ),
  },
  {
    id: 'website-cookies',
    title: 'The Website: cookies',
    body: <p>The Website does not set cookies or use similar technologies such as local storage for tracking. If that ever changes, we will update this policy first and, where required, ask for your consent.</p>,
  },
  {
    id: 'third-parties',
    title: 'Third-party services and sharing',
    body: (
      <>
        <p>We do not sell, rent or trade personal information, and we do not share it for advertising. The only third parties involved are:</p>
        <ul>
          <li>our Website host and download host, which process request information as described above; and</li>
          <li>our email provider, which stores support emails you send us.</li>
        </ul>
        <p>We may also disclose information if required by law, or to protect our rights or the safety of others.</p>
      </>
    ),
  },
  {
    id: 'legal-bases',
    title: 'Legal bases for processing',
    body: (
      <p>
        Where laws such as the EU or UK GDPR apply, we rely on our legitimate interests to operate and secure the Website and to respond to messages, and on steps you ask us to take when you contact us. The App’s local processing on your Mac is under your control and
        does not involve us receiving personal data.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: (
      <ul>
        <li>
          <b>App data</b> stays on your Mac until you remove it (Settings → Reset all data, or deleting the folders listed under “The App: information stored on your Mac”). The App automatically limits how much history and log data it keeps.
        </li>
        <li>
          <b>Hosting and download logs</b> are retained according to the hosting providers’ policies.
        </li>
        <li>
          <b>Support emails</b> are kept as long as needed to help you and for a reasonable period afterwards, then deleted, unless we must keep them for legal reasons.
        </li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Because the App processes your files locally and doesn’t transmit them, the main protection for that data is the security of your Mac itself. The App includes safeguards against removing system locations and sensitive-looking files, and only moves items to
        the Trash. The Website is served over HTTPS. No method of storage or transmission is completely secure, but we work to protect any information we hold.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <p>
        Depending on where you live, you may have rights to access, correct, delete, restrict or object to the processing of your personal information, and to data portability. Because we hold very little — typically only emails you have sent us — the simplest way
        to exercise these rights is to email <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>. You also have the right to complain to your local data-protection authority.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children’s privacy',
    body: <p>The App and Website are not directed to children under 13 (or the equivalent minimum age where you live), and we do not knowingly collect personal information from children. If you believe a child has sent us personal information, contact us and we will delete it.</p>,
  },
  {
    id: 'international',
    title: 'International users',
    body: <p>The App works the same way everywhere: your data stays on your Mac. Information processed by our hosting and email providers may be handled in countries other than your own, under the safeguards those providers offer.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>We will update this policy if the App or Website changes how information is handled — for example, before releasing any App version that adds a network feature. The “Last updated” date at the top shows when it was last revised. Significant changes will be noted in the release notes.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about privacy? Email <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> or write to {SITE.companyName}, {SITE.companyAddress}.
      </p>
    ),
  },
]

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <div className="summary-box">
          <p>
            <b>The short version.</b> {SITE.name} scans and cleans on your Mac. The App has no analytics, telemetry, crash reporting or accounts, and it doesn’t send information about you, your files or your Mac’s performance anywhere. This Website uses no cookies or analytics; our web host
            processes standard request logs.
          </p>
        </div>
      }
      sections={sections}
    />
  )
}

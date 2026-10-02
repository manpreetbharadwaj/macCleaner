import { Link } from 'react-router'
import { APP, SITE } from '@/config/site'
import { LegalLayout, type LegalSection } from '@/components/LegalLayout'

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of these terms',
    body: (
      <p>
        These Terms of Service (“Terms”) are an agreement between you and {SITE.companyName} (“we”, “us”) covering the {SITE.name} app for macOS (the “Software”) and this website (the “Website”). By downloading, installing or using the Software, or using the
        Website, you agree to these Terms. If you don’t agree, don’t use them. If you use the Software on behalf of an organization, you confirm you are authorized to accept these Terms for it.
      </p>
    ),
  },
  {
    id: 'license',
    title: 'License to use the Software',
    body: (
      <p>
        Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable license to download, install and use the Software on Macs that you own or control, for your personal or internal business purposes. The Software is licensed, not
        sold. We reserve all rights not expressly granted.
      </p>
    ),
  },
  {
    id: 'restrictions',
    title: 'License restrictions',
    body: (
      <>
        <p>Except where applicable law expressly allows it, you may not:</p>
        <ul>
          <li>copy, modify, translate or create derivative works of the Software;</li>
          <li>reverse engineer, decompile or disassemble the Software;</li>
          <li>sell, rent, lease, sublicense, redistribute or publish the Software, or offer it for download from anywhere other than this Website;</li>
          <li>remove or alter any copyright, trademark or other notices;</li>
          <li>use the Software in violation of any law, or to access or remove data you are not authorized to manage.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'price',
    title: 'Price',
    body: (
      <p>
        Version {APP.version} of the Software is provided without charge and without in-app purchases or subscriptions. If we introduce paid features or versions in the future, we will describe them clearly beforehand, and you will never be charged without agreeing
        to it.
      </p>
    ),
  },
  {
    id: 'your-responsibility',
    title: 'Your responsibility for what you remove',
    body: (
      <>
        <p>
          The Software helps you identify files and suggests what may be safe to remove, but <b>you decide what is removed</b>. Labels such as “Safe” and “Review” are recommendations based on file type and location, not guarantees about the value of a file to you.
          Please review items before cleaning — particularly your own files and anything marked for review.
        </p>
        <p>
          The Software moves items you approve to the macOS Trash, from where they can normally be restored until the Trash is emptied. Emptying the Trash permanently removes them; that is your action, outside the Software. If you enable automatic cleaning in
          Scheduled Cleanup, you authorize the Software to move the eligible developer caches described in the Software to the Trash without asking each time.
        </p>
        <p>
          Removing caches or app data may require other apps to rebuild or re-download that data, may sign you out of some apps, or may change their behavior. Uninstalling an app together with its support files removes that app’s locally stored data.
        </p>
      </>
    ),
  },
  {
    id: 'backups',
    title: 'Backups',
    body: <p>You are responsible for keeping regular, up-to-date backups of your data (for example with Time Machine) before using the Software. We strongly recommend having a current backup before any cleanup.</p>,
  },
  {
    id: 'no-guarantee',
    title: 'No guarantee of results',
    body: (
      <p>
        The amount of storage the Software finds or helps you recover depends entirely on your Mac and how you use it. Figures shown in the Software are estimates, and figures on this Website are illustrative examples. Space used by items in the Trash is only freed
        when the Trash is emptied, and apps may re-create caches over time. We do not promise any particular amount of recovered storage or any improvement in your Mac’s speed or performance. Performance, battery and system information shown in the Software is reported by macOS and provided for information only; it is not a diagnosis, and the Software does not repair hardware or batteries.
      </p>
    ),
  },
  {
    id: 'updates',
    title: 'Updates and changes to the Software',
    body: (
      <p>
        We may release updates that add, change or remove features, and we may stop offering the Software at any time. The Software does not update itself; new versions are offered on this Website. These Terms apply to updates unless they come with different terms.
      </p>
    ),
  },
  {
    id: 'early-release',
    title: 'Early release',
    body: (
      <p>
        {SITE.name} is a new product. Although it has been built with extensive safeguards, it may contain bugs or behave unexpectedly on some configurations.
        {!APP.notarized && ' The current version is not notarized by Apple, so macOS will show a warning the first time you open it; installation steps are on the Download page.'} Please{' '}
        <Link to="/support">report problems</Link> so we can fix them.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <p>
        Our <Link to="/privacy">Privacy Policy</Link> explains how the Software and Website handle information. In short, the Software processes your files locally on your Mac and does not send information about them to us.
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: (
      <p>
        The Software and Website, including their code, design, text, graphics and the {SITE.name} name and logo, are owned by {SITE.companyName} or its licensors and are protected by intellectual-property laws. These Terms don’t grant you any right to use our names or
        logos.
      </p>
    ),
  },
  {
    id: 'apple',
    title: 'Apple trademarks',
    body: (
      <p>
        {SITE.name} is an independent application and is not affiliated with, endorsed by or sponsored by Apple Inc. Apple, Mac, MacBook, macOS, Finder, Safari, Xcode and Time Machine are trademarks of Apple Inc., registered in the U.S. and other countries. Other
        product names are trademarks of their respective owners.
      </p>
    ),
  },
  {
    id: 'feedback',
    title: 'Feedback',
    body: <p>If you send us suggestions or feedback, you allow us to use them to improve our products without obligation to you.</p>,
  },
  {
    id: 'warranty',
    title: 'Disclaimer of warranties',
    body: (
      <p className="caps">
        To the maximum extent permitted by law, the Software and Website are provided “as is” and “as available”, without warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose,
        title and non-infringement. We do not warrant that the Software will be error-free or uninterrupted, that it will identify every removable file, or that every item it suggests is safe for you to remove.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p className="caps">
          To the maximum extent permitted by law, {SITE.companyName} will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data, files, profits, revenue or goodwill, arising out of or related to your use of (or
          inability to use) the Software or Website — including the removal of files you selected or authorized — even if we have been advised of the possibility of such damages.
        </p>
        <p className="caps">
          To the extent permitted by law, our total liability for any claim relating to the Software or Website is limited to the greater of the amount you paid us for the Software in the twelve months before the claim, or USD 50 [placeholder — confirm amount and
          currency].
        </p>
        <p>Some jurisdictions do not allow certain warranty exclusions or liability limits, so some of the above may not apply to you. Nothing in these Terms limits liability that cannot be limited by law, or your statutory rights as a consumer.</p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    body: <p>You can stop using the Software at any time by uninstalling it. Your license ends automatically if you materially breach these Terms. On termination you must stop using and delete the Software. Sections that by their nature should survive termination will survive.</p>,
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of {SITE.jurisdiction}, without regard to conflict-of-law rules. The courts of {SITE.jurisdiction} have jurisdiction over any dispute, except where your local consumer-protection law gives you the right to bring proceedings
        where you live.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: <p>We may update these Terms from time to time. The “Last updated” date at the top shows the latest revision; material changes will also be noted in the release notes. Continuing to use the Software or Website after changes take effect means you accept the updated Terms.</p>,
  },
  {
    id: 'general',
    title: 'General',
    body: <p>These Terms, together with the Privacy Policy, are the entire agreement between you and us about the Software and Website. If any provision is found unenforceable, the rest remain in effect. Our failure to enforce a provision is not a waiver of it.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these Terms? Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or write to {SITE.companyName}, {SITE.companyAddress}.
      </p>
    ),
  },
]

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro={
        <div className="summary-box">
          <p>
            <b>The short version.</b> You can use {SITE.name} on Macs you own or control. You decide what gets removed, so please review items and keep backups. We can’t guarantee how much space you’ll recover. The Software is provided as is.
          </p>
          <p className="summary-box__note">This summary is for convenience only; the full terms below apply.</p>
        </div>
      }
      sections={sections}
    />
  )
}

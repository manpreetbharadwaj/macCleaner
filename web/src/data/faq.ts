import { APP, SITE, architectureLabel } from '@/config/site'

export interface FaqItem {
  id: string
  question: string
  /** Paragraphs of plain text (also used verbatim in FAQPage structured data). */
  answer: string[]
  link?: { label: string; to: string }
}

export interface FaqGroup {
  title: string
  items: FaqItem[]
}

const intel = APP.architectures.includes('intel')

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'The basics',
    items: [
      {
        id: 'what-is-it',
        question: 'What is MacBook Cleaner?',
        answer: [
          'MacBook Cleaner is a macOS app that shows you what’s using your storage and helps you remove what you don’t need: caches, logs, app leftovers, developer build caches, old downloads, large files and exact duplicates.',
          'It also includes a Performance dashboard: live CPU and memory usage, the apps using the most resources, battery health on MacBooks, and key information about your Mac and macOS.',
          'You review everything before it’s removed, and removed items go to the Trash rather than being deleted permanently.',
        ],
      },
      {
        id: 'what-files',
        question: 'What files can it clean?',
        answer: [
          'App and system caches and logs in your user Library; Safari, Chrome, Edge and Firefox caches; caches left behind by apps you’ve uninstalled; developer caches (Xcode DerivedData, Archives, Device Support, Simulator data, npm, Yarn, pnpm, Gradle, CocoaPods, Android emulator images); and — only when you pick them — large files, old downloads and duplicate files in Downloads, Desktop, Documents and Movies.',
          'It can also uninstall apps from your Applications folder together with their leftover data.',
        ],
      },
      {
        id: 'free',
        question: 'Is MacBook Cleaner free?',
        answer: [
          `Version ${APP.version} has no account, subscription, in-app purchase or license key. Any future pricing would be announced on this website before it applies.`,
        ],
      },
      {
        id: 'faster',
        question: 'Will cleaning files make my Mac faster?',
        answer: [
          'MacBook Cleaner frees disk space and shows you what your Mac is doing. Its Performance tab shows which apps use the most CPU and memory, so you can decide what to quit — but it doesn’t “boost” RAM, tweak startup items or change system settings, and we don’t promise speed improvements.',
          'That said, macOS needs free space for updates, virtual memory and caches, so a nearly full disk can cause problems that freeing space helps avoid.',
        ],
      },
    ],
  },
  {
    title: 'Safety & privacy',
    items: [
      {
        id: 'safe',
        question: 'Is MacBook Cleaner safe?',
        answer: [
          'It was designed around not losing your data. Nothing is permanently deleted — approved items are moved to the Trash, and the app never empties it. Your own files (Downloads, Desktop, Documents, Movies) are never preselected and always need confirmation.',
          'A native safety check runs on every removal, whatever the interface asked for: system locations, your home folder and its main folders are refused, and paths that look like backups, keychains, passwords or keys are protected.',
          'As with any tool that removes files, keep a backup (for example with Time Machine) and review before you clean.',
        ],
      },
      {
        id: 'review',
        question: 'Can I review files before deleting them?',
        answer: [
          'Yes — that’s the core of how the app works. Every item shows its size, location, why it exists and what happens if you remove it. You can untick anything, preview files with Quick Look, reveal them in Finder, or add them to a “never suggest” exclusion list.',
        ],
      },
      {
        id: 'recover',
        question: 'Can deleted files be recovered?',
        answer: [
          'Yes, until you empty the Trash. MacBook Cleaner moves items to the Trash instead of deleting them, so you can open the Trash in Finder and choose Put Back.',
          'Note that items in the Trash still use disk space — your free space increases once you empty the Trash yourself.',
        ],
      },
      {
        id: 'upload',
        question: 'Does it upload my files?',
        answer: [
          'No. Scanning and cleaning happen entirely on your Mac. The app contains no analytics, telemetry, crash reporting or account system, and doesn’t send information about your files anywhere.',
          'The only time it touches the internet is when you click a link (like “Check for Updates” or “Privacy Policy”), which opens this website in your browser.',
        ],
        link: { label: 'Read the Privacy Policy', to: '/privacy' },
      },
      {
        id: 'permissions',
        question: 'What permissions does it need?',
        answer: [
          'macOS may ask you to allow access to your Downloads, Desktop and Documents folders so the app can find large files and old downloads. When you first clean, macOS asks whether MacBook Cleaner may control Finder — the app asks Finder to move items to the Trash so they can be put back.',
          'Full Disk Access is optional. It lets the app measure locations macOS keeps private, such as some app caches and the Trash. Without it the app still works and simply shows less. Notifications are only used for scheduled-cleanup reminders and summaries.',
        ],
      },
    ],
  },
  {
    title: 'Compatibility & installation',
    items: [
      {
        id: 'apple-silicon',
        question: 'Does it work on Apple silicon Macs?',
        answer: [`Yes. The current build runs natively on Macs with Apple silicon (M-series chips).`],
      },
      {
        id: 'intel',
        question: 'Does it support Intel Macs?',
        answer: intel
          ? ['Yes. The download is a universal app that runs natively on both Intel and Apple silicon Macs.']
          : [
              'Not yet. The currently published build is for Apple silicon Macs only. An Intel-compatible build hasn’t been released — this page will be updated if that changes.',
            ],
      },
      {
        id: 'macos-versions',
        question: 'Which macOS versions are supported?',
        answer: [`${APP.minMacOSName} (${APP.minMacOS}) or later, on ${architectureLabel()} Macs.`],
      },
      ...(APP.notarized
        ? []
        : [
            {
              id: 'security-warning',
              question: 'Why does macOS show a security warning?',
              answer: [
                'MacBook Cleaner isn’t yet notarized by Apple, so the first time you open it macOS’s Gatekeeper says it can’t verify the developer. This is expected for apps distributed outside the Mac App Store without Apple notarization — it doesn’t mean anything harmful was found.',
                'Only download the app from this website. Then open it once via System Settings → Privacy & Security → Open Anyway. The Download page walks through it step by step.',
              ],
              link: { label: 'How to open the app', to: '/download#open-anyway' },
            },
          ]),
      {
        id: 'uninstall',
        question: 'How do I uninstall MacBook Cleaner?',
        answer: [
          'If you turned on Scheduled Cleanup or Launch at Login, switch them off in the app first so their background helpers are removed. Then quit the app and drag MacBook Cleaner from Applications to the Trash.',
          `To remove its settings and logs as well, delete ~/Library/Application Support/${APP.bundleId} and ~/Library/Logs/${APP.bundleId}. If you skipped the first step, also delete any ${APP.bundleId}.*.plist files in ~/Library/LaunchAgents.`,
        ],
      },
    ],
  },
  {
    title: 'Performance monitoring',
    items: [
      {
        id: 'cpu',
        question: 'Does MacBook Cleaner monitor CPU usage?',
        answer: [
          'Yes. The Performance tab shows live CPU usage with a 60-second graph, split into user, system and idle time, and the CPU use of each running app. Values are shown as a share of your Mac’s total processing power.',
        ],
      },
      {
        id: 'ram-apps',
        question: 'Can I see which apps are using the most RAM?',
        answer: [
          'Yes. Running Apps lists your open apps with their memory, CPU and running time, and can be sorted by any of them. Memory is the physical footprint — the same measure Activity Monitor uses — and includes each app’s helper processes.',
          'macOS doesn’t let regular apps read the CPU or memory of processes owned by other users (such as some system services), so those show a dash instead of a number.',
        ],
      },
      {
        id: 'cycle-count',
        question: 'Can I check my MacBook battery cycle count?',
        answer: [
          'Yes. On MacBooks, the Battery section shows the cycle count, maximum capacity, charge, power source and battery condition as reported by macOS. When the battery reports the cycle count it was designed for, that’s shown too. Desktop Macs don’t have a battery, so the section is hidden.',
        ],
      },
      {
        id: 'upload-apps',
        question: 'Does the app upload my running application data?',
        answer: [
          'No. Running apps, process details, CPU, memory, battery and Mac information are read locally from macOS, shown on screen and kept only in memory while the app is open. None of it is uploaded, stored on disk or used for analytics.',
        ],
        link: { label: 'Read the Privacy Policy', to: '/privacy' },
      },
      {
        id: 'mac-model',
        question: 'Can I see my Mac model and RAM?',
        answer: ['Yes. Mac Info shows your model, chip, CPU and GPU cores, memory, storage, displays, macOS version and build, and uptime. Your serial number is never read.'],
      },
      {
        id: 'macos-update',
        question: 'Can it tell me if macOS needs an update?',
        answer: [
          'It shows the result of macOS’s own automatic Software Update check — for example “Up to date” or the name of an available update — along with when macOS last checked. MacBook Cleaner never contacts Apple itself and never installs updates; the Open Software Update button takes you to System Settings.',
          'If macOS hasn’t recorded a check, the status is shown as unknown rather than guessed.',
        ],
      },
      {
        id: 'monitoring-overhead',
        question: 'Does performance monitoring slow down my Mac?',
        answer: [
          'Monitoring only runs while the Performance screen is open, slows down when the window isn’t focused, and stops completely when the window is hidden or you switch to another screen. Static details like your Mac’s model are read once per session.',
          'In our measurements on an Apple M1 MacBook Pro, the monitoring work averaged about half a percent of a single CPU core while the screen was open.',
        ],
      },
    ],
  },
  {
    title: 'Scanning & automation',
    items: [
      {
        id: 'how-often',
        question: 'How often should I scan my Mac?',
        answer: [
          'There’s no right answer — it depends on how you use your Mac. Many people find a weekly check is plenty. Developers who build often may want to scan more frequently, since build caches grow quickly.',
          'Scheduled Cleanup can remind you automatically, only when there’s enough to clean or free space is running low.',
        ],
      },
      {
        id: 'automatic',
        question: 'Does the app run automatically?',
        answer: [
          'Only if you turn it on. Scheduled Cleanup is off by default. When enabled, it runs a background check daily, weekly or monthly at the time you choose.',
          'In “Remind me” mode it only sends a notification. In “Clean automatically” mode — which requires a separate, explicit confirmation — it moves a fixed list of six developer caches (Xcode DerivedData, npm, Yarn, pnpm, Gradle, CocoaPods) to the Trash, and only when there’s at least 1 GB, up to 10 GB and 50 items per run. Your personal files are never touched automatically.',
          'Launch at Login is also optional and off by default.',
        ],
      },
    ],
  },
]

export const ALL_FAQS: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items)

/** A short selection for the home page. */
export const HOME_FAQ_IDS = ['safe', 'upload', 'upload-apps', 'recover', 'faster', 'cycle-count', 'monitoring-overhead', 'security-warning']

export const SUPPORT_EMAIL = SITE.supportEmail

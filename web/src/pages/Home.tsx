import { BeforeAfter } from '@/sections/BeforeAfter'
import { CoreFeatures } from '@/sections/CoreFeatures'
import { FaqPreview } from '@/sections/FaqPreview'
import { FinalCta } from '@/sections/FinalCta'
import { Hero } from '@/sections/Hero'
import { BatterySpotlight, MacInfoSpotlight, RunningAppsSpotlight } from '@/sections/MonitorSpotlights'
import { PerformanceMonitor } from '@/sections/PerformanceMonitor'
import { HowItWorks } from '@/sections/HowItWorks'
import { PrivacySection } from '@/sections/PrivacySection'
import { SafeCleaning } from '@/sections/SafeCleaning'
import { ScanDemo } from '@/sections/ScanDemo'
import { ScreenGallery } from '@/sections/ScreenGallery'
import { StorageSection } from '@/sections/StorageSection'

export function HomePage() {
  return (
    <>
      <Hero />
      <ScanDemo />
      <CoreFeatures />
      <PerformanceMonitor />
      <RunningAppsSpotlight />
      <BatterySpotlight />
      <MacInfoSpotlight />
      <HowItWorks />
      <StorageSection />
      <SafeCleaning />
      <BeforeAfter />
      <PrivacySection />
      <ScreenGallery />
      <FaqPreview />
      <FinalCta />
    </>
  )
}

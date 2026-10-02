import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { ChangelogPage } from '@/pages/Changelog'
import { DownloadPage } from '@/pages/Download'
import { FAQPage } from '@/pages/FAQ'
import { FeaturesPage } from '@/pages/Features'
import { HomePage } from '@/pages/Home'
import { NotFoundPage } from '@/pages/NotFound'
import { PrivacyPage } from '@/pages/Privacy'
import { SupportPage } from '@/pages/Support'
import { TermsPage } from '@/pages/Terms'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="faq" element={<FAQPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

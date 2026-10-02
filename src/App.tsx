import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/routes/Dashboard'
import { SmartClean } from '@/routes/SmartClean'
import { Storage } from '@/routes/Storage'
import { LargeFiles } from '@/routes/LargeFiles'
import { Downloads } from '@/routes/Downloads'
import { Duplicates } from '@/routes/Duplicates'
import { AppCleanup } from '@/routes/AppCleanup'
import { SystemJunk } from '@/routes/SystemJunk'
import { Schedule } from '@/routes/Schedule'
import { SettingsPage } from '@/routes/Settings'

// Loaded on first visit so the monitoring code isn't part of startup.
const PerformancePage = lazy(() => import('@/features/performance/PerformancePage').then((m) => ({ default: m.PerformancePage })))

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/smart-clean" element={<SmartClean />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/large-files" element={<LargeFiles />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/duplicates" element={<Duplicates />} />
          <Route path="/apps" element={<AppCleanup />} />
          <Route path="/system-junk" element={<SystemJunk />} />
          <Route
            path="/performance"
            element={
              <Suspense fallback={null}>
                <PerformancePage />
              </Suspense>
            }
          />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

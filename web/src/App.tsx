import { useRoutes } from 'react-router'
import { routeConfig } from './routes'

export function AppRoutes() {
  return useRoutes(routeConfig)
}

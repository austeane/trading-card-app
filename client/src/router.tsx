import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import App from './App'
import Admin from './Admin'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: Admin,
})

const routeTree = rootRoute.addChildren([indexRoute, adminRoute])

// Support subpath deployments (e.g., /trading-cards on austinwallace.ca)
const basePath = import.meta.env.VITE_BASE_PATH || ''

export const router = createRouter({ routeTree, basepath: basePath })

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import * as Sentry from '@sentry/react'
import { router } from './router'
import './index.css'

const sentryDsn =
  import.meta.env.VITE_SENTRY_DSN ??
  'https://09af4582dc49164ae5df63813e981ebb@o4510562999664640.ingest.us.sentry.io/4510563001040896'

Sentry.init({
  dsn: sentryDsn,
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.cloudfront\.net/,
    /^https:\/\/.*\.lambda-url\.us-east-1\.on\.aws/,
  ],
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  environment: import.meta.env.MODE,
})

const queryClient = new QueryClient()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)

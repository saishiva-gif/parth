import { next } from '@vercel/functions'

// Runs on every request (no matcher = whole site, including /api/*).
// Simple shared-password gate — not real auth, just a login prompt in front
// of usage/billing data until something more robust is worth building.
export default function middleware(request: Request) {
  const password = process.env.SITE_PASSWORD

  if (!password) {
    return new Response('SITE_PASSWORD is not configured on this deployment.', { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    const decoded = atob(auth.slice('Basic '.length))
    const providedPassword = decoded.slice(decoded.indexOf(':') + 1)
    if (providedPassword === password) {
      return next()
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Parth Usage & MOU Tracker"' },
  })
}

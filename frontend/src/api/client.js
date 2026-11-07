import axios from 'axios'
import { REFRESH_KEY } from '../signup/session'

/*
 * The site's one HTTP client for the Django backend in /backend. Anything that
 * talks to it goes through `api`, so the base URL, the tokens, the throttle
 * and error handling are dealt with in one place.
 *
 * `VITE_API_URL` is the backend's origin — `http://localhost:8000` with
 * `python manage.py runserver`, the Render URL in production. Every path
 * below starts with /api/. The backend must list this site's origin in its
 * CORS_ALLOWED_ORIGINS. See .env.example.
 *
 * Auth is SimpleJWT: a short-lived access token (10 min) sent as
 * `Authorization: Bearer …`, and a refresh token (7 days) that is rotated on
 * every use and blacklisted on log-out. The access token lives only in memory;
 * the refresh token is kept in localStorage so a reload stays signed in. When
 * a request is refused because the access token has expired, the client
 * refreshes once and retries it; if that fails, the session is over.
 */

export const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || ''

const AUTH_PATHS = ['/api/auth/login/', '/api/auth/register/', '/api/auth/refresh/', '/api/auth/logout/']

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

/* ------------------------------------------------------------------ tokens */

let accessToken = null

function readRefresh() {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function writeRefresh(token) {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* Without storage the session lasts until the tab closes. */
  }
}

export function setTokens({ access, refresh }) {
  if (access) accessToken = access
  if (refresh) writeRefresh(refresh)
}

export function clearTokens() {
  accessToken = null
  writeRefresh(null)
}

export function hasSession() {
  return Boolean(accessToken || readRefresh())
}

export function getRefreshToken() {
  return readRefresh()
}

/*
 * One refresh at a time. Refresh tokens rotate and the old one is blacklisted,
 * so two refreshes racing with the same token would log the second one out —
 * which is exactly what React's StrictMode double-mount would otherwise do.
 */
let refreshing = null

export function refreshAccess() {
  if (!refreshing) {
    const refresh = readRefresh()
    refreshing = (
      refresh
        ? api.post('/api/auth/refresh/', { refresh }).then(({ data }) => {
            setTokens(data)
            return data.access
          })
        : Promise.reject(new Error('No refresh token'))
    )
      .catch((error) => {
        /* Only a refusal ends the session; a network blip shouldn't log anyone out. */
        if (error?.response?.status === 401 || !readRefresh()) clearTokens()
        throw error
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

const isAuthPath = (url = '') => AUTH_PATHS.some((path) => url.endsWith(path))

api.interceptors.request.use(async (config) => {
  if (isAuthPath(config.url)) return config
  /* After a reload there is a refresh token but no access token yet: get one
     first, rather than spending a request (and a throttle slot) on a 401. */
  if (!accessToken && readRefresh()) {
    try {
      await refreshAccess()
    } catch {
      /* Carry on unauthenticated; the server's 401 is handled below. */
    }
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

/* ---------------------------------------------------------------- retries */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const MAX_THROTTLE_RETRIES = 3

api.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error
  if (!config || !response) throw error

  /*
   * The backend's ThrottleMiddleware allows two requests a second per client
   * and says how long to wait. Logging in is two requests back to back, so
   * this is routine rather than exceptional: wait as told and go again.
   */
  if (response.status === 429 && (config._throttleRetries ?? 0) < MAX_THROTTLE_RETRIES) {
    config._throttleRetries = (config._throttleRetries ?? 0) + 1
    const seconds = Number(response.data?.detail?.wait_seconds) || 1
    await wait(Math.min(seconds, 5) * 1000)
    return api.request(config)
  }

  /* An expired access token: refresh once and try again. */
  if (response.status === 401 && !config._retried && !isAuthPath(config.url) && readRefresh()) {
    config._retried = true
    try {
      accessToken = null
      await refreshAccess()
    } catch {
      throw error
    }
    return api.request(config)
  }

  throw error
})

/* ------------------------------------------------------------------ errors */

/**
 * Turns whatever went wrong into `{ status, message, field }`.
 *
 * Django REST Framework answers in a few shapes, and all of them land here:
 *   { "detail": "..." }                    most refusals, and SimpleJWT
 *   { "detail": { "message": "..." } }     the throttle middleware
 *   { "email": ["..."], ... }              serializer validation, per field
 *   { "non_field_errors": ["..."] }        validation not tied to a field
 * `field` is the backend's field name; the caller maps it to its own inputs.
 */
export function describeError(error) {
  if (axios.isCancel(error)) return { status: 0, message: 'Cancelled.', cancelled: true }

  const response = error?.response
  if (!response) {
    const timedOut = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'
    return {
      status: 0,
      message: timedOut
        ? 'The server took too long to answer. Try again in a moment.'
        : "Can't reach the server. Check your connection and try again.",
    }
  }

  const { status, data } = response
  let message = null
  let field

  const first = (value) => (Array.isArray(value) ? value[0] : value)
  if (typeof data?.detail === 'string') message = data.detail
  else if (typeof data?.detail?.message === 'string') message = data.detail.message
  else if (typeof data?.message === 'string') message = data.message
  else if (data && typeof data === 'object') {
    const key = Object.keys(data).find((k) => typeof first(data[k]) === 'string')
    if (key) {
      message = first(data[key])
      if (key !== 'non_field_errors') field = key
    }
  }

  if (!message) {
    if (status === 401) message = 'Your session has expired. Log in again.'
    else if (status === 403) message = "You don't have permission to do that."
    else if (status === 404) message = "That isn't available right now."
    else if (status === 429) message = 'Too many attempts. Wait a moment and try again.'
    else if (status >= 500) message = 'Something went wrong on our end. Try again in a moment.'
    else message = 'Something went wrong. Try again.'
  }

  return { status, message, field }
}

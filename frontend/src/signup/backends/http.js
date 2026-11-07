/*
 * The real backend: the Django app in /backend, over axios. `accounts.js`
 * uses this as soon as `VITE_API_URL` is set. Tokens, refresh and throttle
 * retries are handled in src/api/client.js; this file only knows the routes
 * and translates between the backend's shapes and the page's.
 *
 * ---------------------------------------------------------------- the routes
 *
 *   POST /api/auth/register/   { email, password, password_confirm, grade }
 *                              → 201 { access, refresh, user }
 *   POST /api/auth/login/      { username: email, password } → { access, refresh }
 *   POST /api/auth/refresh/    { refresh } → { access, refresh }   (client.js)
 *   POST /api/auth/logout/     { refresh }                         blacklists it
 *   GET  /api/auth/me/         → user
 *   PUT  /api/entry_form/mine/        { ...answers } → entry form   save draft
 *   POST /api/entry_form/mine/submit/ { ...answers } → entry form   submit
 *
 * The backend's user:
 *   { id, username, email, grade, date_joined, entry_form: null | {
 *       first_name, last_name, school, answer, dietary_restrictions,
 *       other_needs, status, updated_at, submitted_at } }
 *
 * Validation errors come back per field ({ "email": ["…"] }); FIELD_NAMES
 * puts each under the matching input on the page.
 * --------------------------------------------------------------------------
 */

import { api, clearTokens, describeError, getRefreshToken, hasSession, setTokens } from '../../api/client'
import {
  AccountError,
  cleanFields,
  toUser,
  validateLogIn,
  validateSignUp,
  validateSubmission,
} from '../model'

/** The backend's EntryForm.status → the page's status keys (model.js STATUS). */
const STATUSES = {
  Draft: 'draft',
  Unreviewed: 'submitted',
  Accepted: 'accepted',
  Waitlist: 'waitlisted',
  Denied: 'declined',
}

/** The page's application fields ↔ the backend's. */
const TO_API = {
  firstName: 'first_name',
  lastName: 'last_name',
  school: 'school',
  answer: 'answer',
  dietary: 'dietary_restrictions',
  needs: 'other_needs',
}

/** Backend field name → the page's input, for putting an error in the right place. */
const FIELD_NAMES = {
  username: 'email',
  email: 'email',
  password: 'password',
  password_confirm: 'confirm',
  grade: 'grade',
  ...Object.fromEntries(Object.entries(TO_API).map(([page, backend]) => [backend, page])),
}

function toApiFields(fields) {
  const clean = cleanFields(fields)
  return Object.fromEntries(Object.entries(TO_API).map(([page, backend]) => [backend, clean[page]]))
}

function fromApiForm(form) {
  if (!form) {
    return { status: 'not_started', fields: {}, updatedAt: null, submittedAt: null }
  }
  return {
    status: STATUSES[form.status] ?? 'not_started',
    fields: Object.fromEntries(Object.entries(TO_API).map(([page, backend]) => [page, form[backend] ?? ''])),
    updatedAt: form.updated_at ?? null,
    submittedAt: form.submitted_at ?? null,
  }
}

/* The last profile the server sent, so an application save — which answers
   with just the form — can still hand the page a whole user. */
let profile = null

function fromApiUser(raw) {
  profile = raw
  return toUser({
    email: raw.email,
    grade: raw.grade,
    createdAt: raw.date_joined,
    application: fromApiForm(raw.entry_form),
  })
}

function toAccountError(error) {
  if (error instanceof AccountError) return error
  const { status, message, field } = describeError(error)
  return new AccountError(message, FIELD_NAMES[field], status === 401 ? 'unauthorized' : undefined)
}

async function fetchMe() {
  const { data } = await api.get('/api/auth/me/')
  return fromApiUser(data)
}

export async function signUp(values) {
  const body = validateSignUp(values)
  try {
    const { data } = await api.post('/api/auth/register/', {
      email: body.email,
      password: body.password,
      password_confirm: values.confirm,
      grade: Number(body.grade),
    })
    setTokens(data)
    return data.user ? fromApiUser(data.user) : await fetchMe()
  } catch (error) {
    const failure = toAccountError(error)
    failure.code = undefined
    throw failure
  }
}

export async function logIn(values) {
  const { email, password } = validateLogIn(values)
  try {
    const { data } = await api.post('/api/auth/login/', { username: email, password })
    setTokens(data)
    return await fetchMe()
  } catch (error) {
    const failure = toAccountError(error)
    /* SimpleJWT's "No active account found…" is accurate but unfriendly, and a
       wrong password must not read as an expired session. */
    if (error?.response?.status === 401) {
      failure.message = 'That email and password don’t match an account.'
      failure.field = undefined
    }
    failure.code = undefined
    throw failure
  }
}

export async function logOut() {
  const refresh = getRefreshToken()
  clearTokens()
  profile = null
  if (!refresh) return
  try {
    await api.post('/api/auth/logout/', { refresh })
  } catch {
    /* The tokens are already gone from this browser; that's what matters. */
  }
}

/** The signed-in user, or null when there is no session. Never throws. */
export async function restoreSession() {
  if (!hasSession()) return null
  try {
    return await fetchMe()
  } catch {
    return null
  }
}

async function writeApplication(method, url, fields) {
  try {
    const { data: form } = await api.request({ method, url, data: toApiFields(fields) })
    if (!profile) return await fetchMe()
    return fromApiUser({ ...profile, entry_form: form })
  } catch (error) {
    throw toAccountError(error)
  }
}

/* The email argument is how the local backend knows who is asking; here the
   token says that, so it is not sent. */

export async function saveApplication(_email, fields) {
  return writeApplication('put', '/api/entry_form/mine/', fields)
}

export async function submitApplication(_email, fields) {
  return writeApplication('post', '/api/entry_form/mine/submit/', validateSubmission(fields))
}

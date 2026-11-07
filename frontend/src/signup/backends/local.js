/*
 * The stand-in backend: every account kept in the reader's own browser.
 *
 * ⚠ For building and trying the flow only. An account made on one device
 * does not exist on another, clearing site data deletes it, nobody at Neodev
 * can see an application, and nothing can mark one accepted. Passwords are
 * salted and hashed before they are stored, but a password kept client-side
 * is never secure. `accounts.js` uses this only while `VITE_API_URL` is unset.
 */

import {
  AccountError,
  EDITABLE,
  EMPTY_APPLICATION,
  normaliseEmail,
  toUser,
  validateLogIn,
  validateSignUp,
  validateSubmission,
  cleanFields,
} from '../model'

const ACCOUNTS_KEY = 'neodev.accounts.v1'
const SESSION_KEY = 'neodev.session.v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) ?? {}
  } catch {
    return {}
  }
}

function save(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    throw new AccountError(
      "This browser won't let the page save anything. Check that cookies and site data are allowed.",
    )
  }
}

function setSession(email) {
  try {
    if (email) localStorage.setItem(SESSION_KEY, email)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* A session that does not survive a reload is an inconvenience, not an error. */
  }
}

async function hash(password, salt) {
  /* crypto.subtle only exists in a secure context; localhost and https both are. */
  if (!globalThis.crypto?.subtle) return `plain:${salt}:${password}`
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function newSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signUp(values) {
  const { email, password, grade } = validateSignUp(values)
  const accounts = load()
  if (accounts[email])
    throw new AccountError('An account with that email already exists. Log in instead.', 'email')

  const salt = newSalt()
  accounts[email] = {
    email,
    salt,
    passwordHash: await hash(password, salt),
    grade,
    createdAt: new Date().toISOString(),
    application: {
      status: 'not_started',
      fields: { ...EMPTY_APPLICATION },
      updatedAt: null,
      submittedAt: null,
    },
  }
  save(accounts)
  setSession(email)
  return toUser(accounts[email])
}

export async function logIn(values) {
  const { email, password } = validateLogIn(values)
  const record = load()[email]
  /* One message for both cases, so the form does not confirm which emails exist. */
  const wrong = new AccountError('That email and password don’t match an account.')
  if (!record) throw wrong
  if ((await hash(password, record.salt)) !== record.passwordHash) throw wrong
  setSession(email)
  return toUser(record)
}

export async function logOut() {
  setSession(null)
}

export async function restoreSession() {
  let email = null
  try {
    email = localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
  return email ? toUser(load()[email]) : null
}

function update(email, change) {
  const accounts = load()
  const record = accounts[normaliseEmail(email)]
  if (!record) throw new AccountError('Your session has expired. Log in again.', undefined, 'unauthorized')
  if (!EDITABLE.includes(record.application.status))
    throw new AccountError('This application has already been submitted.')
  change(record.application)
  record.application.updatedAt = new Date().toISOString()
  save(accounts)
  return toUser(record)
}

export async function saveApplication(email, fields) {
  return update(email, (app) => {
    app.fields = cleanFields(fields)
    app.status = 'draft'
  })
}

export async function submitApplication(email, fields) {
  const tidy = validateSubmission(fields)
  return update(email, (app) => {
    app.fields = tidy
    app.status = 'submitted'
    app.submittedAt = new Date().toISOString()
  })
}

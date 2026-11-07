import { useEffect, useId, useRef, useState } from 'react'
import SunBackdrop from './SunBackdrop'
import CursorMascot from './CursorMascot'
import {
  AccountError,
  EDITABLE,
  EMPTY_APPLICATION,
  STATUS,
  gradeLabel,
  logIn,
  logOut,
  restoreSession,
  saveApplication,
  signUp,
  submitApplication,
} from '../signup/accounts'
import { OPEN_PARAM } from '../signup/session'
import './Signup.css'

/*
 * The sign-up page: an old computer on a desk. Logged out, its screen is the
 * log-on prompt — log in, or make an account. Logged in, it is a desktop with
 * two programs on it: Application (the form) and Status (where it stands).
 *
 * Like the sponsor page this is an ordinary document — no wave, no virtual
 * scroll axis — so it scrolls with the browser's own scrollbar. Everything to
 * do with accounts goes through `signup/accounts.js`; read the warning at the
 * top of it before relying on any of this.
 *
 * It carries no masthead: the machine is the whole page, and the one way off
 * it is the Back to home page link at the foot, as on the sponsor page.
 */

/** Shown once per tab, and never under reduced motion. */
const BOOT_KEY = 'neodev.booted'
const BOOT_MS = 1700

const BOOT_LINES = [
  'NEO-BIOS v26.12  (c) Neo Developers League',
  'Memory test ........ 640K OK',
  'Detecting drives ... A: C: NEO:',
  'Loading NEO-OS ......',
  'Starting applicant terminal',
]

/*
 * `?open=application` — the View Application links on the title screen and
 * masthead (see `signup/session.js`) — asks for the desktop to come up on the
 * form rather than on Status. Read once, then dropped from the address bar with
 * `replaceState`, so a reload or a bookmark is just the sign-up page.
 */
function takeInitialApp() {
  const params = new URLSearchParams(window.location.search)
  const app = params.get(OPEN_PARAM)
  if (app === null) return null
  params.delete(OPEN_PARAM)
  const query = params.toString()
  history.replaceState(history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  return Object.hasOwn(APPS, app) ? app : null
}

function shouldBoot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return !sessionStorage.getItem(BOOT_KEY)
  } catch {
    return false
  }
}

export default function SignupPage() {
  const [booting, setBooting] = useState(shouldBoot)
  const [initialApp] = useState(takeInitialApp)
  /* undefined while the saved session is still being looked up. */
  const [user, setUser] = useState(undefined)
  /* Set when the server ends the session mid-visit, so log-on can say why. */
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    restoreSession().then(setUser)
  }, [])

  useEffect(() => {
    if (!booting) return
    const finish = () => {
      try {
        sessionStorage.setItem(BOOT_KEY, '1')
      } catch {
        /* Booting again next time is harmless. */
      }
      setBooting(false)
    }
    const timer = setTimeout(finish, BOOT_MS)
    /* Any key or click skips it — nobody should have to wait for scenery. */
    window.addEventListener('keydown', finish, { once: true })
    window.addEventListener('pointerdown', finish, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', finish)
      window.removeEventListener('pointerdown', finish)
    }
  }, [booting])

  const onLogOut = async () => {
    await logOut()
    setUser(null)
  }

  let screen = null
  if (booting) screen = <BootScreen />
  else if (user)
    screen = (
      <Desktop
        user={user}
        initialApp={initialApp}
        onUser={setUser}
        onExpired={() => {
          setExpired(true)
          setUser(null)
        }}
        onLogOut={onLogOut}
      />
    )
  else if (user === null)
    screen = (
      <LoginScreen
        expired={expired}
        onUser={(next) => {
          setExpired(false)
          setUser(next)
        }}
      />
    )

  return (
    <>
      <div className="signup-page">
        <main className="signup-main">
          <h1 className="sr-only">Sign up for Neodev</h1>

          <div className="computer">
            <div className="crt">
              <div className="crt-screen">
                {/* The title screen's sun, set as the wallpaper. Not while booting: a BIOS screen is black. */}
                {!booting && <SunBackdrop className="screen-sun" />}
                {screen}
              </div>
            </div>
            <div className="computer-chin" aria-hidden="true">
              <span className="computer-vents" />
              <span className="computer-led" />
            </div>
          </div>
          <div className="computer-stand" aria-hidden="true" />
        </main>

        {/* The way back, as on the sponsor page — a real navigation, not a hash. */}
        <footer className="signup-foot">
          <a className="signup-home" href="/">
            <svg className="signup-home-icon" aria-hidden="true">
              <use href="/icons.svg#home-icon" />
            </svg>
            Back to home page
          </a>
        </footer>
      </div>

      <CursorMascot />
    </>
  )
}

/* ------------------------------------------------------------------ boot */

function BootScreen() {
  return (
    <div className="boot" role="status" aria-label="Starting up">
      {BOOT_LINES.map((line, i) => (
        <p key={line} style={{ '--i': i }}>
          {line}
        </p>
      ))}
      <p className="boot-cursor" style={{ '--i': BOOT_LINES.length }}>
        _
      </p>
    </div>
  )
}

function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/* ---------------------------------------------------------------- window */

/**
 * One window of the era: a raised chrome frame, a title bar with real
 * controls, and a body. `tone` picks the title bar's colour.
 */
function Window({ title, tone = 'pink', icon, onMinimize, onClose, className = '', focusOnOpen, children }) {
  const titleId = useId()
  const ref = useRef(null)

  useEffect(() => {
    if (focusOnOpen) ref.current?.focus({ preventScroll: true })
  }, [focusOnOpen])

  return (
    <section
      ref={ref}
      tabIndex={-1}
      className={`win win--${tone} ${className}`}
      aria-labelledby={titleId}
    >
      <header className="win-bar">
        {icon && <span className="win-bar-icon">{icon}</span>}
        <h2 className="win-title" id={titleId}>
          {title}
        </h2>
        {(onMinimize || onClose) && (
          <div className="win-controls">
            {onMinimize && (
              <button type="button" className="win-btn" onClick={onMinimize} aria-label={`Minimize ${title}`}>
                <span aria-hidden="true">_</span>
              </button>
            )}
            {onClose && (
              <button type="button" className="win-btn" onClick={onClose} aria-label={`Close ${title}`}>
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>
        )}
      </header>
      <div className="win-body">{children}</div>
    </section>
  )
}

/* ---------------------------------------------------------------- fields */

/**
 * `question` sets a long label in the reading face rather than pixel type;
 * `wide` spans both columns of the application's grid.
 */
function Field({ label, error, hint, children, id, question, wide }) {
  return (
    <div className={`field${error ? ' field--error' : ''}${wide ? ' field--wide' : ''}`}>
      <label className={`field-label${question ? ' field-label--question' : ''}`} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Props that tie an input to its label, hint and error. */
function describe(id, error, hint) {
  const by = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': by }
}

/* ----------------------------------------------------------------- login */

function LoginScreen({ onUser, expired }) {
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState({ email: '', password: '', confirm: '', grade: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const uid = useId()
  const firstField = useRef(null)

  const creating = mode === 'create'
  const fieldError = (name) => (error?.field === name ? error.message : null)
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }))

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setValues((v) => ({ ...v, password: '', confirm: '' }))
    requestAnimationFrame(() => firstField.current?.focus())
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onUser(creating ? await signUp(values) : await logIn(values))
    } catch (err) {
      setError(err instanceof AccountError ? err : new AccountError('Something went wrong. Try again.'))
      setBusy(false)
    }
  }

  const id = (name) => `${uid}-${name}`

  return (
    <div className="logon">
      <Window title={creating ? 'Create account' : 'Log on to NEO-OS'} tone="pink" icon={<KeyIcon />} className="logon-win">
        <div className="logon-banner">
          <p className="logon-mark" aria-hidden="true">
            NEODEV
          </p>
          <p className="logon-sub">Applicant terminal · 2026</p>
        </div>

        <div className="logon-tabs" role="group" aria-label="Account">
          <button type="button" className="tab" aria-pressed={!creating} onClick={() => switchMode('login')}>
            Log in
          </button>
          <button type="button" className="tab" aria-pressed={creating} onClick={() => switchMode('create')}>
            New account
          </button>
        </div>

        <form className="logon-form" onSubmit={onSubmit} noValidate>
          {expired && !error && (
            <p className="form-alert" role="alert">
              Your session ended. Log in again to carry on.
            </p>
          )}

          {error && !error.field && (
            <p className="form-alert" role="alert">
              {error.message}
            </p>
          )}

          <Field label="Email" id={id('email')} error={fieldError('email')}>
            <input
              ref={firstField}
              className="input"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={set('email')}
              {...describe(id('email'), fieldError('email'))}
              required
            />
          </Field>

          <Field
            label="Password"
            id={id('password')}
            error={fieldError('password')}
            hint={creating ? 'At least 8 characters.' : null}
          >
            <input
              className="input"
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={values.password}
              onChange={set('password')}
              {...describe(id('password'), fieldError('password'), creating && 'hint')}
              required
            />
          </Field>

          {creating && (
            <>
              <Field label="Confirm password" id={id('confirm')} error={fieldError('confirm')}>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={set('confirm')}
                  {...describe(id('confirm'), fieldError('confirm'))}
                  required
                />
              </Field>

              <Field
                label="What grade are you in?"
                id={id('grade')}
                error={fieldError('grade')}
                hint="Open to students in high school and below."
              >
                <input
                  className="input input--short"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 9"
                  value={values.grade}
                  onChange={set('grade')}
                  {...describe(id('grade'), fieldError('grade'), 'hint')}
                  required
                />
              </Field>
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Please wait…' : creating ? 'Create account' : 'Log in'}
            </button>
          </div>
        </form>
      </Window>
    </div>
  )
}

/* --------------------------------------------------------------- desktop */

const APPS = {
  application: { title: 'Application', icon: <DocIcon />, tone: 'teal' },
  status: { title: 'Status', icon: <FlagIcon />, tone: 'gold' },
}
const APP_ORDER = ['application', 'status']

function Desktop({ user, initialApp, onUser, onExpired, onLogOut }) {
  /*
   * Status opens on its own: it is the first thing a returning applicant
   * wants. A View Application link asks for the form as well, in front.
   */
  const first = initialApp ?? 'status'
  const [open, setOpen] = useState(() => (first === 'status' ? ['status'] : ['status', first]))
  const [minimized, setMinimized] = useState([])
  /* `front` is the window last brought up; `focusTarget` moves keyboard focus. */
  const [front, setFront] = useState(first)
  const [focusTarget, setFocusTarget] = useState(null)

  const launch = (app) => {
    setOpen((o) => (o.includes(app) ? o : [...o, app]))
    setMinimized((m) => m.filter((a) => a !== app))
    setFront(app)
    setFocusTarget(app)
  }
  const close = (app) => {
    setOpen((o) => o.filter((a) => a !== app))
    setMinimized((m) => m.filter((a) => a !== app))
  }
  const minimize = (app) => setMinimized((m) => (m.includes(app) ? m : [...m, app]))

  /*
   * On a phone there is room for one window, not two side by side, and the
   * page never scrolls, so only the one brought up last shows. The other
   * waits on the taskbar.
   */
  const narrow = useMedia('(max-width: 720px)')
  const showing = APP_ORDER.filter((a) => open.includes(a) && !minimized.includes(a))
  const top = showing.includes(front) ? front : showing[showing.length - 1]
  const visible = narrow && top ? [top] : showing
  const toggle = (app) => (visible.includes(app) ? minimize(app) : launch(app))

  return (
    <div className="desktop">
      <div className="desktop-area">
        <ul className="desktop-icons" aria-label="Desktop">
          {APP_ORDER.map((app) => (
            <li key={app}>
              <button type="button" className="desk-icon" onClick={() => launch(app)}>
                {APPS[app].icon}
                <span>{APPS[app].title}</span>
              </button>
            </li>
          ))}
          <li>
            <a className="desk-icon" href="/">
              <HomeIcon />
              <span>Neodev home</span>
            </a>
          </li>
        </ul>

        <div className="desktop-windows">
          {visible.includes('application') && (
            <Window
              title="Application"
              tone="teal"
              icon={<DocIcon />}
              className="win--application"
              onMinimize={() => minimize('application')}
              onClose={() => close('application')}
              focusOnOpen={focusTarget === 'application'}
            >
              <ApplicationApp
                user={user}
                onUser={onUser}
                onExpired={onExpired}
                onDone={() => launch('status')}
              />
            </Window>
          )}

          {visible.includes('status') && (
            <Window
              title="Status"
              tone="gold"
              icon={<FlagIcon />}
              className="win--status"
              onMinimize={() => minimize('status')}
              onClose={() => close('status')}
              focusOnOpen={focusTarget === 'status'}
            >
              <StatusApp user={user} onOpenApplication={() => launch('application')} />
            </Window>
          )}
        </div>
      </div>

      <Taskbar user={user} open={open} showing={visible} onToggle={toggle} onLogOut={onLogOut} />
    </div>
  )
}

function Taskbar({ user, open, showing, onToggle, onLogOut }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="taskbar">
      <ul className="taskbar-apps" aria-label="Open windows">
        {APP_ORDER.filter((a) => open.includes(a)).map((app) => (
          <li key={app}>
            <button
              type="button"
              className="task"
              aria-pressed={showing.includes(app)}
              onClick={() => onToggle(app)}
            >
              {APPS[app].icon}
              <span>{APPS[app].title}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="taskbar-tray">
        <span className="tray-user" title={user.email}>
          {user.email}
        </span>
        <time className="tray-clock" dateTime={now.toISOString()}>
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time>
        <button type="button" className="btn btn--small" onClick={onLogOut}>
          Log off
        </button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- application */

const QUESTION =
  'Tell us about something you have built, or something you want to build. What got you interested in it?'

function ApplicationApp({ user, onUser, onExpired, onDone }) {
  const app = user.application
  const locked = !EDITABLE.includes(app.status)
  const [values, setValues] = useState({ ...EMPTY_APPLICATION, ...app.fields })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)
  const uid = useId()
  const id = (name) => `${uid}-${name}`

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }))
    setSaved(null)
  }
  const fieldError = (name) => (error?.field === name ? error.message : null)

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      const next = await action(user.email, values)
      onUser(next)
      return next
    } catch (err) {
      /* The server has forgotten who this is: back to log-on, which says why. */
      if (err?.code === 'unauthorized') {
        onExpired()
        return null
      }
      setError(err instanceof AccountError ? err : new AccountError('Something went wrong. Try again.'))
      if (err?.field) document.getElementById(id(err.field))?.focus()
      return null
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    const next = await run(saveApplication)
    if (next) setSaved(new Date(next.application.updatedAt))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = await run(submitApplication)
    if (next) onDone()
  }

  const text = (name, label, { area, rows = 3, required, autoComplete, question, wide } = {}) => {
    /* Submitted: the answers are printed, not offered for editing. */
    if (locked) {
      const answer = values[name].trim()
      return (
        <div className={`field${wide ? ' field--wide' : ''}`}>
          <p className={`field-label${question ? ' field-label--question' : ''}`}>{label}</p>
          <p className={`answer-text${answer ? '' : ' answer-text--empty'}`}>{answer || 'None'}</p>
        </div>
      )
    }

    const Tag = area ? 'textarea' : 'input'
    return (
      <Field
        label={required ? label : `${label} (optional)`}
        id={id(name)}
        error={fieldError(name)}
        question={question}
        wide={wide}
      >
        <Tag
          className="input"
          rows={area ? rows : undefined}
          type={area ? undefined : 'text'}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={set(name)}
          required={required}
          {...describe(id(name), fieldError(name))}
        />
      </Field>
    )
  }

  return (
    <form className="app-form" onSubmit={onSubmit} noValidate>
      {locked && (
        <p className="notice notice--locked">Submitted {formatDate(app.submittedAt)}.</p>
      )}

      {error && !error.field && (
        <p className="form-alert" role="alert">
          {error.message}
        </p>
      )}

      <fieldset className="app-fields">
        <legend className="sr-only">Your application</legend>

        {text('firstName', 'First name', { required: true, autoComplete: 'given-name' })}
        {text('lastName', 'Last name', { required: true, autoComplete: 'family-name' })}
        {text('school', 'School', { required: true, autoComplete: 'organization' })}

        <div className="grade-line">
          <p className="field-label">Grade</p>
          <p>{user.grade}</p>
        </div>

        {text('answer', QUESTION, { area: true, rows: 5, required: true, question: true, wide: true })}
        {text('dietary', 'Dietary restrictions', { area: true })}
        {text('needs', 'Other needs or accommodations', { area: true })}
      </fieldset>

      {!locked && (
        <div className="form-actions">
          <p className="save-note" aria-live="polite">
            {saved ? `Draft saved ${saved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
          </p>
          <button type="button" className="btn" onClick={onSave} disabled={busy}>
            Save draft
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Submit application
          </button>
        </div>
      )}
    </form>
  )
}

/* ---------------------------------------------------------------- status */

function StatusApp({ user, onOpenApplication }) {
  const app = user.application
  const status = STATUS[app.status] ?? STATUS.not_started
  const submitted = Boolean(app.submittedAt)
  const decided = ['accepted', 'waitlisted', 'declined'].includes(app.status)

  const steps = [
    { label: 'Account created', done: true, when: user.createdAt },
    { label: 'Application submitted', done: submitted, when: app.submittedAt },
    { label: 'Decision', done: decided },
  ]

  return (
    <div className="status">
      {/* A lit readout, so where the application stands is the first thing seen. */}
      <div className={`status-hero status-hero--${app.status}`} role="status">
        <p className="status-label">
          <span className="status-lamp" aria-hidden="true" />
          Your status
        </p>
        <p className="status-badge">{status.label}</p>
      </div>
      <p className="status-detail">{status.detail}</p>

      <ol className="status-steps">
        {steps.map((step) => (
          <li key={step.label} className={step.done ? 'is-done' : undefined}>
            <span className="status-check" aria-hidden="true">
              {step.done ? '✓' : ''}
            </span>
            <span>
              {step.label}
              <span className="sr-only">{step.done ? ' — done' : ' — not yet'}</span>
              {step.done && step.when && <span className="status-when">{formatDate(step.when)}</span>}
            </span>
          </li>
        ))}
      </ol>

      <dl className="status-facts">
        <div>
          <dt>Account</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Grade</dt>
          <dd>{gradeLabel(user.grade)}</dd>
        </div>
      </dl>

      <div className="form-actions">
        <button type="button" className="btn btn--primary" onClick={onOpenApplication}>
          {submitted ? 'View application' : app.status === 'draft' ? 'Continue application' : 'Start application'}
        </button>
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ----------------------------------------------------------------- icons

   Drawn on a 16-unit grid and rendered crisp, so they scale up as chunky
   pixels rather than smoothing into vector art. Colours come from the
   stylesheet by class. */

function PixelIcon({ children, className }) {
  return (
    <svg className={`px-icon ${className}`} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {children}
    </svg>
  )
}

function DocIcon() {
  return (
    <PixelIcon className="px-doc">
      <path className="px-line" d="M3 1h7l3 3v11H3z" />
      <path className="px-fill" d="M4 2h5v3h3v9H4z" />
      <path className="px-line" d="M10 2h1v1h1v1h-2zM5 7h6v1H5zM5 9h6v1H5zM5 11h4v1H5z" />
    </PixelIcon>
  )
}

function FlagIcon() {
  return (
    <PixelIcon className="px-flag">
      <path className="px-line" d="M3 1h1v14H3z" />
      <path className="px-fill" d="M4 2h9l-2 3 2 3H4z" />
      <path className="px-accent" d="M2 14h4v1H2z" />
    </PixelIcon>
  )
}

function HomeIcon() {
  return (
    <PixelIcon className="px-home">
      <path className="px-line" d="M8 1 1 8h2v7h10V8h2z" />
      <path className="px-fill" d="M8 3 4 7v7h3v-4h2v4h3V7z" />
    </PixelIcon>
  )
}

function KeyIcon() {
  return (
    <PixelIcon className="px-key">
      <path className="px-fill" d="M2 5h5v6H2zM7 7h7v2h-1v2h-2V9H7z" />
      <path className="px-line" d="M3 7h2v2H3z" />
    </PixelIcon>
  )
}

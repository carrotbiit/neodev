/*
 * What an account and an application are, independent of where they are kept.
 *
 * Both backends (`backends/local.js` and `backends/http.js`) validate with the
 * functions here before doing anything, so the reader gets the same message
 * for the same mistake either way, and the HTTP one never spends a round trip
 * on something the browser could have caught. The server must still check all
 * of it again — anything sent from a browser can be forged.
 */

/** Open to high school and below: grades 1 to 12. */
export const MAX_GRADE = 12

/**
 * The grade as typed, reduced to its number, so "9", "9th" and "Grade 9" are
 * the same answer. Null when there is no number in it.
 */
export function parseGrade(input) {
  const match = String(input ?? '').match(/\d+/)
  return match ? Number(match[0]) : null
}

export function gradeLabel(value) {
  return `Grade ${value}`
}

/*
 * Where an application stands. The first three follow from the applicant's
 * own actions; the last three are set by an organiser on the server. A status
 * the page does not know falls back to `not_started` rather than breaking.
 */
export const STATUS = {
  not_started: {
    label: 'Not submitted',
    detail: "You haven't started your application yet. Open Application on the desktop to begin.",
  },
  draft: {
    label: 'Not submitted',
    detail: "Your application is saved as a draft. It won't be reviewed until you submit it.",
  },
  submitted: {
    label: 'Under review',
    detail: "We've got your application. The team is reviewing it and you'll hear back here.",
  },
  accepted: {
    label: 'Accepted',
    detail: "You're in! Watch your email for event details.",
  },
  waitlisted: {
    label: 'Waitlisted',
    detail: "You're on the waitlist. We'll let you know as soon as a spot opens up.",
  },
  declined: {
    label: 'Not accepted',
    detail: "We couldn't offer you a spot this year. We hope to see you next time.",
  },
}

/** Statuses in which the applicant may still change their answers. */
export const EDITABLE = ['not_started', 'draft']

/** The application form's fields, empty. Grade is not one: it is the account's. */
export const EMPTY_APPLICATION = {
  firstName: '',
  lastName: '',
  school: '',
  answer: '',
  dietary: '',
  needs: '',
}

/** The fields an application cannot be submitted without. */
export const REQUIRED = {
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  school: 'Enter your school.',
  answer: 'Answer the application question.',
}

/**
 * Thrown for anything the page should show the reader. `field` names the
 * input at fault, if there is one; `code` is set for the cases the page acts
 * on rather than just displays — `unauthorized` sends it back to log-on.
 */
export class AccountError extends Error {
  constructor(message, field, code) {
    super(message)
    this.field = field
    this.code = code
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

/** Checks the create-account form and returns what should be sent. */
export function validateSignUp({ email, password, confirm, grade }) {
  const tidyEmail = normaliseEmail(email)
  if (!EMAIL_RE.test(tidyEmail)) throw new AccountError('Enter a valid email address.', 'email')
  if (String(password).length < 8)
    throw new AccountError('Use at least 8 characters for your password.', 'password')
  if (password !== confirm) throw new AccountError("The passwords don't match.", 'confirm')

  const gradeNumber = parseGrade(grade)
  if (gradeNumber === null || gradeNumber < 1)
    throw new AccountError('Enter your grade as a number, like 9.', 'grade')
  if (gradeNumber > MAX_GRADE)
    throw new AccountError('Neodev is only open to students in high school and below.', 'grade')

  return { email: tidyEmail, password, grade: String(gradeNumber) }
}

export function validateLogIn({ email, password }) {
  const tidyEmail = normaliseEmail(email)
  if (!tidyEmail) throw new AccountError('Enter your email address.', 'email')
  if (!password) throw new AccountError('Enter your password.', 'password')
  return { email: tidyEmail, password }
}

/** Exactly the application's fields, all strings — nothing extra is sent or kept. */
export function cleanFields(fields = {}) {
  return Object.fromEntries(Object.keys(EMPTY_APPLICATION).map((k) => [k, String(fields[k] ?? '')]))
}

export function validateSubmission(fields) {
  const tidy = cleanFields(fields)
  for (const [field, message] of Object.entries(REQUIRED)) {
    if (!tidy[field].trim()) throw new AccountError(message, field)
  }
  return tidy
}

/**
 * The account as the page uses it, from whatever a backend handed back. Fills
 * in anything missing so a partial response cannot crash the desktop.
 *
 *   { email, grade, createdAt,
 *     application: { status, fields, updatedAt, submittedAt } }
 */
export function toUser(raw) {
  if (!raw || typeof raw !== 'object' || !raw.email) return null
  const app = raw.application ?? {}
  return {
    email: String(raw.email),
    grade: String(raw.grade ?? ''),
    createdAt: raw.createdAt ?? null,
    application: {
      status: STATUS[app.status] ? app.status : 'not_started',
      fields: { ...EMPTY_APPLICATION, ...cleanFields(app.fields) },
      updatedAt: app.updatedAt ?? null,
      submittedAt: app.submittedAt ?? null,
    },
  }
}

/*
 * Accounts and applications for the sign-up page — the only module the page
 * talks to.
 *
 * Behind it is backends/http.js, which talks to the Django app in /backend
 * at VITE_API_URL over axios. The API it expects is written out at the top of
 * that file.
 *
 * Every function is async and either resolves with the user (see `toUser` in
 * model.js) or throws an AccountError the page can show as it is.
 */


export {
  AccountError,
  EDITABLE,
  EMPTY_APPLICATION,
  MAX_GRADE,
  REQUIRED,
  STATUS,
  gradeLabel,
  parseGrade,
} from './model'

export {
  logIn,
  logOut,
  restoreSession,
  saveApplication,
  signUp,
  submitApplication,
} from './backends/http'

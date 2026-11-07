/*
 * Accounts and applications for the sign-up page — the only module the page
 * talks to.
 *
 * Two interchangeable backends sit behind it, with the same six functions:
 *
 *   backends/http.js   the real one, over axios. Used whenever VITE_API_URL
 *                      is set. The API it expects is written out at the top
 *                      of that file.
 *   backends/local.js  a stand-in that keeps accounts in the browser, so the
 *                      flow can be built and tried with no server. Used when
 *                      VITE_API_URL is unset. Not for launch: read its header.
 *
 * Every function is async and either resolves with the user (see `toUser` in
 * model.js) or throws an AccountError the page can show as it is.
 */

import * as http from './backends/http'
import * as local from './backends/local'
import { API_URL } from '../api/client'

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

const backend = API_URL ? http : local

/** True while accounts are only being kept in this browser. */
export const IS_LOCAL = backend === local

export const signUp = backend.signUp
export const logIn = backend.logIn
export const logOut = backend.logOut
export const restoreSession = backend.restoreSession
export const saveApplication = backend.saveApplication
export const submitApplication = backend.submitApplication

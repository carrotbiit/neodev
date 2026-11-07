/*
 * "Is anyone signed in?", answered for the pages that are not the sign-up
 * page: the hero's call to action and the masthead's link both say Sign Up to
 * a stranger and View Application to an applicant.
 *
 * Answered from storage alone, without asking the server. The backend's
 * ThrottleMiddleware allows two requests a second, and every page load
 * spending one of them just to word a link would mean the sign-up page the
 * reader is about to open has less to work with. It also keeps the title
 * screen from importing axios and the backends to decide one label.
 *
 * So this is a guess, and a good one: a refresh token that has quietly
 * expired still reads as signed in here. That is harmless. The link goes to
 * the sign-up page either way, and the page checks the session properly and
 * shows the log-on prompt if it has lapsed.
 *
 * The two storage keys live here so that the backends that write them and
 * this module that reads them cannot drift apart.
 */

import { useEffect, useState } from 'react'

/** Where `api/client.js` keeps the SimpleJWT refresh token. */
export const REFRESH_KEY = 'neodev.refresh'
/** Where `backends/local.js` keeps the signed-in email. */
export const LOCAL_SESSION_KEY = 'neodev.session.v1'

/* The same test `accounts.js` uses to pick a backend, without importing it. */
const USES_SERVER = Boolean(import.meta.env.VITE_API_URL?.trim())

export function isSignedIn() {
  try {
    return Boolean(localStorage.getItem(USES_SERVER ? REFRESH_KEY : LOCAL_SESSION_KEY))
  } catch {
    return false
  }
}

/**
 * Where the sign-up page opens straight onto the Application window, for the
 * links that say View Application. `SignupPage` reads the parameter once and
 * drops it from the URL.
 */
export const OPEN_PARAM = 'open'
export const APPLICATION_HREF = `/signup?${OPEN_PARAM}=application`
export const SIGNUP_HREF = '/signup'

/** The sign-up link for whoever is reading: its words and where it goes. */
export function signupLink(signedIn) {
  return signedIn
    ? { label: 'View Application', href: APPLICATION_HREF }
    : { label: 'Sign Up', href: SIGNUP_HREF }
}

/**
 * `isSignedIn`, kept current. Rechecked when the page is shown again (Back
 * from the sign-up page after logging in or out restores this page from the
 * back-forward cache, as it was) and when another tab signs in or out.
 */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(isSignedIn)

  useEffect(() => {
    const recheck = () => setSignedIn(isSignedIn())
    window.addEventListener('pageshow', recheck)
    window.addEventListener('storage', recheck)
    return () => {
      window.removeEventListener('pageshow', recheck)
      window.removeEventListener('storage', recheck)
    }
  }, [])

  return signedIn
}

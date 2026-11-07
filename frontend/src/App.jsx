import HeroBackdrop from './components/HeroBackdrop'
import AboutSection from './components/AboutSection'
import WaveTransition from './components/WaveTransition'
import FaqSection from './components/FaqSection'
import ContactSection from './components/ContactSection'
import Scrollbar from './components/Scrollbar'
import Masthead from './components/Masthead'
import CursorMascot from './components/CursorMascot'
import { signupLink, useSignedIn } from './signup/session'
import './App.css'

/** Event details — swap these once the venue is locked in. */
const EVENT = {
  date: 'December',
  year: '2026',
}

/**
 * The hero's secondary action, beside Sign Up. A real navigation, to a real second document
 * — the sponsor page is the only thing on this site that is not a section of
 * the title screen, so it is the only link here that is allowed to leave it.
 * Every other link on the page is a way of scrolling; see `onNavClick` in
 * WaveTransition.
 *
 * No hash, deliberately: `onNavClick` only intercepts `a[href^="#"]`, so this
 * is left alone and navigates like any other link.
 */
const SPONSOR_HREF = '/sponsor'

/*
 * The hero's primary call to action goes to the sign-up page, a separate
 * document (signup.html, served extensionless by `cleanUrls`). It reads Sign
 * Up! to a stranger and View Application to someone already signed in; which
 * one is decided in `signup/session.js`, shared with the masthead's link. No
 * hash either way, so `onNavClick` leaves it alone.
 */

function App() {
  const signedIn = useSignedIn()
  const signup = signupLink(signedIn)

  return (
    <>
      {/*
        The synthwave scene, baked to a seamless loop rather than drawn live —
        how it is rendered, and the speed, horizon and sun size it is rendered
        with, are in tools/hero-loop.mjs. The beach and everything under it
        paint over this, which is what `visibleWhile` watches for.
      */}
      <HeroBackdrop visibleWhile=".screen" />

      <Masthead />

      <div className="screen">
        <main id="hero">
          <h1 className="wordmark" data-text="NEODEV">
            NEODEV
          </h1>
          <p className="tagline">Neo Developers League</p>
          <p className="details">
            {EVENT.date} <span aria-hidden="true">—</span> {EVENT.year}
          </p>
          <div className="hero-actions">
            <a className="signup-cta" href={signup.href}>
              {signedIn ? signup.label : 'Sign Up!'}
            </a>
            <a className="hero-link" href={SPONSOR_HREF}>
              Sponsor Us
            </a>
          </div>
        </main>
      </div>

      <AboutSection />

      <WaveTransition />

      {/*
        Everything below the wave, wrapped as one. The transition lifts this
        out of the document so the page ends at the beach — which only works
        if nothing is left behind it in flow.
      */}
      <div className="depths">
        <FaqSection />
        <ContactSection />
      </div>

      {/*
        Last, so it paints over everything. The page's only scrollbar — the
        native one is hidden, because it cannot describe a page that holds a
        whole section out of the document. See Scrollbar.jsx.
      */}
      <Scrollbar />

      {/* The logo on a keyring, hung off the pointer. Over the rail too. */}
      <CursorMascot />
    </>
  )
}

export default App

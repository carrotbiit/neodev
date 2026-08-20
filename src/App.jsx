import SynthwaveBackground from './components/SynthwaveBackground'
import AboutSection from './components/AboutSection'
import WaveTransition from './components/WaveTransition'
import FaqSection from './components/FaqSection'
import ContactSection from './components/ContactSection'
import './App.css'

/** Event details — swap these once the date and venue are locked in. */
const EVENT = {
  date: 'DATE',
  place: 'PLACE',
  signupUrl: '#signup',
}

/* One entry per section that exists. WaveTransition handles the scrolling —
   the depths are held out of flow while the beach is up, so a plain anchor
   jump would land the reader on a section that is not in the document yet. */
const NAV = [
  { label: 'About', href: '#about-title' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram-icon' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: 'linkedin-icon' },
  { label: 'Discord', href: 'https://discord.com/', icon: 'discord-icon' },
]

function App() {
  return (
    <>
      <SynthwaveBackground
        className="page-background"
        speed={2}
        horizon={0.58}
        sunSize={0.3}
      />

      <header id="masthead">
        <nav aria-label="Primary">
          <ul className="nav-links">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="socials">
          {SOCIALS.map((item) => (
            <li key={item.label}>
              <a href={item.href} target="_blank" rel="noreferrer" title={item.label}>
                <svg className="social-icon" aria-hidden="true">
                  <use href={`/icons.svg#${item.icon}`} />
                </svg>
                <span className="sr-only">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </header>

      <div className="screen">
        <main id="hero">
          <h1 className="wordmark" data-text="NEODEV">
            NEODEV
          </h1>
          <p className="tagline">Neo Developers League</p>
          <p className="details">
            {EVENT.date} <span aria-hidden="true">—</span> {EVENT.place}
          </p>
          <a className="signup" href={EVENT.signupUrl}>
            Sign Up
          </a>
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
    </>
  )
}

export default App

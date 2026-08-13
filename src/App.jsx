import SynthwaveBackground from './components/SynthwaveBackground'
import './App.css'

/** Event details — swap these once the date and venue are locked in. */
const EVENT = {
  date: 'DATE',
  place: 'PLACE',
  signupUrl: '#signup',
}

const NAV = [
  { label: 'About', href: '#about' },
  { label: 'Sponsors', href: '#sponsors' },
  { label: 'Projects', href: '#projects' },
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

      <div className="scanlines" aria-hidden="true" />
    </>
  )
}

export default App

import PalmTree from './PalmTree'
import './About.css'

/** Placeholder copy — swap once the real about text is written. */
const BRIEF = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
]

/** Placeholder stat tiles — numbers are stand-ins. */
const STATS = [
  { value: '00', label: 'Placeholder' },
  { value: '00', label: 'Placeholder' },
  { value: '00', label: 'Placeholder' },
]

/** The scattered polaroids. `area` maps to a grid slot in About.css. */
const PHOTOS = [
  { area: 'one', ratio: '4 / 3', code: 'IMG_01', caption: 'Placeholder' },
  { area: 'two', ratio: '1 / 1', code: 'IMG_02', caption: 'Placeholder' },
  { area: 'three', ratio: '3 / 4', code: 'IMG_03', caption: 'Placeholder' },
  { area: 'four', ratio: '16 / 9', code: 'IMG_04', caption: 'Placeholder' },
]

/** The strip along the bottom — wider, uncaptioned, VHS-timecoded. */
const REEL = ['00:14', '01:02', '02:37', '03:48', '05:11']

/** Menu titles on the brief window. Decorative — they do not open anything. */
const MENUS = ['File', 'Edit', 'View', 'Help']

/**
 * Deterministic star field. Seeded by index rather than Math.random so the sky
 * does not reshuffle on every render.
 */
const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 37.6) % 100,
  top: ((i * 61.3) % 46) + 1,
  size: (i % 3) + 1,
  delay: (i % 7) * 0.6,
}))

function PhotoSlot({ area, ratio, code, caption }) {
  return (
    <figure className={`photo photo--${area}`} style={{ '--ratio': ratio }}>
      <span className="photo-tape photo-tape--l" aria-hidden="true" />
      <span className="photo-tape photo-tape--r" aria-hidden="true" />
      <div className="photo-frame">
        <span className="photo-code">{code}</span>
        <span className="photo-hint">IMAGE</span>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

export default function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title">
      {/* ------------------------------------------------------- the scenery */}
      <div className="beach" aria-hidden="true">
        <div className="beach-sky">
          {STARS.map((star) => (
            <span
              key={`${star.left}-${star.top}`}
              className="star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="beach-ocean" />
        <div className="beach-sand" />

        <PalmTree className="palm--far-left" sway={9} delay={-2} />
        <PalmTree className="palm--left" sway={7.5} />
        <PalmTree className="palm--right" flip sway={8.5} delay={-3.5} />
        <PalmTree className="palm--far-right" flip sway={6.5} delay={-1.2} />
      </div>

      {/* The tide line the hero's grid floor washes into. */}
      <svg className="shoreline" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="shoreline-back"
          d="M0 62 C 180 18, 300 96, 480 68 C 660 40, 780 104, 960 74 C 1140 44, 1290 88, 1440 58 L1440 120 L0 120 Z"
        />
        <path
          className="shoreline-front"
          d="M0 84 C 200 48, 340 116, 520 90 C 700 64, 840 118, 1020 92 C 1200 66, 1320 106, 1440 82 L1440 120 L0 120 Z"
        />
      </svg>

      {/* ------------------------------------------------------- the content */}
      <div className="about-inner">
        <header className="sign">
          <h2 className="sign-title" id="about-title">
            Welcome to Neodev
          </h2>
        </header>

        <div className="drift">
          {PHOTOS.map((photo) => (
            <PhotoSlot key={photo.area} {...photo} />
          ))}

          {/* A window off an old desktop: bevelled chrome, title bar, menu bar. */}
          <article className="brief">
            <div className="window-bar">
              <span className="window-title">about.txt</span>
              <span className="window-buttons" aria-hidden="true">
                <i>_</i>
                <i>□</i>
                <i>✕</i>
              </span>
            </div>
            <div className="window-menu" aria-hidden="true">
              {MENUS.map((menu) => (
                <span key={menu}>{menu}</span>
              ))}
            </div>
            <div className="brief-body">
              {BRIEF.map((line) => (
                <p key={line.slice(0, 24)}>{line}</p>
              ))}
            </div>
          </article>

          <ul className="stats">
            {STATS.map((stat, i) => (
              <li key={stat.label + i}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="reel" role="group" aria-label="Image placeholders">
          <span className="reel-label" aria-hidden="true">
            ▶ TAPE 01
          </span>
          <ul className="reel-track">
            {REEL.map((code) => (
              <li key={code}>
                <div className="reel-slot">
                  <span className="reel-code">{code}</span>
                  <span className="photo-hint">IMAGE</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

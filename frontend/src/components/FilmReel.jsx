import './FilmReel.css'

/*
 * The film reel — a strip of VHS-timecoded frames that scrolls itself.
 *
 * Nothing mounts this at the moment. It used to run along the bottom of the
 * About section and was taken off the page while its frames sat empty; it is
 * kept whole here so it can go back up once there are pictures for it. Drop
 * it into a section and it brings its own styling:
 *
 *   <FilmReel className="pop" />
 *
 * Unlike the version that lived in About.css, this one defines the custom
 * properties it reads, so it does not need to sit inside `#about` to look
 * right.
 */

/** The frames, left to right — wider than the polaroids, and uncaptioned. */
const REEL = ['00:14', '01:02', '02:37', '03:48', '05:11']

/*
 * The tape runs itself, so the strip carries three identical copies of the
 * reel and slides by exactly one of them before looping — the seam lands on
 * a matching frame and never shows. Two would do at most widths; three keeps
 * the track wider than the viewport on a very wide screen.
 */
const REEL_COPIES = [0, 1, 2]

export default function FilmReel({ className = '', label = '▶ TAPE 01' }) {
  return (
    <div className={`reel ${className}`.trim()} role="group" aria-label="Image placeholders">
      <span className="reel-label" aria-hidden="true">
        {label}
      </span>
      <div className="reel-viewport">
        <div className="reel-strip">
          {REEL_COPIES.map((copy) => (
            <ul className="reel-track" key={copy} aria-hidden={copy > 0 || undefined}>
              {REEL.map((code) => (
                <li key={code}>
                  <div className="reel-slot">
                    <span className="reel-code">{code}</span>
                    <span className="reel-hint">IMAGE</span>
                  </div>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}

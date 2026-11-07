import './Contact.css'

/**
 * Contact — the cut-away.
 *
 * The dive ends at the seabed, so this section is what lies under it: bare
 * ground with nothing in it but the survey grid laid over the face, and a
 * terminal standing on it listing the ways back up to the surface.
 */

/*
 * The ways to reach Neodev. `value` is what the reader sees, `href` where it
 * goes — the two differ for anything that reads better as a handle than as a
 * URL. `external` sends the link out of the site in a new tab; a mailto does
 * not, since it hands off to a mail client rather than a page.
 */
const CONTACTS = [
  {
    label: 'Email',
    value: 'support@neoleague.dev',
    href: 'mailto:support@neoleague.dev',
  },
  {
    label: 'Instagram',
    value: '@neodevleague',
    href: 'https://www.instagram.com/neodevleague/',
    external: true,
  },
]

export default function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-title">
      {/* The survey grid laid over the whole face. */}
      <div className="cut-grid" aria-hidden="true" />

      {/* ----------------------------------------------------- the content */}
      <div className="contact-inner">
        <header className="dig">
          <h2 className="dig-title" id="contact-title">
            Contact
          </h2>
        </header>

        <div className="transmit">
          <div className="transmit-bar">
            <span>transmit.exe</span>
            <span className="transmit-buttons" aria-hidden="true">
              <i>_</i>
              <i>□</i>
              <i>✕</i>
            </span>
          </div>

          <div className="roster">
            <p className="roster-lead">Send word up to the surface.</p>

            <dl className="roster-list">
              {CONTACTS.map((contact) => (
                <div className="roster-row" key={contact.label}>
                  <dt>{contact.label}</dt>
                  <dd>
                    <a
                      href={contact.href}
                      {...(contact.external && { target: '_blank', rel: 'noreferrer' })}
                    >
                      {contact.value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

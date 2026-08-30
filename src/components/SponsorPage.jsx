import Masthead from './Masthead'
import './Sponsor.css'

/*
 * Placeholder copy — swap once the sponsorship prospectus is written. The tone
 * here is deliberately a step more sober than the title screen: this page is
 * read by people deciding whether to spend money.
 *
 * Deliberately bare for now. The page is the masthead, a title and this
 * paragraph over the site's own background; the tiers, figures and contact
 * details go in once there is something real to put in them. The masthead is
 * the way back to the title screen, so the page carries no footer of its own.
 */
const LEDE =
  'Placeholder introduction. One paragraph on what Neodev is, who attends, and what a partner gets out of being in the room — replace with the real summary once the prospectus is signed off.'

export default function SponsorPage() {
  return (
    <>
      <Masthead base="/" />

      <div className="sponsor-page">
        <main className="sponsor-main">
          <header className="sponsor-hero">
            <h1 className="sponsor-title">Sponsor Neodev</h1>
            <p className="sponsor-lede">{LEDE}</p>
          </header>
        </main>
      </div>
    </>
  )
}

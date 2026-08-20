import { useEffect, useRef } from 'react'
import waveUrl from '../assets/wave.png'
import './WaveTransition.css'

/**
 * The wave that carries the page from the beach into the sea.
 *
 * While the beach is on screen the FAQ is *held*: taken out of the document
 * flow, pinned to the top of the screen and clipped away to nothing. Two
 * things follow from that, and they are the whole design.
 *
 * The page now ends at the bottom of the beach. There is no seam to catch the
 * reader crossing — scrolling down simply runs out of page, however fast it is
 * done, and from there the wheel drives the wave instead. Nothing to miss, so
 * nothing to miss it by.
 *
 * And the wave uncovers the real FAQ rather than a stand-in for it. The held
 * section is laid out exactly as it will be once released, so what is behind
 * the wave during the sweep is what stays on screen after it — the questions
 * are already there as the water reaches them.
 *
 * Releasing it puts the page back in flow and scrolls to it, which changes
 * nothing on screen because the two renderings are the same one.
 */

/** Scroll distance needed to cross the screen, as a multiple of the viewport. */
const SWEEP = 1.15

/** Wave height as a multiple of the viewport, so the whole picture reads. */
const WALL = 1.06

/** Where the waterline sits across the (square) image, 0–1. */
const FACE = 0.66

/** Share of the remaining distance covered per frame — the gesture's smoothing. */
const EASE = 0.16

/** Keeps both ends of the sweep clear of the screen. */
const CUSHION = 48

/**
 * The strip of water the wave stands in, as multiples of the wave's own size —
 * how far it reaches back behind the waterline and how far ahead of it. Sized
 * from the wave rather than fixed so it covers the picture at every viewport.
 * Its fade is in the CSS, and reads against these.
 */
const FOAM_BACK = 0.96
const FOAM_AHEAD = 0.3

/** Wheel deltas arrive in pixels, lines or pages depending on the browser. */
const LINE = 16

function pixels(event) {
  if (event.deltaMode === 1) return event.deltaY * LINE
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

/** Keys that scroll, so the sweep stays operable without a wheel. */
const KEYS = {
  ArrowDown: 0.14,
  ArrowUp: -0.14,
  PageDown: 0.55,
  PageUp: -0.55,
  ' ': 0.55,
  End: 1,
  Home: -1,
}

export default function WaveTransition() {
  const anchorRef = useRef(null)
  const stageRef = useRef(null)
  const foamRef = useRef(null)
  const waveRef = useRef(null)

  useEffect(() => {
    const anchor = anchorRef.current
    const stage = stageRef.current
    const foam = foamRef.current
    const wave = waveRef.current
    const depths = document.querySelector('.depths')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!depths) return undefined

    /** Where the gesture has pushed the sweep, 0–1. */
    let target = 0
    /** What is actually drawn, chasing `target` — this is what makes it smooth. */
    let current = 0
    /** Whether the depths are out of flow, waiting behind the wave. */
    let held = false
    /** Whether the wave currently owns the reader's scrolling. */
    let engaged = false
    /** Page offset the wave is holding the reader at. */
    let pinned = 0
    /**
     * Which way the reader is driving the sweep, +1 or -1. The ends are only
     * acted on when they are being driven towards: engaging forward starts at
     * 0, and without this the first frame would read that as "backed all the
     * way out" and release the wave the instant it took hold.
     */
    let heading = 1
    let lastY = window.scrollY
    let frame = 0
    let touchY = 0
    /*
     * Live while a nav link is driving the page. The catches below read raw
     * scrolling as intent, and a link's scroll is not the reader reaching the
     * end of anything — left alone, following one up past the beach would trip
     * the reverse sweep and take the page off them mid-flight.
     */
    let navTimer = 0

    /* Measured on resize rather than per event — reading layout inside a
       scroll handler is what makes a page feel heavy. */
    let seam = 0
    let wall = 0

    const measure = () => {
      const exact = anchor.getBoundingClientRect().top + window.scrollY
      // Whole pixels: browsers report `scrollY` rounded, and a fractional
      // target comes back as a phantom move in the opposite direction.
      seam = Math.round(exact)
      /*
       * The section's real offset is fractional, so scrolling to the rounded
       * one leaves it a fraction of a pixel down the screen. Held, it would
       * sit at a flat zero — a pixel adrift of where it lands. Offsetting it
       * by the same fraction makes the two renderings the same one.
       */
      depths.style.setProperty('--hold-top', `${exact - seam}px`)
      wall = window.innerHeight * WALL
      wave.style.width = `${wall}px`
      wave.style.height = `${wall}px`
      foam.style.width = `${wall * (FOAM_BACK + FOAM_AHEAD)}px`
    }

    /** Offset at which the beach's last line sits on the bottom of the screen. */
    const boundary = () => seam - window.innerHeight

    const paint = (p) => {
      const width = window.innerWidth
      const tail = wall * FACE
      const lead = wall - tail
      const back = wall * FOAM_BACK
      /*
       * The waterline runs from just off the left of the screen to just off
       * the right, with enough overshoot at both ends to carry everything that
       * trails it clear of the screen. The strip of water reaches further back
       * than the picture does, so it is what sets the overshoot — sized to the
       * wave alone, the strip would still be lying over the questions when the
       * sweep ended.
       */
      const trail = Math.max(tail, back)
      const edge = -lead - CUSHION + p * (width + trail + lead + CUSHION * 2)

      wave.style.transform = `translate3d(${edge - tail}px, -50%, 0)`
      foam.style.transform = `translate3d(${edge - back}px, 0, 0)`
      // How much of the depths is still clipped away, measured from the right.
      depths.style.setProperty(
        '--reveal',
        `${Math.max(0, Math.min(width, width - edge))}px`,
      )
    }

    /** Take the depths out of flow so the page ends at the beach. */
    const hold = (p) => {
      paint(p)
      depths.classList.add('tide-held')
      held = true
    }

    /** Put the depths back in flow, at the top of the screen. */
    const release = () => {
      depths.classList.remove('tide-held')
      held = false
      engaged = false
      stage.dataset.active = 'false'
      target = 1
      current = 1
      lastY = seam
      window.scrollTo({ top: seam, behavior: 'instant' })
    }

    /**
     * Arm the wave: take the depths back out of flow with the sweep at zero.
     * Only safe at or above the boundary, where shortening the page cannot
     * move the reader.
     */
    const arm = () => {
      /*
       * Never when less motion was asked for: the sweep is the only way back
       * out of a held section, and it is exactly what that setting turns off.
       * Arming it there would end the page at the beach with no way on.
       */
      if (held || reduce.matches || window.scrollY > boundary()) return
      /*
       * Wind the sweep back to nothing as well as painting it there. Anything
       * that repaints from state afterwards — a resize, and holding the
       * depths is itself a resize — would otherwise redraw the sweep at
       * wherever it was left, which is fully crossed: the questions pinned to
       * the top of the screen with the beach hidden behind them.
       */
      target = 0
      current = 0
      hold(0)
    }

    /** Backed out of the sweep — the depths stay held, the beach stays put. */
    const rewind = () => {
      engaged = false
      stage.dataset.active = 'false'
      target = 0
      current = 0
      lastY = window.scrollY
    }

    /*
     * One loop, running for as long as the wave is engaged or still catching
     * up. `frame` is only cleared by the loop itself deciding to stop, so a
     * frame that never arrives can never leave a stale handle that blocks
     * every later scheduling attempt.
     */
    const tick = () => {
      const diff = target - current
      current = Math.abs(diff) < 0.0015 ? target : current + diff * EASE
      paint(current)

      if (engaged && heading > 0 && target >= 1 && current > 0.999) release()
      else if (engaged && heading < 0 && target <= 0 && current < 0.001) rewind()

      if (engaged || current !== target) frame = requestAnimationFrame(tick)
      else frame = 0
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const engage = (from) => {
      if (!held) {
        /*
         * Coming back up, undo any overshoot past the top of the depths before
         * lifting them out of flow. Both happen before the frame is painted,
         * so the beach never flashes through underneath.
         */
        if (from > 0 && window.scrollY < seam) {
          window.scrollTo({ top: seam, behavior: 'instant' })
        }
        hold(from)
      }
      engaged = true
      pinned = boundary()
      lastY = pinned
      stage.dataset.active = 'true'
      heading = from > 0 ? -1 : 1
      target = from
      current = from
      paint(current)
      schedule()
    }

    const advance = (delta) => {
      if (delta) heading = delta > 0 ? 1 : -1
      target = Math.min(1, Math.max(0, target + delta / (window.innerHeight * SWEEP)))
      schedule()
    }

    /** True once the page has run out of beach to scroll. */
    const atEnd = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2

    /**
     * `delta` is positive scrolling down. Returns true when the wave took the
     * gesture, in which case the caller stops the page from scrolling.
     */
    const drive = (delta) => {
      if (reduce.matches || !delta) return false

      /*
       * A nav link is still flying. Stand down rather than take the gesture:
       * the browser cancels its own smooth scroll on real input, so the reader
       * gets ordinary scrolling and the catches come back once it settles.
       * Grabbing here instead would pin them mid-flight — a stray tick of
       * inertia on the way up to the beach would engage the sweep in reverse
       * and leave the questions stuck to the top of the screen.
       */
      if (navTimer) return false

      if (engaged) {
        advance(delta)
        return true
      }

      // Downward at the end of the beach: the wave takes over. There is no
      // moment to catch here — the page has simply run out, and stays run out
      // for as long as the reader keeps pushing.
      if (delta > 0 && held && atEnd()) {
        engage(0)
        advance(delta)
        return true
      }

      // Upward at the top of the FAQ: run the sweep backwards. Holding the
      // section again shortens the page, which lands the reader back on the
      // beach on its own.
      if (delta < 0 && !held && window.scrollY <= seam + 2) {
        engage(1)
        advance(delta)
        return true
      }

      return false
    }

    const onWheel = (event) => {
      if (drive(pixels(event))) event.preventDefault()
    }

    const onTouchStart = (event) => {
      touchY = event.touches[0].clientY
    }

    const onTouchMove = (event) => {
      const y = event.touches[0].clientY
      const delta = touchY - y
      touchY = y
      if (drive(delta)) event.preventDefault()
    }

    const onKeyDown = (event) => {
      const step = KEYS[event.key]
      if (step === undefined) return
      if (!engaged && !(step > 0 && held && atEnd())) return
      if (drive(step * window.innerHeight)) event.preventDefault()
    }

    /*
     * The depths are clipped away while held, so anything that sends the
     * reader straight into them — a nav link, a tab into a question or a form
     * field — has to let them out rather than drop the reader somewhere
     * invisible. Releasing lands on the FAQ's top, so both of these then put
     * the reader where they were actually headed.
     */
    const jumpTo = () => {
      if (!held) return
      release()
      const target = document.getElementById(location.hash.slice(1))
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
    }

    /**
     * A nav link. The depths are clipped away while held, so an ordinary
     * anchor jump would aim at a section that is not in the document yet —
     * this lets them out first, then scrolls to where the reader asked to go.
     */
    const onNavClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = event.target.closest?.('a[href^="#"]')
      const id = link?.getAttribute('href').slice(1)
      const el = id && document.getElementById(id)
      if (!el) return

      event.preventDefault()
      // Straight to the URL: going through the hash would fire `jumpTo` as
      // well, and the two would fight over the same landing.
      history.pushState(null, '', `#${id}`)

      if (held && depths.contains(el)) release()
      markNavigating()

      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      let top = el.getBoundingClientRect().top + window.scrollY - margin
      /*
       * Never land above the seam on the way to something below it. The
       * heading's own scroll-margin would put the reader a little way back up
       * the beach — which is where the reverse sweep waits, so the next flick
       * of the wheel would pull them straight back out of the section they
       * just asked for.
       */
      if (depths.contains(el)) top = Math.max(seam, top)

      window.scrollTo({ top, behavior: reduce.matches ? 'instant' : 'smooth' })
    }

    /** Holds off the catches until a nav link's scroll has come to rest. */
    const markNavigating = () => {
      clearTimeout(navTimer)
      navTimer = setTimeout(() => {
        navTimer = 0
        lastY = window.scrollY
        // Landing back above the beach's end re-arms the wave for the crossing.
        arm()
      }, 160)
    }

    const onFocusIn = (event) => {
      if (!held) return
      release()
      event.target.scrollIntoView({ behavior: 'instant', block: 'center' })
    }

    const onScroll = () => {
      const y = window.scrollY
      const up = y < lastY - 1
      lastY = y

      if (engaged) {
        /*
         * Downward the page cannot move while the depths are held — it ends at
         * the beach. Upward it can, and the momentum of the flick that started
         * the sweep will keep trying to. Put it back.
         */
        if (Math.abs(y - pinned) > 1) {
          window.scrollTo({ top: pinned, behavior: 'instant' })
          lastY = pinned
        }
        return
      }

      // A nav link owns this scroll and knows where it is going. Keep the
      // timer alive for as long as it is still running.
      if (navTimer) {
        markNavigating()
        return
      }

      /*
       * Coming back up past the top of the depths. The downward catch needs no
       * help — the page simply runs out of beach — but on this side there is a
       * whole screen of scrollable page above, and waiting for the next wheel
       * tick lets a fast flick outrun the catch. Watch the position instead,
       * which no speed can slip past.
       */
      if (!held && up && y < seam && !reduce.matches) {
        engage(1)
        return
      }

      // Last resort, for when the sweep was skipped: back above the beach's
      // end with the depths still in flow, arm the wave again.
      if (up) arm()
    }

    const onResize = () => {
      measure()
      paint(current)
    }

    measure()

    // Hold from the start — unless the reader is already past the beach, or
    // has asked for less motion, in which case the page stays as written.
    if (!reduce.matches && window.scrollY <= boundary()) hold(0)

    // The about section settles as its fonts and images arrive, which moves
    // the seam — watch for it rather than trusting the first measurement.
    const observer = new ResizeObserver(onResize)
    observer.observe(document.body)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    window.addEventListener('hashchange', jumpTo)
    document.addEventListener('click', onNavClick)
    depths.addEventListener('focusin', onFocusIn)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(navTimer)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('hashchange', jumpTo)
      document.removeEventListener('click', onNavClick)
      depths.removeEventListener('focusin', onFocusIn)
      depths.classList.remove('tide-held')
    }
  }, [])

  return (
    <div className="tide" ref={anchorRef}>
      <div className="tide-stage" ref={stageRef} data-active="false" aria-hidden="true">
        <div className="tide-foam" ref={foamRef} />
        <img className="tide-wave" ref={waveRef} src={waveUrl} alt="" />
      </div>
    </div>
  )
}

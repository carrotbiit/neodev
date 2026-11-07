import { useEffect, useRef, useState } from 'react'
import logoUrl from '../assets/mascot.webp'
import './CursorMascot.css'

/*
 * Where the ring hangs, relative to the pointer's hot spot: just under the
 * tail of the arrow, so the logo never covers what is being pointed at.
 */
const HANG_X = 10
const HANG_Y = 22

/*
 * The ring chases the pointer on a spring rather than sitting on it — slightly
 * under-damped, so it trails a fast move and settles with the faintest
 * overshoot. That lag is the "lazy" half; the swing below is the alive half.
 */
const FOLLOW_K = 420
const FOLLOW_C = 2 * Math.sqrt(FOLLOW_K) * 0.82

/*
 * The logo is a pendulum off the ring, driven by the ring's own acceleration:
 * jerk the pointer right and it lags left, stop dead and it swings through.
 * About one swing a second, dying out over two — the period of a real fob on
 * a short chain, not a bell on a rope.
 */
const GRAVITY = 1800
const LENGTH = 34
const SWING_DAMP = 2.6
/*
 * Air drag, which grows with the square of the spin: nothing at the gentle end,
 * and enough on a hard flick that the fob swings up toward the ring rather
 * than looping over it like a propeller.
 */
const SWING_DRAG = 0.06
/*
 * How much of the ring's acceleration reaches the logo. Full coupling is
 * honest physics and far too much of it: an ordinary flick sends the fob
 * round and round. A quarter keeps the swing big on a fast move and small
 * on a slow one.
 */
const DRIVE = 0.24

/*
 * A keychain also spins on its chain. Horizontal acceleration twists the logo
 * about its own vertical axis, on a stiffer spring of its own, so a flick
 * shows a glimpse of its edge before it turns back to face the reader.
 */
const TWIST_K = 120
const TWIST_C = 7
const TWIST_GAIN = 0.4
const TWIST_MAX = 60

/* Settled below these, the loop stops until the pointer moves again. */
const REST = 0.05

const canRun = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The cursor's mascot: the logo, hung off the pointer like a keychain.
 *
 * Pure scenery — `aria-hidden`, `pointer-events: none`, and absent entirely on
 * touch screens (there is no cursor to hang it from) and under reduced motion.
 * It runs on rAF only while something is still moving; at rest it costs
 * nothing but the CSS idle bob, which is a compositor animation.
 */
export default function CursorMascot() {
  const [enabled, setEnabled] = useState(false)
  const rootRef = useRef(null)
  const swingRef = useRef(null)
  const fobRef = useRef(null)

  useEffect(() => {
    const queries = [
      window.matchMedia('(hover: hover) and (pointer: fine)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ]
    const update = () => setEnabled(canRun())
    update()
    queries.forEach((q) => q.addEventListener('change', update))
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    const swing = swingRef.current
    const fob = fobRef.current

    let tx = 0, ty = 0          // where the ring wants to be
    let px = 0, py = 0          // where it is
    let vx = 0, vy = 0
    let angle = 0, spin = 0     // pendulum, radians from hanging straight down
    let twist = 0, twistV = 0   // degrees about the logo's vertical axis
    let placed = false
    let frame = 0
    let last = 0

    const render = () => {
      root.style.transform = `translate3d(${px}px, ${py}px, 0)`
      swing.style.transform = `rotate(${-angle}rad)`
      fob.style.transform = `perspective(240px) rotateY(${twist}deg)`
    }

    const step = (now) => {
      /* Clamped so a backgrounded tab does not come back with one huge step. */
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now

      const ax = FOLLOW_K * (tx - px) - FOLLOW_C * vx
      const ay = FOLLOW_K * (ty - py) - FOLLOW_C * vy
      vx += ax * dt
      vy += ay * dt
      px += vx * dt
      py += vy * dt

      /* In the ring's frame the logo feels gravity plus the ring's
         acceleration reversed — that reversal is what makes it lag. */
      const alpha =
        (-(GRAVITY + DRIVE * ay) * Math.sin(angle) - DRIVE * ax * Math.cos(angle)) /
          LENGTH -
        SWING_DAMP * spin -
        SWING_DRAG * spin * Math.abs(spin)
      spin += alpha * dt
      angle += spin * dt

      const twistA = -TWIST_K * twist - TWIST_C * twistV + TWIST_GAIN * ax
      twistV += twistA * dt
      twist = Math.max(-TWIST_MAX, Math.min(TWIST_MAX, twist + twistV * dt))

      /* Let a big flick carry it over the top, then wind the count back so
         it settles hanging down rather than three turns round. */
      if (angle > Math.PI) angle -= 2 * Math.PI
      else if (angle < -Math.PI) angle += 2 * Math.PI

      render()

      const resting =
        Math.abs(tx - px) + Math.abs(ty - py) < REST &&
        Math.abs(vx) + Math.abs(vy) < REST * 10 &&
        Math.abs(angle) < REST * 0.06 &&
        Math.abs(spin) < REST * 0.6 &&
        Math.abs(twist) + Math.abs(twistV) < REST * 4

      frame = resting ? 0 : requestAnimationFrame(step)
    }

    const wake = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(step)
    }

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      tx = e.clientX + HANG_X
      ty = e.clientY + HANG_Y
      if (!placed) {
        /* First sighting: appear on the pointer, not fly in from the corner. */
        px = tx
        py = ty
        placed = true
        render()
      }
      root.classList.add('is-shown')
      wake()
    }

    /* A click knocks it — a little swing and a half turn, either way. */
    const onDown = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      const dir = Math.random() < 0.5 ? -1 : 1
      spin += dir * 4.5
      twistV -= dir * 260
      wake()
    }

    const onLeave = () => root.classList.remove('is-shown')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="mascot" ref={rootRef} aria-hidden="true">
      <div className="mascot-swing" ref={swingRef}>
        <span className="mascot-ring" />
        <span className="mascot-chain" />
        <div className="mascot-fob" ref={fobRef}>
          <img className="mascot-logo" src={logoUrl} alt="" draggable="false" />
        </div>
      </div>
    </div>
  )
}

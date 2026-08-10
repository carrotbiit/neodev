import { useEffect, useRef } from 'react'

/**
 * Animated synthwave / retrowave background.
 *
 * A perspective grid floor that scrolls out of the screen toward the viewer,
 * with a banded gradient sun sitting on the horizon. Rendered on a canvas so
 * it stays cheap regardless of how many grid lines are on screen.
 */

const DEFAULT_COLORS = {
  /** Sky gradient, top of the canvas down to the horizon. */
  skyTop: '#1b0b38',
  skyBottom: '#2d1055',
  /** Ground beneath the horizon. */
  ground: '#210b3f',
  /** Vertical gradient painted across the sun, top to bottom. */
  sun: ['#ffd166', '#ff9f45', '#ff5f6d', '#f43b8f', '#c13bd6'],
  /** Darker ring drawn behind the sun. */
  sunRim: 'rgba(90, 30, 80, 0.55)',
  /** Grid lines and the glow they cast. */
  grid: '#d17fff',
  gridGlow: 'rgba(209, 127, 255, 0.75)',
  /** Haze that fades the grid out as it approaches the horizon. */
  haze: '#2d1055',
  /** Glow sitting on the horizon line itself. */
  horizonGlow: 'rgba(233, 106, 255, 0.06)',
}

const DEFAULTS = {
  speed: 1,
  size: { width: '100%', height: '100%' },
  horizon: 0.7,
  gridDensity: 14,
  sunSize: 0.3,
  lineWidth: 1.6,
  glow: 1,
}

function toCssSize(value) {
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * Paints the sun once onto an offscreen canvas. The sun never moves, so this
 * only re-runs on resize or when the colors change.
 */
function renderSun(radius, colors, dpr) {
  const rim = radius * 1.05
  const size = Math.ceil(rim * 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(size * dpr))
  canvas.height = Math.max(1, Math.ceil(size * dpr))

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx = size / 2
  const cy = size / 2
  const top = cy - radius
  const diameter = radius * 2

  // Darker ring peeking out from behind the disc.
  ctx.beginPath()
  ctx.arc(cx, cy, rim - radius * 0.02, 0, Math.PI * 2)
  ctx.lineWidth = radius * 0.05
  ctx.strokeStyle = colors.sunRim
  ctx.stroke()

  const gradient = ctx.createLinearGradient(0, top, 0, top + diameter)
  const stops = colors.sun
  stops.forEach((color, i) => {
    gradient.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), color)
  })

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Slice horizontal gaps out of the lower half: cuts thicken and the bands
  // between them thin out toward the bottom.
  ctx.globalCompositeOperation = 'destination-out'
  let y = top + diameter * 0.42
  let cut = diameter * 0.016
  let band = diameter * 0.072
  while (y < top + diameter) {
    ctx.fillRect(0, y, size, cut)
    y += cut + band
    cut *= 1.3
    band *= 0.92
  }
  ctx.globalCompositeOperation = 'source-over'

  return { canvas, size }
}

export default function SynthwaveBackground({
  /** Multiplier on how fast the floor rushes toward the viewer. */
  speed = DEFAULTS.speed,
  /** Partial override of the palette above. */
  colors: colorOverrides,
  /** `{ width, height }` — numbers are px, strings pass through as CSS. */
  size,
  /** Horizon position as a fraction of height (0 = top, 1 = bottom). */
  horizon = DEFAULTS.horizon,
  /** Roughly how many grid columns span the canvas at the bottom edge. */
  gridDensity = DEFAULTS.gridDensity,
  /** Sun radius as a fraction of the smaller canvas dimension. */
  sunSize = DEFAULTS.sunSize,
  /** Base grid stroke width in px (lines taper with distance). */
  lineWidth = DEFAULTS.lineWidth,
  /** Neon bloom strength, 0 disables it. */
  glow = DEFAULTS.glow,
  className,
  style,
  ...rest
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  // Live prop mirror so the animation loop never has to be torn down.
  const propsRef = useRef(null)
  propsRef.current = {
    speed,
    colors: { ...DEFAULT_COLORS, ...colorOverrides },
    horizon,
    gridDensity,
    sunSize,
    lineWidth,
    glow,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas.getContext('2d')

    let width = 0
    let height = 0
    let dpr = 1
    let sun = null
    let sunRadius = 0
    let sunKey = ''
    let phase = 0
    let last = performance.now()
    let frame = 0

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      const rect = container.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      sun = null
    }

    const draw = (now) => {
      frame = requestAnimationFrame(draw)

      const p = propsRef.current
      const c = p.colors
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!reduceMotion.matches) {
        // One unit of phase == one grid row passing the viewer.
        phase = (phase + delta * p.speed * 0.55) % 1
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const horizonY = height * p.horizon
      const cx = width / 2
      const radius = Math.min(width, height) * p.sunSize

      // Sky.
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY)
      sky.addColorStop(0, c.skyTop)
      sky.addColorStop(1, c.skyBottom)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, horizonY)

      // Ground.
      ctx.fillStyle = c.ground
      ctx.fillRect(0, horizonY, width, height - horizonY)

      // Sun, cached until size or palette changes.
      const key = `${radius}|${dpr}|${c.sun.join()}|${c.sunRim}`
      if (!sun || key !== sunKey) {
        sun = renderSun(radius, c, dpr)
        sunRadius = radius
        sunKey = key
      }
      const sunCenterY = horizonY - sunRadius * 0.73
      ctx.drawImage(
        sun.canvas,
        cx - sun.size / 2,
        sunCenterY - sun.size / 2,
        sun.size,
        sun.size,
      )

      // Knock back the part of the disc that dips below the horizon so it
      // reads as glow spilling onto the floor rather than a solid circle.
      ctx.globalAlpha = 0.6
      ctx.fillStyle = c.ground
      ctx.fillRect(0, horizonY, width, height - horizonY)
      ctx.globalAlpha = 1

      // Grid.
      const depth = height - horizonY
      // y(z) = horizonY + K / z, with z = 1 landing exactly on the bottom edge.
      const K = depth
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, horizonY, width, depth)
      ctx.clip()
      ctx.strokeStyle = c.grid
      ctx.lineCap = 'butt'
      if (p.glow > 0) {
        ctx.shadowColor = c.gridGlow
        ctx.shadowBlur = 8 * p.glow
      }

      // Columns: evenly spaced along the bottom edge, converging on the
      // vanishing point. Extra lines run past the edges so the fan fills the
      // corners.
      const columnGap = width / p.gridDensity
      const columns = Math.ceil((width * 2.5) / columnGap)
      ctx.lineWidth = Math.max(0.6, p.lineWidth * 0.7)
      ctx.beginPath()
      for (let j = -columns; j <= columns; j++) {
        const xBottom = cx + j * columnGap
        ctx.moveTo(cx, horizonY)
        ctx.lineTo(xBottom, height)
      }
      ctx.stroke()

      // Rows: fixed positions in depth, shifted by `phase` so they sweep down
      // and off the bottom of the screen.
      for (let i = 0; i < 220; i++) {
        const z = i + 1 - phase
        if (z <= 0) continue
        const y = horizonY + K / z
        if (y > height) continue
        if (y - horizonY < 0.4) break
        ctx.globalAlpha = Math.min(1, 0.25 + 1.4 / z)
        ctx.lineWidth = Math.max(0.5, p.lineWidth / z)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()

      // Haze fading the grid into the horizon.
      const haze = ctx.createLinearGradient(0, horizonY, 0, horizonY + depth * 0.45)
      haze.addColorStop(0, c.haze)
      haze.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.globalAlpha = 0.85
      ctx.fillStyle = haze
      ctx.fillRect(0, horizonY, width, depth * 0.45)
      ctx.globalAlpha = 1

      // Glow riding the horizon line.
      if (p.glow > 0) {
        const bloom = radius * 0.5 * p.glow
        const line = ctx.createLinearGradient(0, horizonY - bloom, 0, horizonY + bloom)
        line.addColorStop(0, 'rgba(0, 0, 0, 0)')
        line.addColorStop(0.5, c.horizonGlow)
        line.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = line
        ctx.fillRect(cx - radius * 2.2, horizonY - bloom, radius * 4.4, bloom * 2)
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const { width, height } = { ...DEFAULTS.size, ...size }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: toCssSize(width),
        height: toCssSize(height),
        overflow: 'hidden',
        lineHeight: 0,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}

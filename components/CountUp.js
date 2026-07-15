'use client'

import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = value || 0
    const duration = 700
    const startTime = performance.now()

    let raf
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + (end - start) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        prevValue.current = end
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{display.toFixed(decimals)}{suffix}</>
}

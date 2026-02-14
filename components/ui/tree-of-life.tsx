"use client"

import { useEffect, useRef } from "react"

export function TreeOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const sephiroth = [
      { x: 0.5, y: 0.08, name: "Kether" },
      { x: 0.3, y: 0.2, name: "Chokmah" },
      { x: 0.7, y: 0.2, name: "Binah" },
      { x: 0.3, y: 0.4, name: "Chesed" },
      { x: 0.7, y: 0.4, name: "Geburah" },
      { x: 0.5, y: 0.5, name: "Tiphareth" },
      { x: 0.3, y: 0.65, name: "Netzach" },
      { x: 0.7, y: 0.65, name: "Hod" },
      { x: 0.5, y: 0.78, name: "Yesod" },
      { x: 0.5, y: 0.95, name: "Malkuth" },
    ]

    const paths = [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 4],
      [1, 5],
      [2, 5],
      [3, 4],
      [3, 5],
      [4, 5],
      [3, 6],
      [4, 7],
      [5, 6],
      [5, 7],
      [5, 8],
      [6, 7],
      [6, 8],
      [7, 8],
      [8, 9],
    ]

    let time = 0

    const animate = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      paths.forEach(([from, to], i) => {
        const s1 = sephiroth[from]
        const s2 = sephiroth[to]

        const gradient = ctx.createLinearGradient(s1.x * w, s1.y * h, s2.x * w, s2.y * h)

        const alpha = 0.2 + Math.sin(time * 0.02 + i * 0.5) * 0.1
        gradient.addColorStop(0, `rgba(255, 149, 0, ${alpha})`)
        gradient.addColorStop(1, `rgba(255, 149, 0, ${alpha * 0.5})`)

        ctx.strokeStyle = gradient
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(s1.x * w, s1.y * h)
        ctx.lineTo(s2.x * w, s2.y * h)
        ctx.stroke()
      })

      sephiroth.forEach((s, i) => {
        const x = s.x * w
        const y = s.y * h
        const radius = 8 + Math.sin(time * 0.03 + i) * 2

        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3)
        glow.addColorStop(0, "rgba(255, 149, 0, 0.4)")
        glow.addColorStop(1, "rgba(255, 149, 0, 0)")
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FF9500"
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#FFB340"
        ctx.beginPath()
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
      })

      time++
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" style={{ mixBlendMode: "screen" }} />
  )
}
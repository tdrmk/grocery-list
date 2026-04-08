import { useRef, useState } from 'react'

const AUTO_CLOSE_MS = 8000
const BUTTON_WIDTH = 64 // w-16 = 4rem = 64px

export default function SwipeableRow({ actions, onClick, children }) {
  const [revealWidth, setRevealWidth] = useState(0)
  const [animate, setAnimate] = useState(false)
  const revealRef = useRef(0) // tracks current value without closure staleness
  const startX = useRef(0)
  const startY = useRef(0)
  const hasSwiped = useRef(false)
  const isDragging = useRef(false)
  const isOpen = useRef(false)
  const timeoutRef = useRef(null)

  const maxWidth = actions.length * BUTTON_WIDTH

  function reveal(width) {
    revealRef.current = width
    setRevealWidth(width)
  }

  function snapOpen() {
    setAnimate(true)
    reveal(maxWidth)
    isOpen.current = true
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(snapClose, AUTO_CLOSE_MS)
  }

  function snapClose() {
    setAnimate(true)
    reveal(0)
    isOpen.current = false
    clearTimeout(timeoutRef.current)
  }

  function onPointerDown(e) {
    hasSwiped.current = false
    isDragging.current = false
    startX.current = e.clientX
    startY.current = e.clientY
    setAnimate(false)
    clearTimeout(timeoutRef.current)
  }

  function onPointerMove(e) {
    const deltaX = e.clientX - startX.current
    const deltaY = e.clientY - startY.current

    if (!isDragging.current) {
      if (Math.abs(deltaX) < 5) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) return
      isDragging.current = true
      hasSwiped.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const base = isOpen.current ? maxWidth : 0
    const next = Math.min(maxWidth, Math.max(0, base - deltaX))
    reveal(next)
  }

  function onPointerUp() {
    if (!isDragging.current) return
    isDragging.current = false

    revealRef.current > maxWidth * 0.5 ? snapOpen() : snapClose()
  }

  function handleClick() {
    if (hasSwiped.current) return
    if (isOpen.current) { snapClose(); return }
    onClick?.()
  }

  return (
    <div
      className="relative overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
    >
      {/* Content — always full width, never moves */}
      <div>
        {children}
      </div>

      {/* Actions — slide in from the right, overlaying the content */}
      <div
        style={{
          transform: `translateX(${maxWidth - revealWidth}px)`,
          transition: animate ? 'transform 200ms ease' : 'none',
        }}
        className="absolute inset-y-0 right-0 flex"
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); snapClose(); action.onAction() }}
            style={{ width: BUTTON_WIDTH }}
            className={`flex flex-col items-center justify-center gap-0.5 shrink-0 text-white text-sm font-medium ${action.color}`}
          >
            <span className="text-lg leading-none">{action.icon}</span>
            {action.label && <span className="text-xs">{action.label}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

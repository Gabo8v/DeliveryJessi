import { useState, useRef, useEffect, useCallback } from 'react'

const CLOSE_THRESHOLD = 0.3
const VELOCITY_THRESHOLD = 0.5

export default function BottomSheet({ show, onClose, children, height }) {
  const sheetRef = useRef(null)
  const [translateY, setTranslateY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const dragStart = useRef({ y: 0, time: 0 })

  const reset = useCallback(() => {
    setTranslateY(0)
    setDragging(false)
    setClosing(false)
  }, [])

  useEffect(() => {
    if (!show) reset()
  }, [show, reset])

  function handleDragStart(clientY) {
    dragStart.current = { y: clientY, time: Date.now() }
    setDragging(true)
  }

  function handleDragMove(clientY) {
    if (!dragging) return
    const delta = Math.max(0, clientY - dragStart.current.y)
    setTranslateY(delta)
  }

  function handleDragEnd() {
    if (!dragging) return
    const dt = Date.now() - dragStart.current.time
    const dy = translateY
    const velocity = dt > 0 ? dy / dt : 0
    const sheetH = sheetRef.current?.offsetHeight || window.innerHeight
    if (dy > sheetH * CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      setClosing(true)
      setTranslateY(sheetH)
      setTimeout(onClose, 280)
    } else {
      setTranslateY(0)
    }
    setDragging(false)
  }

  useEffect(() => {
    if (!dragging) return
    function onMove(e) { handleDragMove(e.clientY) }
    function onUp() { handleDragEnd() }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  if (!show && !closing) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: show && !closing ? 'rgba(61, 44, 46, 0.5)' : 'transparent',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: closing ? 'none' : 'background 0.3s',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={sheetRef}
        style={{
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxHeight: height || '85vh',
          transform: `translateY(${translateY}px)`,
          transition: dragging || closing ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => { e.preventDefault(); handleDragMove(e.touches[0].clientY) }}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          style={{
            padding: '10px 0 4px',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 36, height: 4,
            background: dragging ? 'var(--primary)' : 'var(--border)',
            borderRadius: 4, margin: '0 auto',
            transition: 'background 0.15s',
            transform: dragging ? 'scaleY(1.5)' : 'scaleY(1)',
          }} />
        </div>

        <div style={{
          overflowY: 'auto',
          padding: '4px 16px calc(16px + env(safe-area-inset-bottom, 16px))',
          WebkitOverflowScrolling: 'touch',
          flex: 1,
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

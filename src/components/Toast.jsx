import { useState, useEffect } from 'react'

export default function Toast({ eventTarget }) {
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      setMsg(e.detail)
      setTimeout(() => setMsg(null), 2500)
    }
    eventTarget.addEventListener('toast', handler)
    return () => eventTarget.removeEventListener('toast', handler)
  }, [eventTarget])

  if (!msg) return null

  return (
    <div style={{
      position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--fg)', color: '#fff',
      padding: '12px 24px', borderRadius: 'var(--radius-input)',
      fontSize: 14, fontWeight: 500,
      zIndex: 9998, whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

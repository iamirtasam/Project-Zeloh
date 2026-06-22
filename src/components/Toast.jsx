import { useState, useCallback, useRef } from 'react'

let _show = null
export function useToast() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const show = useCallback((msg, type = 'success') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  return { toasts, show }
}

export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, width: '90%' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 18px', borderRadius: 50, fontWeight: 700, fontSize: 13, textAlign: 'center',
          background: t.type === 'error' ? '#ef4444' : t.type === 'warn' ? '#F5C518' : '#1a1a1a',
          color: t.type === 'warn' ? '#1a1a1a' : 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          animation: 'fadeInDown 0.2s ease',
        }}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes fadeInDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}

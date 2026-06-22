import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function SkelRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0, animation: 'shim 1.4s ease-in-out infinite' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 12, borderRadius: 5, background: '#F3F4F6', width: '85%', animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', width: '40%', animation: 'shim 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/notifications-history`)
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Notifications</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '12px 14px' }}>
        {loading ? (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
            <SkelRow /><SkelRow /><SkelRow />
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 14px' }}>
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="#D1D5DB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>No notifications yet</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Platform announcements will appear here</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden' }}>
            {items.map((n, i) => (
              <div key={n.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF9E7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: '#111', fontWeight: 500, lineHeight: 1.5 }}>{n.notification_text}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{fmtDate(n.created_at)}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {i < items.length - 1 && <div style={{ height: 1, background: '#F9FAFB', margin: '0 16px' }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

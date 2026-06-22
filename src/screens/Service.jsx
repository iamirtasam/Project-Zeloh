import { useState, useEffect } from 'react'
import BottomNav from '../components/BottomNav'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

// H12 — only allow http/https service contact URLs to be opened.
function openSafely(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch { /* invalid URL — ignore */ }
}

function HeadphonesIcon({ color = '#1a1a1a', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 18v-6a9 9 0 0118 0v6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="14" width="4" height="6" rx="2" stroke={color} strokeWidth="1.8" />
      <rect x="17" y="14" width="4" height="6" rx="2" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

function SkelRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0, animation: 'shim 1.4s ease-in-out infinite' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 13, borderRadius: 5, background: '#F3F4F6', width: '60%', animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', width: '40%', animation: 'shim 1.4s ease-in-out infinite' }} />
      </div>
      <div style={{ width: 64, height: 30, borderRadius: 50, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
    </div>
  )
}

export default function Service() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch(`${API}/services`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 90 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#111' }}>Service</span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <><SkelRow /><SkelRow /></>
        ) : services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <HeadphonesIcon color="#D1D5DB" size={48} />
            <p style={{ fontWeight: 700, color: '#6B7280', marginTop: 14 }}>No support agents available</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5 }}>Please check back later</p>
          </div>
        ) : (
          services.map(svc => (
            <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HeadphonesIcon color="#1a1a1a" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 2 }}>{svc.title}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>Available: 00:00 - 23:59</p>
              </div>
              <button
                onClick={() => openSafely(svc.contact)}
                style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '8px 16px', fontWeight: 700, fontSize: 12, color: '#1a1a1a', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Contact
              </button>
            </div>
          ))
        )}

        {/* Static email support row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="#1a1a1a" strokeWidth="1.8"/>
              <path d="M2 7l10 7 10-7" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 2 }}>Email Support</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>support@zeloh.site</p>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>We reply within 2 hours</p>
          </div>
          <button
            onClick={() => window.open('mailto:support@zeloh.site')}
            style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '8px 16px', fontWeight: 700, fontSize: 12, color: '#1a1a1a', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Email
          </button>
        </div>
      </div>

      <BottomNav active="service" />

      {/* Floating button */}
      {services.length > 0 && (
        <button
          onClick={() => openSafely(services[0].contact)}
          style={{ position: 'fixed', bottom: 84, right: 20, width: 52, height: 52, borderRadius: '50%', background: GOLD, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(245,197,24,0.5)', cursor: 'pointer', zIndex: 30 }}
        >
          <HeadphonesIcon color="white" size={22} />
        </button>
      )}
    </div>
  )
}

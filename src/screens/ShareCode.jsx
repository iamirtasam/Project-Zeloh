import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'
const APP_BASE = 'https://zeloh.site/pages/login/reg'

export default function ShareCode() {
  const navigate = useNavigate()
  const [code, setCode]           = useState('')
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState('')
  const toastRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setCode((d.user || d).invite_code || '')
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const inviteLink = `${APP_BASE}?lang=en&id=2&invitecode=${code}`
  const inviteMsg  = `Join Zeloh and start earning daily profits by investing in movies! Use my invite code ${code} to sign up and we both get a bonus!\n${inviteLink}`

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2200)
  }

  function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => showToast('Copied!'))
  }

  function shareURL(url) { window.open(url, '_blank', 'noopener') }

  const SOCIALS = [
    { label: 'WhatsApp', bg: '#25D366', char: 'W', action: () => shareURL(`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`) },
    { label: 'Telegram', bg: '#2AABEE', char: 'T', action: () => shareURL(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(inviteMsg)}`) },
    { label: 'Facebook', bg: '#1877F2', char: 'F', action: () => shareURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`) },
    { label: 'Twitter/X', bg: '#000000', char: 'X', action: () => shareURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(inviteMsg)}`) },
    { label: 'Instagram', bg: '#C13584', char: 'IG', action: () => copyText(inviteMsg, 'Message copied! Paste in Instagram.') },
    { label: 'Copy Link', bg: '#6B7280', char: null, action: () => copyText(inviteLink, 'Link copied!') },
  ]

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Share Code</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '14px' }}>
        {/* Invite banner */}
        <div style={{ background: 'linear-gradient(135deg,#E0A800 0%,#F5C518 50%,#FFE066 100%)', borderRadius: 20, padding: '28px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden', marginBottom: 18 }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -15, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          {/* Logo placeholder */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.15)', borderRadius: 50, padding: '6px 16px', marginBottom: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="white" stroke="white" strokeWidth="1"/></svg>
            <span style={{ fontWeight: 900, fontSize: 15, color: 'white', letterSpacing: 1 }}>ZELOH</span>
          </div>
          <p style={{ fontWeight: 900, fontSize: 18, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
            Invite friends &amp; earn together!
          </p>
        </div>

        {/* Code display */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Your invitation code</p>
        <div style={{ textAlign: 'center', letterSpacing: 10, fontSize: 28, fontWeight: 900, color: GOLD, marginBottom: 16 }}>
          {loading ? '· · · · · ·' : code.split('').join(' ')}
        </div>

        {/* Invite link box */}
        <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 11, color: '#6B7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {loading ? 'Loading...' : inviteLink}
          </span>
        </div>

        {/* Two copy buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => copyText(inviteLink, 'Link copied!')}
            style={{ flex: 1, padding: '12px 0', borderRadius: 50, background: 'white', border: `2px solid ${GOLD}`, color: GOLD, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Copy Invite Link
          </button>
          <button
            onClick={() => copyText(code, 'Code copied!')}
            style={{ flex: 1, padding: '12px 0', borderRadius: 50, background: GOLD, border: 'none', color: '#1a1a1a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Copy Invite Code
          </button>
        </div>

        {/* Share via */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Share via</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {SOCIALS.map(s => (
            <button key={s.label} onClick={s.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.char === null ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <span style={{ color: 'white', fontWeight: 900, fontSize: s.char === 'IG' ? 12 : 16 }}>{s.char}</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: 'white', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

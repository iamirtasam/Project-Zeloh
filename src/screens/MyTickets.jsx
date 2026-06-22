import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function useNow(interval = 60000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

function getTimeUntilMidnightPST() {
  const nowUTC = Date.now()
  const nowPST = new Date(nowUTC + 5 * 60 * 60 * 1000)
  const todayPST = nowPST.toISOString().slice(0, 10)
  const nextMidnight = new Date(`${todayPST}T00:00:00+05:00`)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  const diff = nextMidnight.getTime() - nowUTC
  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor((diff % 3600000) / 60000)
  return { diff, hours, mins }
}

function MidnightCountdown() {
  const now = useNow(60000)
  const { diff, hours, mins } = getTimeUntilMidnightPST()
  if (diff <= 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite' }}>
        Releasing...
      </span>
    )
  }
  const urgent = diff < 3600000
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 1 }}>Profit at 12:00 AM</p>
      <span style={{ fontSize: 12, fontWeight: 800, color: urgent ? '#ef4444' : GOLD }}>
        {hours}h {mins}m
      </span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '14px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 60, height: 80, borderRadius: 10, background: '#F3F4F6', flexShrink: 0, animation: 'shim 1.4s ease-in-out infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 13, borderRadius: 5, background: '#F3F4F6', width: '70%', animation: 'shim 1.4s ease-in-out infinite' }} />
          <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', width: '50%', animation: 'shim 1.4s ease-in-out infinite' }} />
          <div style={{ height: 10, borderRadius: 5, background: '#F3F4F6', width: '40%', animation: 'shim 1.4s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default function MyTickets() {
  const navigate = useNavigate()
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/my-tickets`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setTickets(d.tickets || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const active    = tickets.filter(t => t.status === 'active')
  const completed = tickets.filter(t => t.status === 'completed')

  // Compute PST midnight window for today's earnings
  const nowUTC2 = Date.now()
  const nowPST2 = new Date(nowUTC2 + 5 * 60 * 60 * 1000)
  const todayPST2 = nowPST2.toISOString().slice(0, 10)
  const startOfTodayUTC2 = new Date(`${todayPST2}T00:00:00+05:00`)
  const todayEarnings = completed
    .filter(t => t.paid_at && new Date(t.paid_at) >= startOfTodayUTC2)
    .reduce((s, t) => s + parseFloat(t.profit_amount || 0), 0)

  const fundsToRelease = active.reduce((s, t) => s + parseFloat(t.total_return || 0), 0)
  const todayTeamEarnings = 0

  const shown = tab === 'active' ? active : completed

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`
        @keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>My Tickets</span>
        <div style={{ width: 22 }} />
      </div>

      {/* Summary card */}
      <div style={{ background: 'linear-gradient(135deg,#E0A800,#F5C518)', padding: '20px 18px' }}>
        <p style={{ fontWeight: 900, fontSize: 28, color: 'white', textAlign: 'center', marginBottom: 4 }}>
          ${fmt(todayEarnings)}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 14 }}>
          Today's Ticket Earnings
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+${fmt(todayTeamEarnings)}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>Today's Team Earnings</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>+${fmt(fundsToRelease)}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>Funds to be released</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'white', borderBottom: '1px solid #F3F4F6' }}>
        {[['active','Active Tickets'],['completed','Completed Tickets']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '9px 0', borderRadius: 50, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: tab === key ? GOLD : '#F3F4F6',
            color: tab === key ? '#1a1a1a' : '#9CA3AF',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px' }}>
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z" stroke="#D1D5DB" strokeWidth="1.6"/>
            </svg>
            <p style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
              {tab === 'active' ? 'No active tickets' : 'No completed tickets yet'}
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: tab === 'active' ? 16 : 0 }}>
              {tab === 'active' ? 'Buy movie tickets to start earning' : ''}
            </p>
            {tab === 'active' && (
              <button onClick={() => navigate('/')} style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#1a1a1a' }}>
                Browse Movies
              </button>
            )}
          </div>
        ) : (
          shown.map(ticket => {
            const isActive = ticket.status === 'active'
            const shortId  = 'T' + (ticket.id || '').replace(/-/g,'').slice(0,8).toUpperCase()
            return (
              <div key={ticket.id} style={{ background: 'white', borderRadius: 16, padding: '13px 13px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{shortId}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDateTime(ticket.booked_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 60, height: 80, borderRadius: 10, background: 'linear-gradient(135deg,#1a237e,#F5C518)', flexShrink: 0, overflow: 'hidden' }}>
                    {ticket.poster_url && <img src={ticket.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.movie_title}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Tickets purchased: ×{ticket.quantity}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Fare: ${fmt(ticket.price)}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>Voucher: 0 sheets</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid #F9FAFB' }}>
                  {isActive ? (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF7ED', color: '#F97316', borderRadius: 50, padding: '3px 10px' }}>
                      In Progress
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#16a34a', borderRadius: 50, padding: '3px 10px' }}>
                      Completed
                    </span>
                  )}
                  {isActive ? (
                    <div style={{ background: '#FFF7ED', borderRadius: 50, padding: '4px 10px' }}>
                      <MidnightCountdown />
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>
                      Earnings: +${fmt(ticket.profit_amount)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', padding: '4px 0 16px' }}>
        Profit distributed daily at 12:00 AM Pakistan time
      </p>
    </div>
  )
}

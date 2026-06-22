import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import BottomNav from '../components/BottomNav'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

import { useStatusBarColor } from '../hooks/useStatusBarColor'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n, hidden) {
  if (hidden) return '****'
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function authFetch(path) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async r => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.message || `Error ${r.status}`)
    return data
  })
}

function getTimeUntilMidnightPST() {
  const nowUTC = Date.now()
  const nowPST = new Date(nowUTC + 5 * 60 * 60 * 1000)
  const todayPST = nowPST.toISOString().slice(0, 10)
  const nextMidnight = new Date(`${todayPST}T00:00:00+05:00`)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  const diff = nextMidnight.getTime() - nowUTC
  if (diff <= 0) return { expired: true, h: 0, m: 0, total: 0 }
  return { expired: false, h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), total: diff }
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · '
    + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: d.toISOString().slice(0, 10),
      amount: 0,
    })
  }
  return days
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function RefreshIcon({ spinning }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }}>
      <path d="M23 4v6h-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 20v-6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowUpTrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 6 23 6 23 12" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TicketEmptyIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const TX_CONFIG = {
  deposit:         { label: 'Recharge',        bg: '#dcfce7', color: '#16a34a', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m0 0l-5-5m5 5l5-5" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  withdrawal:      { label: 'Withdrawal',       bg: '#fee2e2', color: '#dc2626', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5m0 0l-5 5m5-5l5 5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ticket_purchase: { label: 'Ticket Purchase',  bg: '#dbeafe', color: '#2563eb', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z" stroke="#2563eb" strokeWidth="1.6"/></svg> },
  ticket_profit:   { label: 'Profit Received',  bg: '#fef9c3', color: '#b45309', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#b45309" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  team_earning:    { label: 'Team Earning',     bg: '#f3e8ff', color: '#7c3aed', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#7c3aed" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  adjustment:      { label: 'Adjustment',       bg: '#f3f4f6', color: '#6b7280', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="4" y1="21" x2="4" y2="14" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="4" y1="10" x2="4" y2="3" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="21" x2="12" y2="12" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="8" x2="12" y2="3" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="20" y1="21" x2="20" y2="16" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="20" y1="12" x2="20" y2="3" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="14" x2="7" y2="14" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="8" x2="15" y2="8" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/><line x1="17" y1="16" x2="23" y2="16" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/></svg> },
}

// ── Countdown timer component ─────────────────────────────────────────────────
function Countdown() {
  const [remaining, setRemaining] = useState(() => getTimeUntilMidnightPST())

  useEffect(() => {
    const id = setInterval(() => setRemaining(getTimeUntilMidnightPST()), 60000)
    return () => clearInterval(id)
  }, [])

  if (remaining.expired) {
    return (
      <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, animation: 'pulse 1.5s ease-in-out infinite' }}>
        Releasing...
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </span>
    )
  }

  const urgent = remaining.total < 3600000
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 1 }}>Profit at 12:00 AM</p>
      <span style={{ color: urgent ? '#ef4444' : GOLD, fontSize: 13, fontWeight: 700 }}>
        {remaining.h}h {remaining.m}m
      </span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 16, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.25)', animation: 'shimmer 1.4s ease-in-out infinite' }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
    </div>
  )
}

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shimmerd 1.4s ease-in-out infinite' }}>
      <style>{`@keyframes shimmerd { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Assets() {
  const navigate = useNavigate()
  useStatusBarColor('#E0A800')
  const [hidden, setHidden]         = useState(false)
  const [user, setUser]             = useState(null)
  const [history, setHistory]       = useState([])
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [meData, histData, tickData] = await Promise.all([
        authFetch('/me'),
        authFetch('/account-history'),
        authFetch('/my-tickets'),
      ])
      setUser(meData.user || meData)
      setHistory(histData.history || histData.transactions || [])
      setTickets(tickData.tickets || [])
    } catch { /* silently fail on refresh */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── derived values ──────────────────────────────────────────
  const available   = parseFloat(user?.balance || 0)
  const locked      = parseFloat(user?.ticket_quota || 0)
  const totalAssets = available + locked

  const activeTickets = tickets.filter(t => t.status === 'active').slice(0, 3)

  // today's earnings from ticket_profit transactions — compare in PKT (UTC+5) to
  // match the server's midnight-PKT distribution schedule
  const todayStrPKT = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const todayEarnings = history
    .filter(h => {
      if (h.type !== 'ticket_profit') return false
      const txPKT = new Date(new Date(h.created_at).getTime() + 5 * 60 * 60 * 1000)
      return txPKT.toISOString().slice(0, 10) === todayStrPKT
    })
    .reduce((s, h) => s + parseFloat(h.amount || 0), 0)

  // tickets bought today (PKT)
  const ticketsBoughtToday = tickets
    .filter(t => {
      if (!t.booked_at) return false
      const bookedPKT = new Date(new Date(t.booked_at).getTime() + 5 * 60 * 60 * 1000)
      return bookedPKT.toISOString().slice(0, 10) === todayStrPKT
    }).length

  // guaranteed return from all active tickets
  const guaranteedAmount = tickets
    .filter(t => t.status === 'active')
    .reduce((s, t) => s + parseFloat(t.total_return || 0), 0)

  // 7-day chart data — bucket by PKT date to match server schedule
  const chartData = (() => {
    const days = getLast7Days()
    history
      .filter(h => h.type === 'ticket_profit')
      .forEach(h => {
        if (!h.created_at) return
        const txPKTDate = new Date(new Date(h.created_at).getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
        const day = days.find(d => d.dateStr === txPKTDate)
        if (day) day.amount = parseFloat((day.amount + parseFloat(h.amount || 0)).toFixed(2))
      })
    return days
  })()

  const recentTx = history.slice(0, 5)

  // ── render ──────────────────────────────────────────────────
  return (
    <div
      style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', position: 'relative', paddingBottom: 90 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Golden top section ── */}
      <div
        style={{
          background: 'linear-gradient(160deg, #E0A800 0%, #F5C518 45%, #FFE066 100%)',
          paddingTop: 'env(safe-area-inset-top, 16px)',
          paddingBottom: 36,
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
          <div style={{ width: 32 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white' }}>My Assets</span>
          <button onClick={() => load(true)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <RefreshIcon spinning={refreshing} />
          </button>
        </div>

        {/* Total assets */}
        <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Skel w={160} h={44} r={10} /></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: 'white', letterSpacing: -1 }}>
                {hidden ? '****' : fmt(totalAssets)}
              </span>
              <button onClick={() => setHidden(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 4 }}>
                <EyeIcon open={!hidden} />
              </button>
            </div>
          )}
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>My total assets</p>
        </div>

        {/* Stats rows */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
                Available: <strong>${loading ? '...' : fmt(available, hidden)}</strong>
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
              Ticket quota: <strong>${loading ? '...' : fmt(locked, hidden)}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
                Locked assets: <strong>${loading ? '...' : fmt(locked, hidden)}</strong>
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
              Voucher: <strong>0 sheets</strong>
            </span>
          </div>
        </div>

        {/* Recharge / Withdraw buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '20px 16px 0' }}>
          <button
            onClick={() => navigate('/recharge')}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 50, border: 'none',
              background: '#1a1a1a', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Recharge
          </button>
          <button
            onClick={() => navigate('/withdraw')}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 50,
              background: 'transparent', border: '2px solid white',
              color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* ── White content area ── */}
      <div style={{ padding: '16px 14px 0' }}>

        {/* ── Movie Ticket Earnings card ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Movie Ticket Earnings</span>
            <button
              onClick={() => navigate('/my-tickets')}
              style={{ background: 'none', border: 'none', color: GOLD, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              See details &gt;
            </button>
          </div>

          {/* Two stat boxes */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><SkelDark w={80} h={32} r={8} /></div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: GOLD }}>${fmt(todayEarnings, hidden)}</span>
                  {todayEarnings > 0 && <ArrowUpTrendIcon />}
                </div>
              )}
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Today's earnings</p>
            </div>
            <div style={{ width: 1, background: '#F3F4F6', margin: '0 4px' }} />
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              {loading ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><SkelDark w={100} h={14} r={6} /></div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><SkelDark w={120} h={14} r={6} /></div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    Tickets bought today: <strong style={{ color: '#111' }}>{ticketsBoughtToday}</strong>
                  </p>
                  <p style={{ fontSize: 12, color: '#374151' }}>
                    Guaranteed Amount: <strong style={{ color: '#111' }}>{hidden ? '****' : `$${fmt(guaranteedAmount)}`}</strong>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: 110 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '100%', padding: '0 4px' }}>
                {[40, 60, 30, 80, 50, 70, 45].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: '#F3F4F6' }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 11 }}
                    formatter={v => [`$${v.toFixed(2)}`, 'Earnings']}
                  />
                  <Area type="monotone" dataKey="amount" stroke={GOLD} strokeWidth={2.5} fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: GOLD }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Active Tickets ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Active Tickets</span>
            <button
              onClick={() => navigate('/my-tickets')}
              style={{ background: 'none', border: 'none', color: GOLD, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              View All &gt;
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 52, height: 68, borderRadius: 8, background: '#F3F4F6' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <SkelDark w="70%" h={13} r={6} />
                    <SkelDark w="50%" h={11} r={6} />
                    <SkelDark w="40%" h={11} r={6} />
                  </div>
                  <SkelDark w={52} h={36} r={8} />
                </div>
              ))}
            </div>
          ) : activeTickets.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: '32px 16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><TicketEmptyIcon /></div>
              <p style={{ fontWeight: 700, color: '#6B7280', fontSize: 14, marginBottom: 4 }}>No active tickets</p>
              <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 16 }}>Browse movies to invest</p>
              <button
                onClick={() => navigate('/')}
                style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#1a1a1a' }}
              >
                Go to Home
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTickets.map((t, idx) => {
                const gradients = [
                  'linear-gradient(135deg,#667eea,#764ba2)',
                  'linear-gradient(135deg,#f97316,#ef4444)',
                  'linear-gradient(135deg,#06b6d4,#3b82f6)',
                ]
                const profitPct = parseFloat(t.profit_percent || 3)
                const profitAmt = parseFloat(t.profit_amount || 0)
                return (
                  <div
                    key={t.id}
                    style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div style={{ width: 52, height: 68, borderRadius: 8, overflow: 'hidden', background: gradients[idx % gradients.length], flexShrink: 0 }}>
                      {t.poster_url && (
                        <img
                          src={t.poster_url}
                          alt={t.movie_title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.movie_title}
                      </p>
                      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>
                        ${fmt(t.price)} locked
                      </p>
                      <p style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>
                        +{profitPct}% = +${fmt(profitAmt)}
                      </p>
                    </div>
                    <Countdown expiryAt={t.expiry_at} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Recent Transactions ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Recent Transactions</span>
            <button
              onClick={() => navigate('/account-record')}
              style={{ background: 'none', border: 'none', color: GOLD, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              View All &gt;
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            {loading ? (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <SkelDark w="55%" h={12} r={5} />
                      <SkelDark w="35%" h={10} r={5} />
                    </div>
                    <SkelDark w={60} h={14} r={5} />
                  </div>
                ))}
              </div>
            ) : recentTx.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ color: '#9CA3AF', fontSize: 13 }}>No transactions yet</p>
              </div>
            ) : (
              recentTx.map((tx, i) => {
                const cfg = TX_CONFIG[tx.type] || TX_CONFIG.adjustment
                const amt = parseFloat(tx.amount || 0)
                const positive = amt >= 0
                return (
                  <div key={tx.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: cfg.bg, color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{cfg.label}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{fmtDate(tx.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: positive ? '#16a34a' : '#dc2626' }}>
                          {positive ? '+' : ''}${hidden ? '****' : Math.abs(amt).toFixed(2)}
                        </span>
                        {tx.status === 'pending' && (
                          <div style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 50, padding: '1px 6px' }}>
                              Pending
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {i < recentTx.length - 1 && (
                      <div style={{ height: 1, background: '#F9FAFB', margin: '0 14px' }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      <BottomNav active="assets" />
    </div>
  )
}

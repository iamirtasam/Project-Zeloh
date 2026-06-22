import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

const LEVELS = [
  { level: 0, name: 'Starter', min_deposit: 0,     min_referrals: 0,  tickets_day: 2,    profit_pct: 3  },
  { level: 1, name: 'VIP 1',  min_deposit: 100,   min_referrals: 0,  tickets_day: 100,  profit_pct: 5  },
  { level: 2, name: 'VIP 2',  min_deposit: 500,   min_referrals: 1,  tickets_day: 200,  profit_pct: 8  },
  { level: 3, name: 'VIP 3',  min_deposit: 2000,  min_referrals: 3,  tickets_day: 500,  profit_pct: 12 },
  { level: 4, name: 'VIP 4',  min_deposit: 5000,  min_referrals: 5,  tickets_day: 2000, profit_pct: 15 },
  { level: 5, name: 'VIP 5',  min_deposit: 10000, min_referrals: 10, tickets_day: 5000, profit_pct: 20 },
]

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtInt(n) { return Number(n || 0).toLocaleString('en-US') }

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.35)', animation: 'shim 1.4s ease-in-out infinite' }} />
}

function ProgressBar({ pct, label }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 50, height: 7, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: 'white', borderRadius: 50, transition: 'width 0.5s ease' }} />
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{label}</p>
    </div>
  )
}

export default function Membership() {
  const navigate = useNavigate()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setUser(d.user || d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const level      = user ? Math.min(user.membership_level || 0, 5) : 0
  const deposited  = parseFloat(user?.total_deposited || 0)
  const qualRefs   = user?.qualified_referrals || 0
  const currentDef = LEVELS[level]
  const nextDef    = level < 5 ? LEVELS[level + 1] : null

  const depPct = nextDef && nextDef.min_deposit > 0
    ? Math.min(100, (deposited / nextDef.min_deposit) * 100)
    : 100
  const refPct = nextDef && nextDef.min_referrals > 0
    ? Math.min(100, (qualRefs / nextDef.min_referrals) * 100)
    : 100

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Membership Level</span>
        <div style={{ width: 22 }} />
      </div>

      <div style={{ padding: '14px' }}>

        {/* Current level card */}
        <div style={{ background: 'linear-gradient(135deg,#E0A800,#F5C518,#FFE066)', borderRadius: 18, padding: '20px 18px', marginBottom: 14 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkelDark w={80} h={28} r={8} />
              <SkelDark w="100%" h={10} r={5} />
              <SkelDark w={160} h={11} r={5} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 26, color: 'white' }}>LV {level}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{currentDef.name}</span>
                  <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.18)', color: 'white', borderRadius: 50, padding: '2px 8px', fontWeight: 700 }}>
                    {currentDef.profit_pct}% per ticket
                  </span>
                </div>
              </div>

              {level < 5 ? (
                <div style={{ marginTop: 12 }}>
                  <ProgressBar
                    pct={depPct}
                    label={`$${fmt(deposited)} / $${fmt(nextDef.min_deposit)} deposited`}
                  />
                  {nextDef.min_referrals > 0 && (
                    <ProgressBar
                      pct={refPct}
                      label={`${qualRefs} / ${nextDef.min_referrals} qualified referrals (VIP1+)`}
                    />
                  )}
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                    Progress toward {nextDef.name}
                  </p>
                </div>
              ) : (
                <p style={{ fontWeight: 700, color: 'white', fontSize: 14, marginTop: 12 }}>You have reached the highest level!</p>
              )}
            </>
          )}
        </div>

        {/* Level dots */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 12px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {LEVELS.map((l, i) => {
              const past    = i < level
              const current = i === level
              const future  = i > level
              return (
                <div key={l.level} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: current || past ? GOLD : 'transparent',
                    border: future ? '2px solid #D1D5DB' : `2px solid ${GOLD}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {past && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 10, color: future ? '#9CA3AF' : GOLD, fontWeight: 700 }}>LV{l.level}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* How to level up */}
        <p style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 10 }}>How to Level Up</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {LEVELS.map(l => {
            const isCurrentLevel = l.level === level
            const isAchieved     = l.level <= level
            return (
              <div key={l.level} style={{
                background: 'white', borderRadius: 14, padding: '14px 14px',
                border: isCurrentLevel ? `2px solid ${GOLD}` : '2px solid transparent',
                position: 'relative',
              }}>
                {isAchieved && l.level > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, width: 20, height: 20, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: GOLD, color: '#1a1a1a', fontWeight: 800, fontSize: 12, borderRadius: 50, padding: '3px 10px' }}>LV {l.level}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{l.name}</span>
                </div>

                {/* Requirements */}
                <div style={{ marginBottom: 8 }}>
                  {l.level === 0 ? (
                    <p style={{ fontSize: 12, color: '#6B7280' }}>No requirements — default for all users</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <p style={{ fontSize: 12, color: '#6B7280' }}>
                        • Total deposit: <strong style={{ color: '#111' }}>${fmtInt(l.min_deposit)}</strong>
                      </p>
                      {l.min_referrals > 0 && (
                        <p style={{ fontSize: 12, color: '#6B7280' }}>
                          • {l.min_referrals} referral{l.min_referrals > 1 ? 's' : ''} at <strong style={{ color: '#111' }}>VIP 1 or above</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, background: '#FFF8DC', color: '#92620A', fontWeight: 700, borderRadius: 50, padding: '2px 8px' }}>
                    {l.profit_pct}% profit/ticket
                  </span>
                  <span style={{ fontSize: 11, background: '#F3F4F6', color: '#374151', fontWeight: 600, borderRadius: 50, padding: '2px 8px' }}>
                    {fmtInt(l.tickets_day)} tickets/day
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Team rewards */}
        <p style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 10 }}>Team Rewards</p>
        <div style={{ background: 'white', borderRadius: 14, padding: '16px', fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          Earn <strong>0.04%</strong> of every ticket your referrals purchase. The more active your team, the more you earn passively. Referral bonuses are credited instantly when your referral's ticket completes.
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0,10)
}

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.3)', animation: 'shim 1.4s ease-in-out infinite' }} />
}

export default function TeamReport() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState(0) // kept for potential future use

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/team-earnings`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await res.json()
      setData(d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const referrals = data?.referrals || []

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6', background: 'white' }}>
        <button onClick={() => navigate('/my')} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Team Report</span>
        <div style={{ width: 22 }} />
      </div>

      {/* Summary card */}
      <div style={{ background: 'linear-gradient(135deg,#E0A800,#F5C518)', margin: '14px 14px 0', borderRadius: 18, padding: '18px 16px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i}><SkelDark w={80} h={20} r={6} /><SkelDark w={100} h={11} r={5} style={{ marginTop: 6 }} /></div>)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { val: `$${fmt(data?.yesterday_commission || 0)}`, label: "Yesterday's commission" },
              { val: `$${fmt(data?.team_earnings || 0)} (${data?.total_referrals || 0})`, label: 'Total earned (total referrals)' },
              { val: data?.active_today || 0, label: 'Active referrals today' },
              { val: data?.added_today || 0, label: 'New referrals today' },
            ].map(({ val, label }) => (
              <div key={label}>
                <p style={{ fontWeight: 900, fontSize: 18, color: 'white', marginBottom: 3 }}>{val}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level tab — VIP1 only */}
      <div style={{ display: 'flex', background: 'white', margin: '14px 14px 0', borderRadius: 12, padding: '4px' }}>
        <button style={{
          flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'default', fontWeight: 700, fontSize: 13,
          background: GOLD, color: '#1a1a1a',
        }}>
          {`VIP1 (${referrals.length})`}
        </button>
      </div>

      <div style={{ margin: '14px', padding: 0 }}>
        {loading ? (
          <div style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                {[1,2,3,4].map(j => <div key={j} style={{ height: 12, background: '#F3F4F6', borderRadius: 4 }} />)}
              </div>
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, padding: '40px 16px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#D1D5DB" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#D1D5DB" strokeWidth="1.8"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#D1D5DB" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>No team members yet</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Share your invite code to grow your team</p>
            <button onClick={() => navigate('/share-code')} style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#1a1a1a' }}>
              Share Code
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.6fr', padding: '10px 14px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              {['Member Account','Reg. Date','Balance','Active'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>{h}</span>
              ))}
            </div>
            {referrals.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.6fr', padding: '11px 14px', borderBottom: i < referrals.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.account}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(r.joined_at)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>${fmt(r.balance)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.is_active ? '#16a34a' : '#ef4444' }}>{r.is_active ? 'Yes' : 'No'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

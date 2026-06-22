import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../hooks/useAuth'
import { useStatusBarColor } from '../hooks/useStatusBarColor'
import BottomNav from '../components/BottomNav'
import Toast, { useToast } from '../components/Toast'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

const LEVELS = [
  { level: 0, name: 'Starter', min_deposit: 0,     min_referrals: 0,  profit_pct: 3  },
  { level: 1, name: 'VIP 1',  min_deposit: 100,   min_referrals: 0,  profit_pct: 5  },
  { level: 2, name: 'VIP 2',  min_deposit: 500,   min_referrals: 1,  profit_pct: 8  },
  { level: 3, name: 'VIP 3',  min_deposit: 2000,  min_referrals: 3,  profit_pct: 12 },
  { level: 4, name: 'VIP 4',  min_deposit: 5000,  min_referrals: 5,  profit_pct: 15 },
  { level: 5, name: 'VIP 5',  min_deposit: 10000, min_referrals: 10, profit_pct: 20 },
]

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function SkelDark({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
}
function SkelLight({ w = '100%', h = 16, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.25)', animation: 'shim 1.4s ease-in-out infinite' }} />
}

function AvatarIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.8" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function NavItem({ icon, label, route }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(route)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#F9FAFB', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{label}</span>
    </button>
  )
}

export default function My({ onLogout }) {
  const navigate = useNavigate()
  useStatusBarColor('#E0A800')
  const { toasts, addToast } = useToast()
  function toast(msg, type) { addToast(msg, type) }
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [confirmOut, setConfirmOut] = useState(false)

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

  function handleSignOut() {
    clearToken()
    if (onLogout) onLogout()
    navigate('/', { replace: true })
  }

  const currentLevelIdx = user ? Math.min(user.membership_level || 0, 5) : 0
  const currentLevelDef = LEVELS[currentLevelIdx]
  const nextLevelData   = currentLevelIdx < 5 ? LEVELS[currentLevelIdx + 1] : null
  const deposited       = parseFloat(user?.total_deposited || 0)
  const qualRefs        = user?.qualified_referrals || 0
  const depositNeeded   = nextLevelData ? Math.max(0, nextLevelData.min_deposit - deposited) : 0
  const refsNeeded      = nextLevelData ? Math.max(0, nextLevelData.min_referrals - qualRefs) : 0

  const GRID_ITEMS = [
    { label: 'Account Record', route: '/account-record', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#6B7280" strokeWidth="1.7"/><path d="M9 7h6M9 11h6M9 15h4" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round"/></svg> },
    { label: 'Electronic Wallet', route: '/assets', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="#6B7280" strokeWidth="1.7"/><path d="M2 10h20" stroke="#6B7280" strokeWidth="1.7"/><circle cx="17" cy="15" r="1.5" fill="#6B7280"/></svg> },
    { label: 'Membership Level', route: '/membership', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l19-9-9 19-2-8-8-2z" stroke="#6B7280" strokeWidth="1.7" strokeLinejoin="round"/></svg> },
    { label: 'Investment Guide', route: '/guide', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6B7280" strokeWidth="1.7"/><path d="M12 8v4l3 3" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'User Agreement', route: '/agreement', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="#6B7280" strokeWidth="1.7"/><path d="M8 7h8M8 11h8M8 15h5" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round"/></svg> },
    { label: 'Share Code', route: '/share-code', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="#6B7280" strokeWidth="1.7"/><circle cx="6" cy="12" r="3" stroke="#6B7280" strokeWidth="1.7"/><circle cx="18" cy="19" r="3" stroke="#6B7280" strokeWidth="1.7"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="#6B7280" strokeWidth="1.7" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: '#f9fafb', paddingBottom: 90 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <Toast toasts={toasts} />

      {/* Gold header */}
      <div style={{ background: 'linear-gradient(160deg,#E0A800 0%,#F5C518 50%,#FFE066 100%)', paddingTop: 'env(safe-area-inset-top,16px)', paddingBottom: 28 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
          <div style={{ width: 28 }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white' }}>Personal Center</span>
          <button onClick={() => navigate('/settings-funding-password')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Security">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="1.8"/><path d="M8 11V7a4 4 0 018 0v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="white"/></svg>
          </button>
        </div>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px 0' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.6)', overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {user?.profile_image
              ? <img src={user.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <AvatarIcon />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SkelLight w={140} h={14} />
                <SkelLight w={80} h={11} />
              </div>
            ) : (
              <>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'white', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email || user?.phone || 'User'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: '#1a1a1a', color: GOLD, fontWeight: 800, fontSize: 11, borderRadius: 50, padding: '2px 10px' }}>
                    LV {user?.membership_level || 0}
                  </span>
                  <span style={{ background: 'rgba(0,0,0,0.18)', color: 'white', fontWeight: 700, fontSize: 11, borderRadius: 50, padding: '2px 8px' }}>
                    {currentLevelDef?.profit_pct || 3}% per ticket
                  </span>
                  {nextLevelData && (
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, width: '100%' }}>
                      {depositNeeded > 0 && refsNeeded > 0
                        ? `Need $${fmt(depositNeeded)} more + ${refsNeeded} VIP1 referral${refsNeeded > 1 ? 's' : ''}`
                        : depositNeeded > 0
                        ? `Need $${fmt(depositNeeded)} more to deposit`
                        : refsNeeded > 0
                        ? `Need ${refsNeeded} more VIP1 referral${refsNeeded > 1 ? 's' : ''}`
                        : 'Ready to level up!'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 14px' }}>

        {/* Balance card */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', marginTop: -20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            {loading ? <SkelDark w={100} h={28} r={8} /> : (
              <p style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>${fmt(user?.balance)}</p>
            )}
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Current Balance</p>
          </div>
          <div style={{ width: 1, height: 40, background: '#F3F4F6', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            {loading ? <SkelDark w={100} h={28} r={8} /> : (
              <p style={{ fontSize: 24, fontWeight: 900, color: '#111' }}>${fmt(user?.personal_gains)}</p>
            )}
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Personal Gains</p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 12px', marginTop: 12, display: 'flex', justifyContent: 'space-around' }}>
          <NavItem route="/recharge" label="Recharge" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke={GOLD} strokeWidth="1.8"/><path d="M2 10h20" stroke={GOLD} strokeWidth="1.8"/><circle cx="17" cy="15" r="1.5" fill={GOLD}/></svg>} />
          <NavItem route="/team-report" label="Team Earnings" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#3B82F6" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round"/></svg>} />
          <NavItem route="/movies" label="Invest Movies" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#F97316" strokeWidth="1.8"/><path d="M7 4v4M7 16v4M12 4v16M17 4v4M17 16v4M2 8h20M2 16h20" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round"/></svg>} />
        </div>

        {/* Withdrawable balance row */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
            Withdrawable balance: {loading ? '...' : <strong style={{ color: '#111' }}>${fmt(user?.balance)}</strong>}
          </span>
          <button onClick={() => navigate('/withdraw')} style={{ background: GOLD, border: 'none', borderRadius: 50, padding: '8px 14px', fontWeight: 700, fontSize: 12, color: '#1a1a1a', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Withdraw now
          </button>
        </div>

        {/* Grid buttons */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 12px', marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {GRID_ITEMS.map(item => (
              <button key={item.label} onClick={() => navigate(item.route)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#F9FAFB', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => setConfirmOut(true)}
          style={{ width: '100%', background: '#F5C518', border: 'none', borderRadius: 50, padding: '14px', marginTop: 12, textAlign: 'center', color: '#1a1a1a', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
        >
          Sign Out
        </button>
      </div>

      <BottomNav active="my" />

      {/* Confirm dialog */}
      {confirmOut && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', margin: '0 24px', textAlign: 'center' }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 8 }}>Sign out?</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmOut(false)} style={{ flex: 1, padding: '12px', borderRadius: 50, border: '1.5px solid #E5E7EB', background: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={handleSignOut} style={{ flex: 1, padding: '12px', borderRadius: 50, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

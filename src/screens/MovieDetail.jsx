import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function buildRoiData(price, profitPct, durationHours) {
  const points = Math.min(durationHours, 12)
  const profit = price * (profitPct / 100)
  return Array.from({ length: points + 1 }, (_, i) => ({
    t: i === 0 ? 'Start' : i === points ? 'End' : `${Math.round((i / points) * durationHours)}h`,
    v: parseFloat((price + profit * (i / points)).toFixed(2)),
  }))
}

function Skel({ w = '100%', h = 14, r = 6 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
}

export default function MovieDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [movie, setMovie]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState(null)
  const [tab, setTab]           = useState('info')
  const [showModal, setShowModal] = useState(false)
  const [qty, setQty]           = useState(1)
  const [paymentType, setPaymentType] = useState('balance')
  const [buying, setBuying]     = useState(false)
  const [buyError, setBuyError] = useState('')
  const [toast, setToast]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, uRes] = await Promise.all([
        fetch(`${API}/movies/${id}`),
        fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ])
      const mD = await mRes.json()
      const uD = await uRes.json()
      if (mD.movie) setMovie(mD.movie)
      setUser(uD.user || uD)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleBuy() {
    setBuyError('')
    const vouchersNeeded = qty * 2
    const userVouchers = parseInt(user?.vouchers || 0)

    if (paymentType === 'balance') {
      const totalCost = (movie?.price || 0) * qty
      if (!user || parseFloat(user.balance) < totalCost) {
        return setBuyError('Insufficient balance. Please recharge first.')
      }
    } else {
      if (userVouchers < vouchersNeeded) {
        return setBuyError(`Not enough vouchers. Need ${vouchersNeeded}, you have ${userVouchers}.`)
      }
    }

    setBuying(true)
    try {
      const res = await fetch(`${API}/buy-ticket/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, payment_type: paymentType }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) return setBuyError(d.message || 'Purchase failed')
      setShowModal(false)
      showToast(paymentType === 'voucher'
        ? `Ticket purchased with vouchers! You will earn $${fmt(d.ticket?.profit_amount)} profit.`
        : `Ticket purchased! Profit returns in ${movie.duration_hours} hours.`)
      setTimeout(() => navigate('/my-tickets'), 2000)
    } catch (err) {
      setBuyError(err.message || 'Something went wrong')
    } finally {
      setBuying(false)
    }
  }

  const price     = parseFloat(movie?.price || 0)
  const profitPct = parseFloat(user?.profit_percent || movie?.profit_percent || 3)
  const duration  = parseInt(movie?.duration_hours || 24)
  const totalCost = price * qty
  const profit    = parseFloat((totalCost * profitPct / 100).toFixed(2))
  const roiData   = movie ? buildRoiData(price, profitPct, duration) : []

  const today       = new Date()
  const startCalc   = new Date(today); startCalc.setDate(startCalc.getDate() + 1)
  const viewEarnings = new Date(today); viewEarnings.setHours(viewEarnings.getHours() + duration)
  const fmtD = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 90 }}>

        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', background: 'white', borderBottom: '1px solid #F3F4F6' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#111', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loading ? 'Movie Detail' : (movie?.title || 'Not found')}
          </span>
          <div style={{ width: 22 }} />
        </div>

        {/* Hero poster */}
        {loading ? (
          <div style={{ height: 220, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
        ) : movie?.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
        ) : (
          <div style={{ height: 220, background: 'linear-gradient(135deg,#E0A800,#F5C518)' }} />
        )}

        {/* Info card */}
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '18px 16px 0', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <Skel w="70%" h={18} />
              <Skel w="50%" h={13} />
            </div>
          ) : movie ? (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 18 }}>
                {[
                  { n: 1, label: 'Subscription' },
                  { n: 2, label: 'Contract signing' },
                  { n: 3, label: 'Data submission' },
                ].map((step, i) => (
                  <div key={step.n} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? GOLD : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? '#1a1a1a' : '#9CA3AF' }}>{step.n}</span>
                      </div>
                      <span style={{ fontSize: 9, color: i === 0 ? GOLD : '#9CA3AF', fontWeight: 700, marginTop: 3, whiteSpace: 'nowrap' }}>{step.label}</span>
                    </div>
                    {i < 2 && <div style={{ width: 32, height: 2, background: '#E5E7EB', margin: '0 4px', marginBottom: 14 }} />}
                  </div>
                ))}
              </div>

              {/* Details table */}
              <div style={{ background: '#F9FAFB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                {[
                  ['Movie Guaranteed Box Office', movie.income ? `$${fmt(movie.income)}` : 'N/A'],
                  ['Movie Duration', `${duration} hrs`],
                  ['Dividend Mode', 'Principal'],
                  ['Lock time', `${duration} hours`],
                  ['Service Charge', '0.01%'],
                  ['Profit Rate', `${profitPct}%`],
                ].map(([label, val], i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '2px solid #F3F4F6', marginBottom: 18 }}>
                {[['info','Movie Info'],['rules','Investment Rules']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)} style={{
                    flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    color: tab === key ? GOLD : '#9CA3AF',
                    borderBottom: tab === key ? `2px solid ${GOLD}` : '2px solid transparent',
                    marginBottom: -2,
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'info' ? (
                <div>
                  {movie.poster_url && (
                    <img src={movie.poster_url} alt={movie.title} style={{ width: '100%', borderRadius: 12, marginBottom: 12, objectFit: 'cover', maxHeight: 240 }} />
                  )}
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 6 }}>{movie.title}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Film type: Theatrical Movies</p>
                  {movie.introduction && (
                    <><p style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 4 }}>Introduction:</p>
                    <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, marginBottom: 12 }}>{movie.introduction}</p></>
                  )}
                  {movie.description && (
                    <><p style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 4 }}>Description:</p>
                    <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, marginBottom: 12 }}>{movie.description}</p></>
                  )}
                  {movie.instructions && (
                    <><p style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 4 }}>Instructions:</p>
                    <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, marginBottom: 12 }}>{movie.instructions}</p></>
                  )}
                  {/* Actor images */}
                  {movie.actor_images && (() => {
                    try {
                      const imgs = Array.isArray(movie.actor_images) ? movie.actor_images : JSON.parse(movie.actor_images)
                      if (imgs?.length) return (
                        <>
                          <p style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 8 }}>Actors:</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                            {imgs.map((src, i) => (
                              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#F3F4F6' }}>
                                {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    } catch { return null }
                  })()}
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={GOLD}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={GOLD} strokeWidth="1"/></svg>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Investment timeline */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                    {[
                      { label: 'Investment Submission', date: fmtD(today) },
                      { label: 'Start Calculating', date: fmtD(startCalc) },
                      { label: 'View Earnings', date: fmtD(viewEarnings) },
                    ].map((pt, i) => (
                      <div key={pt.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: '#374151', fontWeight: 700, textAlign: 'center', marginTop: 5, lineHeight: 1.3 }}>{pt.label}</span>
                          <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{pt.date}</span>
                        </div>
                        {i < 2 && <div style={{ flex: 1, height: 2, background: GOLD, margin: '0 4px', marginBottom: 30 }} />}
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
                    Return on investment cycle: {duration} hours
                  </p>

                  {/* ROI chart */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Projected ROI Growth</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={roiData}>
                        <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={['auto','auto']} />
                        <Tooltip formatter={v => [`$${fmt(v)}`, 'Value']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="v" stroke={GOLD} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {movie.description && (
                    <>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 6 }}>Investment Introduction</p>
                      <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, marginBottom: 16 }}>{movie.description}</p>
                    </>
                  )}

                  {/* Investment amount */}
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Investment amount</p>
                  <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <input
                      type="number"
                      value={qty * price}
                      readOnly
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: 20, fontWeight: 800, color: GOLD, background: 'transparent' }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                    ${fmt(totalCost)} × {profitPct}% = Projected earnings: <strong style={{ color: '#16a34a' }}>${fmt(profit)}</strong>
                  </p>
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Movie not found</p>
          )}
        </div>
      </div>

      {/* Sticky buy button */}
      {movie && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, padding: '12px 16px', background: 'white', borderTop: '1px solid #F3F4F6', zIndex: 20 }}>
          <button onClick={() => { setQty(1); setBuyError(''); setPaymentType('balance'); setShowModal(true) }} style={{ width: '100%', padding: '14px 0', borderRadius: 50, background: GOLD, border: 'none', fontWeight: 800, fontSize: 15, color: '#1a1a1a', cursor: 'pointer' }}>
            Buy Tickets Now
          </button>
        </div>
      )}

      {/* Purchase modal */}
      {showModal && movie && (() => {
        const userVouchers = parseInt(user?.vouchers || 0)
        const vouchersNeeded = qty * 2
        const hasEnoughVouchers = userVouchers >= vouchersNeeded
        const voucherProfit = parseFloat((price * qty * profitPct / 100).toFixed(2))
        const canConfirm = paymentType === 'balance'
          ? (parseFloat(user?.balance || 0) >= totalCost)
          : hasEnoughVouchers
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
            <div style={{ position: 'relative', background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 18px 36px', zIndex: 1 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 50, height: 65, borderRadius: 8, background: 'linear-gradient(135deg,#1a237e,#F5C518)', overflow: 'hidden', flexShrink: 0 }}>
                  {movie.poster_url && <img src={movie.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Profit rate: {profitPct}%</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <span style={{ background: '#FEF9E7', color: GOLD, fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 50 }}>Price: ${fmt(price)}/Ticket</span>
                <span style={{ background: '#F3F4F6', color: '#6B7280', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 50 }}>Vouchers: {userVouchers} sheets</span>
              </div>

              {/* Quantity */}
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 10 }}>Purchase quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', fontWeight: 800, fontSize: 18, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#111', minWidth: 30, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, borderRadius: '50%', background: GOLD, border: 'none', fontWeight: 800, fontSize: 18, cursor: 'pointer', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>

              {/* Payment type toggle */}
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Payment type</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['balance', 'voucher'].map(pt => (
                  <button
                    key={pt}
                    onClick={() => { setPaymentType(pt); setBuyError('') }}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 50, fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', border: `2px solid ${paymentType === pt ? GOLD : '#E5E7EB'}`,
                      background: paymentType === pt ? GOLD : 'white',
                      color: paymentType === pt ? '#1a1a1a' : '#9CA3AF',
                    }}
                  >
                    {pt === 'balance' ? 'Balance' : 'Vouchers'}
                  </button>
                ))}
              </div>

              {/* Payment details */}
              {paymentType === 'balance' ? (
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Available balance</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>${fmt(user?.balance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Total cost</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>${fmt(totalCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Est. profit</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>+${fmt(profit)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Your vouchers</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{userVouchers} sheets</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Each ticket requires</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>2 vouchers</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Total vouchers needed</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: hasEnoughVouchers ? '#111' : '#ef4444' }}>{vouchersNeeded} sheets</span>
                  </div>
                  <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />
                  {hasEnoughVouchers ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>No balance deducted</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Free</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Profit only</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a' }}>+${fmt(voucherProfit)}</span>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>
                      Need {vouchersNeeded - userVouchers} more vouchers
                    </p>
                  )}
                </div>
              )}

              <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 14 }}>
                Profit distributed daily at 12:00 AM Pakistan time
              </p>

              {buyError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#ef4444', marginBottom: 12, fontWeight: 600 }}>
                  {buyError}
                </div>
              )}

              <button
                onClick={handleBuy}
                disabled={buying || !canConfirm}
                style={{ width: '100%', padding: '14px 0', borderRadius: 50, background: (buying || !canConfirm) ? '#E5E7EB' : GOLD, border: 'none', fontWeight: 800, fontSize: 14, color: (buying || !canConfirm) ? '#9CA3AF' : '#1a1a1a', cursor: (buying || !canConfirm) ? 'not-allowed' : 'pointer' }}
              >
                {buying ? 'Processing...' : 'Confirm purchase'}
              </button>
            </div>
          </div>
        )
      })()}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: 'white', padding: '10px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, zIndex: 999, maxWidth: 320, textAlign: 'center' }}>
          {toast}
        </div>
      )}
    </>
  )
}

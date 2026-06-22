import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = import.meta.env.VITE_OTP_SERVER_URL
const GOLD = '#F5C518'

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function buildRoiData(minInvest, roiPct, days) {
  const points = Math.min(days, 10)
  return Array.from({ length: points + 1 }, (_, i) => ({
    d: i === 0 ? 'Day 0' : i === points ? `Day ${days}` : `Day ${Math.round((i / points) * days)}`,
    v: parseFloat((minInvest * (1 + (roiPct / 100) * (i / points))).toFixed(2)),
  }))
}

function Skel({ w = '100%', h = 14, r = 6 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
}

export default function InvestmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState(null)
  const [amount, setAmount]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(null)
  const [toast, setToast]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`${API}/investments/${id}`),
        fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ])
      const pD = await pRes.json()
      const uD = await uRes.json()
      if (pD.product) {
        setProduct(pD.product)
        setAmount(String(pD.product.min_investment))
      }
      setUser(uD.user || uD)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleConfirm() {
    setError('')
    const amt = parseFloat(amount)
    if (!amt || amt < parseFloat(product.min_investment)) {
      return setError(`Minimum investment is $${fmt(product.min_investment)}`)
    }
    if (!user || parseFloat(user.balance) < amt) {
      return setError('Insufficient balance. Please recharge first.')
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/invest-product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, amount: amt }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) return setError(d.message || 'Investment failed')
      setSuccess(d)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const pct          = product ? Math.min(100, Math.round((parseFloat(product.funded_amount || 0) / parseFloat(product.funding_goal || 1)) * 100)) : 0
  const isFull       = pct >= 100
  const minInvest    = parseFloat(product?.min_investment || 0)
  const roiPct       = parseFloat(product?.roi_percent || 0)
  const days         = parseInt(product?.duration_days || 0)
  const amt          = parseFloat(amount) || minInvest
  const projReturn   = parseFloat((amt * (1 + roiPct / 100)).toFixed(2))
  const roiData      = product ? buildRoiData(amt || minInvest, roiPct, days) : []

  const today        = new Date()
  const startCalc    = new Date(today); startCalc.setDate(startCalc.getDate() + 1)
  const viewEarnings = new Date(today); viewEarnings.setDate(viewEarnings.getDate() + days)
  const fmtD = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 100 }}>

        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', background: 'white', borderBottom: '1px solid #F3F4F6' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#111', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loading ? 'Investment Detail' : (product?.name || 'Not found')}
          </span>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {loading ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skel w="65%" h={14} /><Skel w="50%" h={11} /><Skel w="100%" h={8} />
                </div>
              </div>
            </>
          ) : !product ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Product not found</p>
          ) : (
            <>
              {/* Product header */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 60, height: 60, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: isFull ? 'linear-gradient(135deg,#F5C518,#E0B000)' : 'linear-gradient(135deg,#1a237e,#283593)' }}>
                  {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 3 }}>{product.name}</p>
                  <p style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Financed: ${fmt(product.funded_amount)}</p>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{isFull ? 'Completed 100%' : `${pct}% Funded`}</span>
                    </div>
                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 50, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: GOLD, borderRadius: 50 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Details table */}
              <div style={{ background: '#F9FAFB', borderRadius: 12, overflow: 'hidden' }}>
                {[
                  ['Type', product.type === 'stable' ? 'Stable Investment' : 'High Yield Investment'],
                  ['ROI', `${roiPct}%`],
                  ['Duration', `${days} days`],
                  ['Min Investment', `$${fmt(minInvest)}`],
                  ['Funding Goal', `$${fmt(product.funding_goal)}`],
                  ['Funded So Far', `$${fmt(product.funded_amount)}`],
                  ['Dividend Mode', 'Principal with Profit'],
                  ['Service Charge', '0.01%'],
                ].map(([label, val], i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* ROI chart */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Projected ROI Growth</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={roiData}>
                    <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto','auto']} />
                    <Tooltip formatter={v => [`$${fmt(v)}`, 'Value']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="v" stroke={GOLD} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Timeline */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Investment Timeline</p>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  {[
                    { label: 'Investment Submission', date: fmtD(today) },
                    { label: 'Start Calculating', date: fmtD(startCalc) },
                    { label: 'View Earnings', date: fmtD(viewEarnings) },
                  ].map((pt, i) => (
                    <div key={pt.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD }} />
                        <span style={{ fontSize: 10, color: '#374151', fontWeight: 700, textAlign: 'center', marginTop: 5, lineHeight: 1.3 }}>{pt.label}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{pt.date}</span>
                      </div>
                      {i < 2 && <div style={{ flex: 1, height: 2, background: GOLD, margin: '0 4px', marginBottom: 34 }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              {!isFull && (
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 8 }}>Investment amount</p>
                  <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <input
                      type="number"
                      value={amount}
                      min={minInvest}
                      onChange={e => setAmount(e.target.value)}
                      style={{ width: '100%', border: 'none', outline: 'none', fontSize: 20, fontWeight: 800, color: GOLD, background: 'transparent' }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 0 }}>
                    ${fmt(amt)} × {roiPct}% ROI = <strong style={{ color: '#16a34a' }}>${fmt(projReturn)}</strong> projected return
                    <span style={{ color: '#9CA3AF' }}> over {days} days</span>
                  </p>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky confirm button */}
      {product && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, padding: '12px 16px', background: 'white', borderTop: '1px solid #F3F4F6', zIndex: 20 }}>
          <button
            onClick={handleConfirm}
            disabled={isFull || submitting}
            style={{ width: '100%', padding: '14px 0', borderRadius: 50, background: isFull || submitting ? '#E5E7EB' : GOLD, border: 'none', fontWeight: 800, fontSize: 15, color: isFull || submitting ? '#9CA3AF' : '#1a1a1a', cursor: isFull || submitting ? 'not-allowed' : 'pointer' }}
          >
            {isFull ? 'Investment Closed' : submitting ? 'Processing...' : 'Confirm Investment'}
          </button>
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 390, margin: '0 auto', left: 0, right: 0 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 28px', textAlign: 'center', margin: '0 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }}>
              <circle cx="12" cy="12" r="11" fill={GOLD}/>
              <path d="M7 12l3.5 3.5L17 8" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontWeight: 900, fontSize: 18, color: '#111', marginBottom: 8 }}>Investment confirmed!</p>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
              Your ${fmt(parseFloat(amount))} investment will return ${fmt(success.total_return)} after {days} days.
            </p>
            <button onClick={() => navigate('/my-tickets')} style={{ width: '100%', padding: '13px 0', borderRadius: 50, background: GOLD, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#1a1a1a' }}>
              View My Investments
            </button>
          </div>
        </div>
      )}
    </>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../hooks/useAuth'

const OTP_SERVER = import.meta.env.VITE_OTP_SERVER_URL

// ── Icons ──────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="#D1D5DB" strokeWidth="1.5" />
      <path d="M9 3v6" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 3v6" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="2" stroke="#D1D5DB" strokeWidth="1.5" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="#ef4444" />
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).replace(',', ' ·')
}

const STATUS_MAP = {
  pending:  { label: 'Pending Confirmation', bg: '#F5C518', color: '#1a1a1a' },
  approved: { label: 'Credited',             bg: '#22c55e', color: '#ffffff' },
  rejected: { label: 'Rejected',             bg: '#ef4444', color: '#ffffff' },
}

// ── Record card ────────────────────────────────────────────────
function RecordCard({ rec }) {
  const status = STATUS_MAP[rec.status] || STATUS_MAP.pending
  const txShort = rec.transaction_hash
    ? rec.transaction_hash.slice(0, 12) + '...'
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-2">

      {/* Top row: network badge + status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#374151' }}>
          {rec.network}
        </span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: status.bg, color: status.color }}>
          {status.label}
        </span>
      </div>

      {/* Middle row: amount + date */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">
          Amount: ${parseFloat(rec.amount).toFixed(2)}
        </span>
        <span className="text-xs text-gray-400">{formatDate(rec.submitted_at)}</span>
      </div>

      {/* Tx hash */}
      {txShort && (
        <p className="text-xs text-gray-400">Tx: {txShort}</p>
      )}

      {/* Rejection reason */}
      {rec.status === 'rejected' && rec.note && (
        <div className="flex items-start gap-1.5">
          <WarningIcon />
          <p className="text-xs text-red-500 italic leading-snug">{rec.note}</p>
        </div>
      )}

      {/* Reviewed at */}
      {rec.reviewed_at && (
        <p className="text-xs text-gray-300 text-right">Reviewed: {formatDate(rec.reviewed_at)}</p>
      )}

    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────
export default function RechargeRecord() {
  const navigate = useNavigate()
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [fetchErr, setFetchErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr('')
    try {
      const res = await fetch(`${OTP_SERVER}/recharge-records`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error (${res.status}). Please restart the server and try again.`)
      }
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load records.')
      setRecords(data.records || [])
    } catch (err) {
      setFetchErr(err.message || 'Failed to load records. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="bg-white min-h-screen" style={{ paddingBottom: 32 }}>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <button onClick={() => navigate('/recharge')} className="p-1 -ml-1">
          <BackIcon />
        </button>
        <span className="font-bold text-base text-gray-900">Recharge Record</span>
        <div style={{ width: 22 }} />
      </div>

      <div className="px-4 pt-5">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center mt-20">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#F5C518" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </svg>
          </div>
        )}

        {/* Error */}
        {!loading && fetchErr && (
          <div className="flex flex-col items-center mt-20 gap-3">
            <p className="text-sm text-red-500 text-center">{fetchErr}</p>
            <button
              onClick={load}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: '#F5C518', color: '#1a1a1a' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchErr && records.length === 0 && (
          <div className="flex flex-col items-center mt-20 gap-2">
            <EmptyIcon />
            <p className="text-sm font-bold text-gray-400 mt-2">No recharge records yet</p>
            <p className="text-xs text-gray-300">Your submitted recharges will appear here</p>
          </div>
        )}

        {/* Record list */}
        {!loading && !fetchErr && records.length > 0 && (
          <div className="flex flex-col gap-3">
            {records.map(rec => <RecordCard key={rec.id} rec={rec} />)}
          </div>
        )}

      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { StatusBadge } from '../components/StatusBadge'
import { useAppToast } from '../components/AdminLayout'

function StatCard({ label, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? <span className="skeleton h-6 w-20 inline-block rounded" />}</p>
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Dashboard() {
  const navigate   = useNavigate()
  const toast      = useAppToast()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(setData)
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const s = data?.stats || {}

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={loading ? null : s.total_users?.toLocaleString()}
          color="bg-blue-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="w-6 h-6"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
        />
        <StatCard
          label="Total Deposited"
          value={loading ? null : `$${Number(s.total_deposited || 0).toLocaleString()}`}
          color="bg-green-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" className="w-6 h-6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
        />
        <StatCard
          label="Total Withdrawn"
          value={loading ? null : `$${Number(s.total_withdrawn || 0).toLocaleString()}`}
          color="bg-red-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-6 h-6"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>}
        />
        <StatCard
          label="Total Profit Paid"
          value={loading ? null : `$${Number(s.total_profit_paid || 0).toLocaleString()}`}
          color="bg-yellow-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Pending Recharges"
          value={loading ? null : s.pending_recharges ?? 0}
          color="bg-amber-50"
          onClick={() => navigate('/recharges')}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="w-6 h-6"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
        />
        <StatCard
          label="Pending Withdrawals"
          value={loading ? null : s.pending_withdrawals ?? 0}
          color="bg-orange-50"
          onClick={() => navigate('/withdrawals')}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="w-6 h-6"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>}
        />
        <StatCard
          label="Active Tickets"
          value={loading ? null : s.active_tickets ?? 0}
          color="bg-purple-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" className="w-6 h-6"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>}
        />
        <StatCard
          label="Today's Registrations"
          value={loading ? null : s.today_registrations ?? 0}
          color="bg-teal-50"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" className="w-6 h-6"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
        />
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Recharges */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Recharges</h2>
            <button onClick={() => navigate('/recharges')} className="text-xs text-accent font-semibold hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? Array.from({length:4}).map((_,i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="skeleton h-4 rounded w-40" />
                <div className="skeleton h-4 rounded w-16" />
              </div>
            )) : (data?.recent_recharges || []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No recharges yet</p>
            ) : (data?.recent_recharges || []).map(r => (
              <div key={r.id} className={`px-5 py-3 flex items-center justify-between ${r.status === 'pending' ? 'bg-yellow-50/60' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.users?.email || r.users?.phone || '—'}</p>
                  <p className="text-xs text-gray-400">{timeAgo(r.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800">${r.amount}</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Withdrawals */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Withdrawals</h2>
            <button onClick={() => navigate('/withdrawals')} className="text-xs text-accent font-semibold hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? Array.from({length:4}).map((_,i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="skeleton h-4 rounded w-40" />
                <div className="skeleton h-4 rounded w-16" />
              </div>
            )) : (data?.recent_withdrawals || []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No withdrawals yet</p>
            ) : (data?.recent_withdrawals || []).map(w => (
              <div key={w.id} className={`px-5 py-3 flex items-center justify-between ${w.status === 'pending' ? 'bg-yellow-50/60' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-700">{w.users?.email || w.users?.phone || '—'}</p>
                  <p className="text-xs text-gray-400">{timeAgo(w.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800">${w.amount}</span>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

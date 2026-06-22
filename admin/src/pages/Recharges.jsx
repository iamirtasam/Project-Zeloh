import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { useAppToast } from '../components/AdminLayout'

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

function TxHash({ hash, network }) {
  const [copied, setCopied] = useState(false)

  if (!hash) return <span style={{ color: '#999' }}>—</span>

  const net = (network || '').toUpperCase()
  const explorerUrl = net === 'ERC20'
    ? `https://etherscan.io/tx/${hash}`
    : `https://tronscan.org/#/transaction/${hash}`

  const truncated = hash.length > 12
    ? hash.substring(0, 8) + '...' + hash.substring(hash.length - 4)
    : hash

  async function handleCopy(e) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(hash)
    } catch {
      const el = document.createElement('textarea')
      el.value = hash
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={hash}
        style={{ color: '#F5C518', textDecoration: 'none', fontSize: 13, fontFamily: 'monospace', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
      >
        {truncated}
      </a>
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy full hash'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: copied ? '#22c55e' : '#999', transition: 'color 0.2s', flexShrink: 0 }}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1" ry="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          </svg>
        )}
      </button>
    </div>
  )
}

function timeAgo(d) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(d).toLocaleDateString()
}

export default function Recharges() {
  const toast = useAppToast()
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget]   = useState(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const q = filter === 'All' ? '' : `?status=${filter.toLowerCase()}`
    api.get(`/admin/recharges${q}`)
      .then(d => setData(d.recharges || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function doApprove() {
    setActionLoading(true)
    try {
      await api.post(`/admin/recharge/approve/${approveTarget.id}`, {})
      toast(`Recharge of $${approveTarget.amount} approved!`)
      setApproveTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  async function doReject() {
    if (!rejectReason.trim()) return toast('Please enter a rejection reason.', 'warning')
    setActionLoading(true)
    try {
      await api.post(`/admin/recharge/reject/${rejectTarget.id}`, { note: rejectReason })
      toast(`Recharge rejected.`)
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  const rows = data.map(r => [
    <span className="font-medium text-gray-700">{r.users?.email || r.users?.phone || r.user_id?.slice(0,8)}</span>,
    <span className="font-bold">${r.amount}</span>,
    r.network,
    <TxHash hash={r.transaction_hash} network={r.network} />,
    r.screenshot_url ? (
      <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline font-semibold">
        View
      </a>
    ) : <span className="text-gray-300 text-xs">—</span>,
    timeAgo(r.submitted_at),
    <StatusBadge status={r.status} />,
    r.status === 'pending' ? (
      <div className="flex gap-2">
        <button
          onClick={() => setApproveTarget(r)}
          className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition"
        >
          Approve
        </button>
        <button
          onClick={() => { setRejectTarget(r); setRejectReason('') }}
          className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
        >
          Reject
        </button>
      </div>
    ) : (
      <span className="text-xs text-gray-400 italic">
        {r.status === 'approved' ? 'Approved' : 'Rejected'}
        {r.note ? ` — ${r.note}` : ''}
      </span>
    ),
  ])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === f ? 'bg-accent text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        headers={['User', 'Amount', 'Network', 'Tx Hash', 'Screenshot', 'Submitted', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No recharge requests found."
      />

      {/* Approve dialog */}
      <ConfirmDialog
        open={!!approveTarget}
        title="Approve Recharge"
        message={approveTarget ? `Approve $${approveTarget.amount} recharge for ${approveTarget.users?.email || approveTarget.users?.phone || 'this user'}?` : ''}
        onConfirm={doApprove}
        onCancel={() => setApproveTarget(null)}
        loading={actionLoading}
      />

      {/* Reject modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Recharge">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Rejecting <strong>${rejectTarget?.amount}</strong> recharge for{' '}
            <strong>{rejectTarget?.users?.email || rejectTarget?.users?.phone || 'user'}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rejection reason (shown to user)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Transaction hash not found on blockchain"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setRejectTarget(null)} disabled={actionLoading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={doReject} disabled={actionLoading} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
              {actionLoading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

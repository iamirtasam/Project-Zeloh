import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { useAppToast } from '../components/AdminLayout'

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']

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

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 text-gray-300 hover:text-accent transition"
      title="Copy"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-green-500"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      )}
    </button>
  )
}

export default function Withdrawals() {
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
    api.get(`/admin/withdrawals${q}`)
      .then(d => setData(d.withdrawals || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function doApprove() {
    setActionLoading(true)
    try {
      await api.post(`/admin/withdrawal/approve/${approveTarget.id}`, {})
      toast(`Withdrawal of $${approveTarget.amount} approved!`)
      setApproveTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  async function doReject() {
    if (!rejectReason.trim()) return toast('Please enter a rejection reason.', 'warning')
    setActionLoading(true)
    try {
      await api.post(`/admin/withdrawal/reject/${rejectTarget.id}`, { note: rejectReason })
      toast('Withdrawal rejected and balance refunded.')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  const rows = data.map(w => [
    <span className="font-medium text-gray-700">{w.users?.email || w.users?.phone || w.user_id?.slice(0,8)}</span>,
    <span className="font-bold">${w.amount}</span>,
    <span className="flex items-center font-mono text-xs text-gray-600">
      {(w.wallet_address || '').slice(0, 20)}…
      <CopyButton text={w.wallet_address || ''} />
    </span>,
    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-semibold">{w.wallet_type}</span>,
    timeAgo(w.submitted_at),
    <StatusBadge status={w.status} />,
    w.status === 'pending' ? (
      <div className="flex gap-2">
        <button
          onClick={() => setApproveTarget(w)}
          className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition"
        >
          Approve
        </button>
        <button
          onClick={() => { setRejectTarget(w); setRejectReason('') }}
          className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition"
        >
          Reject
        </button>
      </div>
    ) : (
      <span className="text-xs text-gray-400 italic">
        {w.status === 'approved' ? 'Approved' : 'Rejected'}
        {w.note ? ` — ${w.note}` : ''}
      </span>
    ),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{f}</button>
        ))}
      </div>

      <DataTable
        headers={['User', 'Amount', 'Wallet Address', 'Network', 'Submitted', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No withdrawal requests found."
      />

      <ConfirmDialog
        open={!!approveTarget}
        title="Approve Withdrawal"
        message={approveTarget ? `Approve $${approveTarget.amount} withdrawal to ${approveTarget.wallet_address?.slice(0,16)}…?` : ''}
        onConfirm={doApprove}
        onCancel={() => setApproveTarget(null)}
        loading={actionLoading}
      />

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Withdrawal">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Rejecting <strong>${rejectTarget?.amount}</strong> withdrawal for{' '}
            <strong>{rejectTarget?.users?.email || rejectTarget?.users?.phone || 'user'}</strong>.
            The balance will be refunded to the user.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rejection reason (shown to user)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Invalid wallet address"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setRejectTarget(null)} disabled={actionLoading} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={doReject} disabled={actionLoading} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2">
              {actionLoading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Reject & Refund
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

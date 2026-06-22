import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { useAppToast } from '../components/AdminLayout'

const TABS = ['Tickets', 'Recharges', 'Withdrawals', 'Transactions', 'Login Logs']

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

function fmt(n) { return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function AdjustBalanceModal({ open, onClose, user, onSuccess }) {
  const toast = useAppToast()
  const [type, setType]     = useState('add')
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) { setType('add'); setAmount(''); setNote(''); setError('') }
  }, [open])

  const currentBal = parseFloat(user?.balance || 0)
  const amt        = parseFloat(amount) || 0
  const newBal     = type === 'add' ? currentBal + amt : currentBal - amt
  const canSubmit  = amt > 0 && note.trim().length > 0

  async function handleConfirm() {
    setError('')
    setSaving(true)
    try {
      const data = await api.post(`/admin/users/${user.id}/adjust-balance`, { amount: amt, type, note: note.trim() })
      toast(`Balance adjusted. New balance: ${fmt(data.new_balance)}`)
      onSuccess(data.new_balance)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manual Balance Adjustment">
      <div className="flex flex-col gap-5">
        {/* Current balance */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">Current balance</span>
          <span className="text-lg font-bold text-gray-800">{fmt(currentBal)}</span>
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Adjustment Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('add')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border-2
                ${type === 'add'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'}`}
            >
              + Add Balance
            </button>
            <button
              onClick={() => setType('deduct')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border-2
                ${type === 'deduct'
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'}`}
            >
              − Deduct Balance
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount (USD)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason / Note</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Manual bonus, Correction, Compensation"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Preview */}
        {amt > 0 && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between
            ${type === 'add' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <span>New balance will be:</span>
            <span className="text-base font-bold">{fmt(newBal)}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || saving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition flex items-center justify-center gap-2
              ${type === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            {type === 'add'
              ? `Add ${amt > 0 ? fmt(amt) : '$0.00'} to Balance`
              : `Deduct ${amt > 0 ? fmt(amt) : '$0.00'} from Balance`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EditWalletModal({ open, onClose, user, onSuccess }) {
  const toast = useAppToast()
  const [walletType, setWalletType] = useState('TRC20')
  const [walletAddress, setWalletAddress] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (open && user) {
      setWalletType(user.wallet_type || 'TRC20')
      setWalletAddress(user.wallet_address || '')
      setError('')
    }
  }, [open, user])

  async function handleUpdate() {
    if (!walletAddress.trim()) { setError('Wallet address is required'); return }
    setError('')
    setSaving(true)
    try {
      const d = await api.put(`/admin/users/${user.id}/wallet`, { wallet_address: walletAddress.trim(), wallet_type: walletType })
      toast('Wallet address updated successfully')
      onSuccess(d.wallet_address, d.wallet_type)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Withdrawal Wallet">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">User: <strong>{user?.email || user?.phone || '—'}</strong></p>
        {(user?.wallet_address) && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Current: <span className="font-mono">{user.wallet_address}</span> ({user.wallet_type || 'Unknown'})
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Wallet Type</label>
          <div className="flex gap-2">
            {['TRC20', 'ERC20'].map(t => (
              <button key={t} onClick={() => setWalletType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors
                  ${walletType === t ? 'bg-accent border-accent text-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:border-accent'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Wallet Address</label>
          <input
            type="text"
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
            placeholder="Enter new wallet address"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="font-semibold text-yellow-800 mb-1">Warning</p>
          <p className="text-yellow-700 text-xs">This will replace the user's current withdrawal address. Make sure the new address is correct before saving. The user will be able to withdraw to this new address immediately.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 font-medium">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">Cancel</button>
          <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent text-gray-900 text-sm font-bold hover:bg-yellow-400 disabled:opacity-40 transition flex items-center justify-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Update Wallet
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteUserModal({ open, onClose, user, onDeleted }) {
  const toast   = useAppToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/users/${user.id}`)
      toast('User account deleted')
      onDeleted(user.id)
      onClose()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete User Account">
      <div className="flex flex-col gap-5">
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <p className="font-bold mb-1">This action cannot be undone.</p>
          <p>Are you sure you want to permanently delete <strong>{user?.email || user?.phone}</strong>? All their data will be removed.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-40 transition flex items-center justify-center gap-2">
            {deleting && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Delete Account
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Users() {
  const toast = useAppToast()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Tickets')

  const [adjustUser, setAdjustUser]   = useState(null)
  const [deleteUser, setDeleteUser]   = useState(null)
  const [editWalletUser, setEditWalletUser] = useState(null)

  const loadUsers = useCallback(() => {
    setLoading(true)
    api.get('/admin/users')
      .then(d => setUsers(d.users || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function openUser(user) {
    setSelected(user)
    setActiveTab('Tickets')
    setDetailLoading(true)
    try {
      const d = await api.get(`/admin/users/${user.id}`)
      setDetail(d)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  function handleAdjustSuccess(newBalance, userId) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: newBalance } : u))
    if (detail && detail.user?.id === userId) {
      setDetail(prev => ({ ...prev, user: { ...prev.user, balance: newBalance } }))
    }
  }

  function handleDeleted(userId) {
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (selected?.id === userId) { setSelected(null); setDetail(null) }
  }

  function handleWalletSuccess(walletAddress, walletType, userId) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, wallet_address: walletAddress, wallet_type: walletType } : u))
    if (detail && detail.user?.id === userId) {
      setDetail(prev => ({ ...prev, user: { ...prev.user, wallet_address: walletAddress, wallet_type: walletType } }))
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.last_ip || '').includes(q)
  })

  function truncateWallet(addr) {
    if (!addr) return null
    if (addr.length <= 12) return addr
    return addr.slice(0, 6) + '...' + addr.slice(-4)
  }

  const rows = filtered.map(u => [
    <span className="font-medium text-gray-700">{u.email || u.phone || '—'}</span>,
    fmt(u.balance),
    fmt(u.total_deposited),
    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">Level {u.membership_level || 0}</span>,
    u.total_referrals ?? '—',
    u.referrer_display
      ? <span className="text-xs text-gray-600">{u.referrer_display}</span>
      : <span className="text-xs text-gray-400">{u.referred_by || '—'}</span>,
    u.wallet_address
      ? <span className="font-mono text-xs text-gray-600" title={u.wallet_address}>{truncateWallet(u.wallet_address)} <span className="text-gray-400">({u.wallet_type || '?'})</span></span>
      : <span className="text-xs text-gray-400">Not set</span>,
    <span title={u.last_ip || ''} className="font-mono text-xs text-gray-500">{u.last_ip ? u.last_ip.slice(0, 15) + (u.last_ip.length > 15 ? '…' : '') : '—'}</span>,
    timeAgo(u.created_at),
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={() => openUser(u)} className="px-3 py-1 rounded-lg bg-accent text-gray-900 text-xs font-semibold hover:bg-yellow-400 transition">View</button>
      <button onClick={() => setAdjustUser(u)} className="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition">Adjust Balance</button>
      <button onClick={() => setDeleteUser(u)} className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition">Delete</button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, phone or IP..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <span className="text-sm text-gray-400">{filtered.length} users</span>
      </div>

      <DataTable
        headers={['Email / Phone', 'Balance', 'Deposited', 'Level', 'Referrals', 'Referred By', 'Wallet', 'Last IP', 'Joined', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No users found."
      />

      {/* User Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null) }} title="User Details" wide>
        {!detail && detailLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({length: 6}).map((_,i) => <div key={i} className="skeleton h-4 rounded w-full" />)}
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-5">
            {/* Balance header with Adjust button */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Current Balance</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{fmt(detail.user?.balance)}</p>
              </div>
              <button
                onClick={() => setAdjustUser(detail.user)}
                className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adjust Balance
              </button>
            </div>

            {/* Wallet row with Edit button */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Withdrawal Wallet</p>
                {detail.user?.wallet_address
                  ? <p className="text-sm font-mono text-gray-800 mt-0.5 truncate">{detail.user.wallet_address} <span className="text-gray-400 font-sans">({detail.user.wallet_type || '?'})</span></p>
                  : <p className="text-sm text-gray-400 mt-0.5">Not set</p>}
              </div>
              <button
                onClick={() => setEditWalletUser(detail.user)}
                className="ml-3 px-3 py-1.5 rounded-lg bg-accent text-gray-900 text-xs font-bold hover:bg-yellow-400 transition flex-shrink-0"
              >
                Edit Wallet
              </button>
            </div>

            {/* Profile grid */}
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Email', detail.user?.email || '—'],
                ['Phone', detail.user?.phone || '—'],
                ['Invite Code', detail.user?.invite_code || '—'],
                ['Total Deposited', fmt(detail.user?.total_deposited)],
                ['Total Withdrawn', fmt(detail.user?.total_withdrawn)],
                ['Personal Gains', fmt(detail.user?.personal_gains)],
                ['Team Earnings', fmt(detail.user?.team_earnings)],
                ['Membership', `Level ${detail.user?.membership_level || 0}`],
                ['Referred By', detail.user?.referrer
                  ? `${detail.user.referrer.display} (${detail.user.referred_by})`
                  : detail.user?.referred_by
                    ? `${detail.user.referred_by} (referrer not found)`
                    : 'No referrer'],
                ['Total Referrals', detail.user?.total_referrals ?? '—'],
                ['Last IP', detail.user?.last_ip || '—'],
                ['Last Login', detail.user?.last_login ? new Date(detail.user.last_login).toLocaleString() : '—'],
                ['Joined', new Date(detail.user?.created_at).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{val}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 flex gap-1">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors
                    ${activeTab === t ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              {activeTab === 'Tickets' && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">Movie</th><th className="px-4 py-2 text-left text-xs text-gray-500">Price</th><th className="px-4 py-2 text-left text-xs text-gray-500">Profit</th><th className="px-4 py-2 text-left text-xs text-gray-500">Status</th><th className="px-4 py-2 text-left text-xs text-gray-500">Booked</th></tr></thead>
                  <tbody>
                    {(detail.tickets || []).length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No tickets</td></tr>
                    ) : (detail.tickets || []).map(t => (
                      <tr key={t.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium">{t.movie_title}</td>
                        <td className="px-4 py-2">{fmt(t.price)}</td>
                        <td className="px-4 py-2 text-green-600">+{fmt(t.profit_amount)}</td>
                        <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{timeAgo(t.booked_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'Recharges' && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">Amount</th><th className="px-4 py-2 text-left text-xs text-gray-500">Network</th><th className="px-4 py-2 text-left text-xs text-gray-500">Status</th><th className="px-4 py-2 text-left text-xs text-gray-500">Date</th></tr></thead>
                  <tbody>
                    {(detail.recharges || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No recharges</td></tr>
                    ) : (detail.recharges || []).map(r => (
                      <tr key={r.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-bold">{fmt(r.amount)}</td>
                        <td className="px-4 py-2">{r.network}</td>
                        <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{timeAgo(r.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'Withdrawals' && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">Amount</th><th className="px-4 py-2 text-left text-xs text-gray-500">Wallet</th><th className="px-4 py-2 text-left text-xs text-gray-500">Status</th><th className="px-4 py-2 text-left text-xs text-gray-500">Date</th></tr></thead>
                  <tbody>
                    {(detail.withdrawals || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No withdrawals</td></tr>
                    ) : (detail.withdrawals || []).map(w => (
                      <tr key={w.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-bold">{fmt(w.amount)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{(w.wallet_address || '').slice(0,18)}...</td>
                        <td className="px-4 py-2"><StatusBadge status={w.status} /></td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{timeAgo(w.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'Transactions' && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">Type</th><th className="px-4 py-2 text-left text-xs text-gray-500">Amount</th><th className="px-4 py-2 text-left text-xs text-gray-500">Balance After</th><th className="px-4 py-2 text-left text-xs text-gray-500">Note</th><th className="px-4 py-2 text-left text-xs text-gray-500">Date</th></tr></thead>
                  <tbody>
                    {(detail.transactions || []).length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>
                    ) : (detail.transactions || []).map(t => (
                      <tr key={t.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-medium capitalize">{t.type}</td>
                        <td className={`px-4 py-2 font-bold ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(t.amount)}</td>
                        <td className="px-4 py-2">{fmt(t.balance_after)}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{t.note || '—'}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{timeAgo(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'Login Logs' && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">IP Address</th><th className="px-4 py-2 text-left text-xs text-gray-500">Browser</th><th className="px-4 py-2 text-left text-xs text-gray-500">Date</th></tr></thead>
                  <tbody>
                    {(detail.login_logs || []).length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No login records</td></tr>
                    ) : (detail.login_logs || []).map((l, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{l.ip_address || '—'}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs max-w-xs truncate" title={l.user_agent}>{(l.user_agent || '—').slice(0, 60)}{l.user_agent?.length > 60 ? '…' : ''}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{l.logged_in_at ? new Date(l.logged_in_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Adjust Balance Modal — shared by table row button and detail modal button */}
      <AdjustBalanceModal
        open={!!adjustUser}
        onClose={() => setAdjustUser(null)}
        user={adjustUser}
        onSuccess={(newBalance) => handleAdjustSuccess(newBalance, adjustUser?.id)}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        user={deleteUser}
        onDeleted={handleDeleted}
      />

      {/* Edit Wallet Modal */}
      <EditWalletModal
        open={!!editWalletUser}
        onClose={() => setEditWalletUser(null)}
        user={editWalletUser}
        onSuccess={(addr, type) => handleWalletSuccess(addr, type, editWalletUser?.id)}
      />
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImagePreview } from '../components/ImagePreview'
import { ImageUpload } from '../components/ImageUpload'
import { useAppToast } from '../components/AdminLayout'

const EMPTY = {
  name: '', image_url: '', type: 'stable', roi_percent: '', duration_days: '',
  funding_goal: '', funded_amount: 0, min_investment: 100, sort_order: 0, is_active: true,
}

const TABS = ['stable', 'high_yield']

export default function InvestmentsAdmin() {
  const toast = useAppToast()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('stable')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [fundingTarget, setFundingTarget] = useState(null)
  const [fundingVal, setFundingVal]       = useState('')
  const [fundingSaving, setFundingSaving] = useState(false)
  const [startTarget, setStartTarget]     = useState(null)
  const [startSaving, setStartSaving]     = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/investments')
      .then(d => setData(d.investments || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm({ ...EMPTY, type: tab }); setFormOpen(true) }
  function openEdit(p) { setEditing(p); setForm({ ...EMPTY, ...p }); setFormOpen(true) }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name || !form.roi_percent || !form.duration_days || !form.funding_goal)
      return toast('Name, ROI, Duration and Funding Goal are required.', 'warning')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/investments/${editing.id}`, form)
        toast('Investment updated!')
      } else {
        await api.post('/admin/investments', form)
        toast('Investment added!')
      }
      setFormOpen(false)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/investments/${deleteTarget.id}`)
      toast('Investment deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  async function handleUpdateFunding() {
    setFundingSaving(true)
    try {
      await api.patch(`/admin/investments/${fundingTarget.id}/funding`, { funded_amount: Number(fundingVal) })
      toast('Funding updated!')
      setFundingTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setFundingSaving(false) }
  }

  async function handleStartFunding() {
    setStartSaving(true)
    try {
      const d = await api.post(`/admin/investments/${startTarget.id}/start-funding`, {})
      toast(`Global timer started! ${d.investors_updated} investor(s) updated.`)
      setStartTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setStartSaving(false) }
  }

  const filtered = data.filter(p => p.type === tab)

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const rows = filtered.map(p => [
    p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-gray-100 rounded" />,
    <span className="font-medium text-gray-800">{p.name}</span>,
    `${p.roi_percent}%`,
    `${p.duration_days}d`,
    <div className="text-xs">
      <span className="font-semibold">${Number(p.funded_amount).toLocaleString()}</span>
      <span className="text-gray-400"> / ${Number(p.funding_goal).toLocaleString()}</span>
    </div>,
    `$${p.min_investment}`,
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs font-semibold ${p.is_active ? 'text-green-600' : 'text-gray-400'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
      {p.is_funded
        ? <span className="text-[10px] font-bold text-accent">Funded & Active</span>
        : <span className="text-[10px] text-gray-400">Awaiting Start</span>}
      {p.is_funded && p.global_start_time && <span className="text-[10px] text-gray-400">Started: {fmtDate(p.global_start_time)}</span>}
      {p.is_funded && p.global_end_time   && <span className="text-[10px] text-gray-400">Ends: {fmtDate(p.global_end_time)}</span>}
    </div>,
    <div className="flex gap-1.5 flex-wrap">
      <button onClick={() => openEdit(p)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition">Edit</button>
      <button onClick={() => { setFundingTarget(p); setFundingVal(p.funded_amount ?? 0) }} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition">Update Funding</button>
      {!p.is_funded && (
        <button onClick={() => setStartTarget(p)} className="px-2.5 py-1 rounded-lg bg-accent text-gray-900 text-xs font-bold hover:bg-yellow-400 transition">Start Global Timer</button>
      )}
      <button onClick={() => setDeleteTarget(p)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">Delete</button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-accent text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >{t === 'stable' ? 'Stable Investment' : 'High Yield'}</button>
          ))}
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 transition">
          + Add Product
        </button>
      </div>

      <DataTable
        headers={['Image', 'Name', 'ROI%', 'Duration', 'Funded / Goal', 'Min Invest', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No investment products in this category."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Investment"
        message={`Delete "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      <ConfirmDialog
        open={!!startTarget}
        title="Start Global Investment Timer"
        message={`Start the global investment timer for "${startTarget?.name}"? All investors will start earning from now. This cannot be undone.`}
        onConfirm={handleStartFunding}
        onCancel={() => setStartTarget(null)}
        loading={startSaving}
      />

      {/* Update Funding Modal */}
      <Modal open={!!fundingTarget} onClose={() => setFundingTarget(null)} title="Update Funded Amount">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Set the current funded amount for <strong>{fundingTarget?.name}</strong> (goal: ${fundingTarget?.funding_goal}).</p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Funded Amount ($)</label>
            <input type="number" value={fundingVal} onChange={e => setFundingVal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setFundingTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleUpdateFunding} disabled={fundingSaving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
              {fundingSaving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Investment' : 'Add Investment'} wide>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Name *', key: 'name', type: 'text', full: true },
            { label: 'ROI Percent *', key: 'roi_percent', type: 'number' },
            { label: 'Duration (days) *', key: 'duration_days', type: 'number' },
            { label: 'Funding Goal ($) *', key: 'funding_goal', type: 'number' },
            { label: 'Current Funded ($)', key: 'funded_amount', type: 'number' },
            { label: 'Min Investment ($)', key: 'min_investment', type: 'number' },
            { label: 'Sort Order', key: 'sort_order', type: 'number' },
          ].map(({ label, key, type, full }) => (
            <div key={key} className={full ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input type={type} value={form[key] ?? ''} onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
          ))}

          <div className="col-span-2">
            <ImageUpload
              value={form.image_url}
              onChange={url => set('image_url', url)}
              folder="investments"
              label="Product Image"
              aspectHint="Recommended: 400×400px"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40">
              <option value="stable">Stable Investment</option>
              <option value="high_yield">High Yield Investment</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-5">
            <label className="text-xs font-semibold text-gray-500">Is Active</label>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}>
              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {editing ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

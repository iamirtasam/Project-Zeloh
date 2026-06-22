import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImagePreview } from '../components/ImagePreview'
import { ImageUpload } from '../components/ImageUpload'
import { useAppToast } from '../components/AdminLayout'

const EMPTY = { image_url: '', link_url: '', sort_order: 0, is_active: true }

export default function Banners() {
  const toast = useAppToast()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/banners')
      .then(d => setData(d.banners || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(b) { setEditing(b); setForm({ ...EMPTY, ...b }); setFormOpen(true) }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.image_url) return toast('Image URL is required.', 'warning')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/banners/${editing.id}`, form)
        toast('Banner updated!')
      } else {
        await api.post('/admin/banners', form)
        toast('Banner added!')
      }
      setFormOpen(false)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/banners/${deleteTarget.id}`)
      toast('Banner deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  async function handleToggle(b) {
    try {
      await api.post(`/admin/banners/${b.id}/toggle`, {})
      toast(`Banner ${b.is_active ? 'deactivated' : 'activated'}.`)
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  const rows = data.map(b => [
    b.image_url ? <img src={b.image_url} alt="" className="h-10 w-20 object-cover rounded" /> : <div className="h-10 w-20 bg-gray-100 rounded" />,
    <span className="text-xs text-gray-500 truncate max-w-xs block">{b.link_url || '—'}</span>,
    b.sort_order,
    <span className={`text-xs font-semibold ${b.is_active ? 'text-green-600' : 'text-gray-400'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>,
    <div className="flex gap-1.5">
      <button onClick={() => openEdit(b)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition">Edit</button>
      <button onClick={() => handleToggle(b)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${b.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{b.is_active ? 'Deactivate' : 'Activate'}</button>
      <button onClick={() => setDeleteTarget(b)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">Delete</button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 transition">
          + Add Banner
        </button>
      </div>

      <DataTable
        headers={['Image', 'Link URL', 'Sort Order', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No banners yet."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Banner"
        message="Delete this banner? Cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'}>
        <div className="flex flex-col gap-4">
          <ImageUpload
            value={form.image_url}
            onChange={url => set('image_url', url)}
            folder="banners"
            label="Banner Image"
            aspectHint="Recommended: 1170×490px"
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Link URL (optional)</label>
            <input type="text" value={form.link_url || ''} onChange={e => set('link_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sort Order</label>
            <input type="number" value={form.sort_order ?? 0} onChange={e => set('sort_order', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-500">Is Active</label>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}>
              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
              {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {editing ? 'Save Changes' : 'Add Banner'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

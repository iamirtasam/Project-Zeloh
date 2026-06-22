import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAppToast } from '../components/AdminLayout'

const EMPTY = { title: '', contact: '' }

// H12 — only return the URL if it's http or https; otherwise '#'.
function safeHref(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url
  } catch {}
  return '#'
}

export default function ServicesAdmin() {
  const toast = useAppToast()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/services')
      .then(d => setData(d.services || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title || !form.contact) return toast('Title and contact are required.', 'warning')
    // H12 — enforce http(s) on the client too.
    if (safeHref(form.contact) === '#') {
      return toast('Contact must be a valid http(s) URL.', 'warning')
    }
    setSaving(true)
    try {
      await api.post('/admin/services', form)
      toast('Service added!')
      setFormOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/services/${deleteTarget.id}`)
      toast('Service deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  const rows = data.map(s => [
    <span className="font-medium text-gray-800">{s.title}</span>,
    <a href={safeHref(s.contact)} target="_blank" rel="noopener noreferrer" className="text-accent text-sm hover:underline truncate block max-w-xs">{s.contact}</a>,
    <button onClick={() => setDeleteTarget(s)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">Delete</button>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm(EMPTY); setFormOpen(true) }} className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 transition">
          + Add Service
        </button>
      </div>

      <DataTable
        headers={['Title', 'Contact URL', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No services yet."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Service"
        message={`Delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Service">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Title (e.g. "Support 1")</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Support 1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Contact URL (WhatsApp link or URL)</label>
            <input type="text" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="https://wa.me/1234567890"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
              {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Add Service
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

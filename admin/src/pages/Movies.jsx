import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImagePreview } from '../components/ImagePreview'
import { ImageUpload } from '../components/ImageUpload'
import { useAppToast } from '../components/AdminLayout'

const EMPTY = {
  title: '', description: '', introduction: '', poster_url: '',
  price: '', profit_percent: 3, duration_hours: 24,
  sheets_per_ticket: 1,
  section: 'popular', sort_order: 0, is_active: true,
}

export default function Movies() {
  const toast = useAppToast()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [shuffleConfirm, setShuffleConfirm] = useState(false)
  const [shuffling, setShuffling] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/movies')
      .then(d => setData(d.movies || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(m) {
    setEditing(m)
    setForm({ ...EMPTY, ...m, price: m.price ?? '', profit_percent: m.profit_percent ?? 3, duration_hours: m.duration_hours ?? 24 })
    setFormOpen(true)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title || !form.price) return toast('Title and price are required.', 'warning')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/movies/${editing.id}`, form)
        toast('Movie updated!')
      } else {
        await api.post('/admin/movies', form)
        toast('Movie added!')
      }
      setFormOpen(false)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/movies/${deleteTarget.id}`)
      toast('Movie deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  async function handleToggle(m) {
    try {
      await api.post(`/admin/movies/${m.id}/toggle`, {})
      toast(`Movie ${m.is_active ? 'deactivated' : 'activated'}.`)
      load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function handleShuffle() {
    setShuffling(true)
    try {
      await api.post('/admin/shuffle-movies', {})
      toast('Movies shuffled! Sections and sort orders updated.')
      setShuffleConfirm(false)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setShuffling(false) }
  }

  const rows = data.map(m => [
    m.poster_url ? <img src={m.poster_url} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 bg-gray-100 rounded" />,
    <span className="font-medium text-gray-800">{m.title}</span>,
    `$${m.price}`,
    `${m.profit_percent}%`,
    `${m.duration_hours}h`,
    <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{m.section}</span>,
    <span className={`text-xs font-semibold ${m.is_active ? 'text-green-600' : 'text-gray-400'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>,
    <div className="flex gap-1.5">
      <button onClick={() => openEdit(m)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition">Edit</button>
      <button onClick={() => handleToggle(m)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${m.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{m.is_active ? 'Deactivate' : 'Activate'}</button>
      <button onClick={() => setDeleteTarget(m)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">Delete</button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <button onClick={() => setShuffleConfirm(true)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          Shuffle Movies
        </button>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 transition">
          + Add Movie
        </button>
      </div>

      <DataTable
        headers={['Poster', 'Title', 'Price', 'Profit%', 'Duration', 'Section', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No movies yet. Add one!"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Movie"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      <ConfirmDialog
        open={shuffleConfirm}
        title="Shuffle Movies Now"
        message="Randomly assign 3 movies to Popular and the rest to Showing Up. Sort orders will also be randomised."
        onConfirm={handleShuffle}
        onCancel={() => setShuffleConfirm(false)}
        loading={shuffling}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Movie' : 'Add Movie'} wide>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Title *', key: 'title', type: 'text', full: true },
            { label: 'Description', key: 'description', type: 'textarea', full: true },
            { label: 'Introduction', key: 'introduction', type: 'text', full: true },
            { label: 'Price (USD) *', key: 'price', type: 'number' },
            { label: 'Profit %', key: 'profit_percent', type: 'number' },
            { label: 'Duration (hours)', key: 'duration_hours', type: 'number' },
            { label: 'Sheets per ticket', key: 'sheets_per_ticket', type: 'number' },
            { label: 'Sort order', key: 'sort_order', type: 'number' },
          ].map(({ label, key, type, full }) => (
            <div key={key} className={full ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              ) : (
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              )}
            </div>
          ))}

          {/* Poster upload */}
          <div className="col-span-2">
            <ImageUpload
              value={form.poster_url}
              onChange={url => set('poster_url', url)}
              folder="movies"
              label="Movie Poster"
              aspectHint="Recommended: 400×600px"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Section</label>
            <select
              value={form.section}
              onChange={e => set('section', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="popular">Popular</option>
              <option value="showing_up">Showing Up</option>
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-5">
            <label className="text-xs font-semibold text-gray-500">Is Active</label>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-400' : 'bg-gray-300'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {editing ? 'Save Changes' : 'Add Movie'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

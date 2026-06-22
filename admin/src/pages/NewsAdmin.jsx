import { useState, useEffect, useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { api } from '../lib/api'
import { DataTable } from '../components/DataTable'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImagePreview } from '../components/ImagePreview'
import { ImageUpload } from '../components/ImageUpload'
import { useAppToast } from '../components/AdminLayout'

const EMPTY = { title: '', content: '', image_url: '', published_at: new Date().toISOString().slice(0, 10), is_active: true }

const MD_GUIDE = [
  { syntax: '**bold text**',   result: 'Bold text' },
  { syntax: '*italic text*',   result: 'Italic text' },
  { syntax: '# Heading 1',     result: 'Large heading' },
  { syntax: '## Heading 2',    result: 'Medium heading' },
  { syntax: '### Heading 3',   result: 'Small heading' },
  { syntax: '- item',          result: 'Bullet list' },
  { syntax: '1. item',         result: 'Numbered list' },
  { syntax: '> quote',         result: 'Yellow blockquote' },
  { syntax: '---',             result: 'Yellow divider line' },
  { syntax: '[text](url)',     result: 'Clickable link' },
]

export default function NewsAdmin() {
  const toast = useAppToast()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/news')
      .then(d => setData(d.news || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm({ ...EMPTY, published_at: new Date().toISOString().slice(0,10) }); setFormOpen(true) }
  function openEdit(n) { setEditing(n); setForm({ ...EMPTY, ...n, published_at: n.published_at?.slice(0,10) || new Date().toISOString().slice(0,10) }); setFormOpen(true) }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.title) return toast('Title is required.', 'warning')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/news/${editing.id}`, form)
        toast('News updated!')
      } else {
        await api.post('/admin/news', form)
        toast('News added!')
      }
      setFormOpen(false)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/news/${deleteTarget.id}`)
      toast('News deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  const rows = data.map(n => [
    n.image_url ? <img src={n.image_url} alt="" className="h-10 w-16 object-cover rounded" /> : <div className="h-10 w-16 bg-gray-100 rounded" />,
    <span className="font-medium text-gray-800 max-w-xs truncate block">{n.title}</span>,
    n.published_at ? new Date(n.published_at).toLocaleDateString() : '—',
    <span className={`text-xs font-semibold ${n.is_active ? 'text-green-600' : 'text-gray-400'}`}>{n.is_active ? 'Active' : 'Inactive'}</span>,
    <div className="flex gap-1.5">
      <button onClick={() => openEdit(n)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition">Edit</button>
      <button onClick={() => setDeleteTarget(n)} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition">Delete</button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 transition">
          + Add News
        </button>
      </div>

      <DataTable
        headers={['Image', 'Title', 'Published', 'Status', 'Actions']}
        rows={rows}
        loading={loading}
        emptyMessage="No news articles yet."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete News"
        message={`Delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit News' : 'Add News'} wide>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Title *</label>
            <input type="text" value={form.title || ''} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="text-xs font-semibold text-gray-500">Article Content</label>
                <span className="text-xs text-gray-400 ml-2">Supports markdown formatting</span>
              </div>
            </div>
            <div data-color-mode="light">
              <MDEditor
                value={form.content || ''}
                onChange={val => set('content', val || '')}
                height={400}
                preview="live"
                visibleDragbar={false}
                hideToolbar={false}
                enableScroll={true}
                textareaProps={{ placeholder: 'Write article content here...\n\nSupports **bold**, *italic*, # headings,\n- bullet lists, and more' }}
              />
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setGuideOpen(o => !o)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent/20 text-gray-700 hover:bg-accent/40 transition flex items-center gap-1"
              >
                Markdown Guide {guideOpen ? '▴' : '▾'}
              </button>
              {guideOpen && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 w-1/2">What you type</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">What it shows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MD_GUIDE.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-1.5 font-mono text-gray-700">{row.syntax}</td>
                          <td className="px-3 py-1.5 text-gray-500">{row.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <ImageUpload
            value={form.image_url}
            onChange={url => set('image_url', url)}
            folder="news"
            label="News Image"
            aspectHint="Recommended: 800×420px"
          />
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Published At</label>
            <input type="date" value={form.published_at || ''} onChange={e => set('published_at', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button onClick={() => setFormOpen(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-accent text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
              {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {editing ? 'Save Changes' : 'Add News'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

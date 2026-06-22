import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAppToast } from '../components/AdminLayout'

export default function NotificationsAdmin() {
  const toast = useAppToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/notifications-history')
      .then(d => setNotifications(d.notifications || []))
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const active = notifications.find(n => n.is_active)

  async function handleSet() {
    if (!text.trim()) return toast('Notification text is required.', 'warning')
    setSaving(true)
    try {
      await api.post('/admin/notifications', { notification_text: text })
      toast('Notification set!')
      setText('')
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/admin/notifications/${deleteTarget.id}`)
      toast('Notification deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) { toast(err.message, 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Current active preview */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Current Active Notification</h2>
        <div className="bg-accent rounded-xl px-5 py-3 overflow-hidden">
          {active ? (
            <div className="whitespace-nowrap overflow-hidden">
              <span
                className="inline-block text-gray-900 font-medium text-sm"
                style={{ animation: 'marquee 20s linear infinite' }}
              >
                {active.notification_text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          ) : (
            <p className="text-gray-700 text-sm italic">No active notification.</p>
          )}
        </div>
        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>

      {/* Set new */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Set New Notification</h2>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder="Enter notification text (e.g. 🎉 New investment products available now!)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
        />
        <button
          onClick={handleSet}
          disabled={saving}
          className="mt-3 px-5 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2 transition"
        >
          {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
          Set as Active
        </button>
      </div>

      {/* Past notifications */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">All Notifications</h2>
        </div>
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({length:3}).map((_,i) => <div key={i} className="skeleton h-4 rounded w-full" />)}
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div key={n.id} className={`px-5 py-3 flex items-start justify-between gap-3 ${n.is_active ? 'bg-yellow-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium truncate">{n.notification_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {n.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(n)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Notification"
        message="Delete this notification?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAppToast } from '../components/AdminLayout'
import { ImageUpload } from '../components/ImageUpload'

function WalletSection({ network, initial, onSave }) {
  const [address, setAddress] = useState(initial?.address || '')
  const [qrUrl, setQrUrl]     = useState(initial?.qr_code_url || '')
  const [saving, setSaving]   = useState(false)
  const toast = useAppToast()

  async function handleSave() {
    if (!address.trim()) return toast('Address is required.', 'warning')
    setSaving(true)
    try {
      await onSave({ address, qr_code_url: qrUrl })
      toast(`${network} wallet updated!`)
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-bold">{network}</span>
        Wallet Address
      </h3>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Address *</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={`${network} address`}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/40" />
        </div>
        <ImageUpload
          value={qrUrl}
          onChange={setQrUrl}
          folder="qr"
          label="QR Code Image (optional)"
          aspectHint="Recommended: 400×400px"
        />
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2 transition">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Save {network} Address
          </button>
        </div>
      </div>
    </div>
  )
}

function PopupSection() {
  const toast = useAppToast()
  const [form, setForm]   = useState({ enabled: false, image_url: '', link_url: '', show_once: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.get('/popup-settings')
      .then(d => setForm({ enabled: !!d.enabled, image_url: d.image_url || '', link_url: d.link_url || '', show_once: d.show_once !== false }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/admin/popup-settings', form)
      toast('Popup settings saved!')
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="bg-white rounded-xl border border-gray-100 p-5 skeleton h-48" />

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold text-gray-700 mb-1">Popup Banner</h2>
      <p className="text-xs text-gray-400 mb-4">Show a full-screen promotional popup to users when they open the app.</p>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">Enable Popup</label>
          <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className={`w-10 h-5 rounded-full transition-colors ${form.enabled ? 'bg-green-400' : 'bg-gray-300'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <ImageUpload
          value={form.image_url}
          onChange={url => setForm(f => ({ ...f, image_url: url }))}
          folder="banners"
          label="Popup Image"
          aspectHint="Recommended: 600×800px (portrait)"
        />

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Redirect Link (optional)</label>
          <input
            type="text"
            value={form.link_url}
            onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
            placeholder="https://... leave empty for no link"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500">Show once per session</label>
            <p className="text-xs text-gray-400 mt-0.5">ON = show once per visit, OFF = show every page refresh</p>
          </div>
          <button type="button" onClick={() => setForm(f => ({ ...f, show_once: !f.show_once }))}
            className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.show_once ? 'bg-green-400' : 'bg-gray-300'}`}>
            <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.show_once ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2 transition">
            {saving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Save Popup Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const toast = useAppToast()
  const [wallets, setWallets]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [adminSaving, setAdminSaving] = useState(false)
  const [discord, setDiscord]   = useState({ webhook_url: '', role_id: '' })
  const [discordSaving, setDiscordSaving] = useState(false)
  const [discordTesting, setDiscordTesting] = useState(false)

  useEffect(() => {
    api.get('/admin/wallets')
      .then(d => {
        const map = {}
        ;(d.wallets || []).forEach(w => { map[w.network] = w })
        setWallets(map)
      })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setLoading(false))

    api.get('/admin/discord-settings')
      .then(d => setDiscord({ webhook_url: d.webhook_url || '', role_id: d.role_id || '' }))
      .catch(() => {})
  }, [])

  async function handleDiscordSave() {
    setDiscordSaving(true)
    try {
      await api.post('/admin/discord-settings', discord)
      toast('Discord settings saved!')
    } catch (err) { toast(err.message, 'error') }
    finally { setDiscordSaving(false) }
  }

  async function handleDiscordTest() {
    if (!discord.webhook_url) return toast('Save a webhook URL first.', 'warning')
    setDiscordTesting(true)
    try {
      await api.post('/admin/discord-settings/test', {})
      toast('Test message sent to Discord!')
    } catch (err) { toast(err.message, 'error') }
    finally { setDiscordTesting(false) }
  }

  async function handleAdminCreate() {
    const { name, email, password, confirm } = adminForm
    if (!name || !email || !password) return toast('All fields are required.', 'warning')
    if (password !== confirm) return toast('Passwords do not match.', 'warning')
    setAdminSaving(true)
    try {
      await api.post('/admin/create-admin', { name, email, password })
      toast('Admin account created!')
      setAdminForm({ name: '', email: '', password: '', confirm: '' })
    } catch (err) { toast(err.message, 'error') }
    finally { setAdminSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-base font-bold text-gray-700">Wallet Addresses</h2>

      {loading ? (
        <div className="flex flex-col gap-4">
          {['TRC20','ERC20'].map(n => <div key={n} className="bg-white rounded-xl border border-gray-100 p-5 skeleton h-36" />)}
        </div>
      ) : (
        <>
          {['TRC20','ERC20'].map(network => (
            <WalletSection
              key={network}
              network={network}
              initial={wallets[network]}
              onSave={(body) => api.put(`/admin/wallet/${network}`, body)}
            />
          ))}
        </>
      )}

      <div className="h-px bg-gray-100" />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Create Admin Account</h2>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Name', key: 'name', type: 'text', placeholder: 'Admin name' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'admin@zeloh.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input type={type} value={adminForm[key]} onChange={e => setAdminForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button onClick={handleAdminCreate} disabled={adminSaving}
              className="px-4 py-2 rounded-lg bg-sidebar text-white font-semibold text-sm hover:bg-opacity-80 disabled:opacity-50 flex items-center gap-2 transition">
              {adminSaving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Create Admin
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <PopupSection />

      <div className="h-px bg-gray-100" />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-1">Discord Notifications</h2>
        <p className="text-xs text-gray-400 mb-4">Get notified in Discord when users register, recharge, or withdraw.</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Webhook URL</label>
            <input
              type="text"
              value={discord.webhook_url}
              onChange={e => setDiscord(d => ({ ...d, webhook_url: e.target.value }))}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role ID to Tag (optional)</label>
            <input
              type="text"
              value={discord.role_id}
              onChange={e => setDiscord(d => ({ ...d, role_id: e.target.value }))}
              placeholder="e.g. 123456789012345678"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={handleDiscordTest}
              disabled={discordTesting}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {discordTesting && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Test Webhook
            </button>
            <button
              onClick={handleDiscordSave}
              disabled={discordSaving}
              className="px-4 py-2 rounded-lg bg-accent text-gray-900 font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {discordSaving && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'

export function ImageUpload({ value, onChange, folder, label = 'Image', aspectHint }) {
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput]         = useState('')
  const fileRef = useRef(null)

  const API   = import.meta.env.VITE_API_URL
  const token = localStorage.getItem('zeloh_admin_token')

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', folder)
      const res  = await fetch(`${API}/admin/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Upload failed')
      onChange(data.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleUrlSubmit() {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setShowUrlInput(false)
      setUrlInput('')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
        {aspectHint && (
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{aspectHint}</span>
        )}
      </div>

      {value && (
        <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
          <img
            src={value}
            alt="Preview"
            style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, border: '1px solid #E5E7EB', display: 'block' }}
          />
          <button
            onClick={() => onChange('')}
            title="Remove image"
            style={{
              position: 'absolute', top: 4, right: 4,
              background: '#ef4444', color: 'white', border: 'none',
              borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '7px 14px',
            background: uploading ? '#D1D5DB' : '#F5C518',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 6,
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {uploading ? (
            <>
              <span style={{
                width: 12, height: 12,
                border: '2px solid #666', borderTopColor: 'transparent',
                borderRadius: '50%', display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              Uploading...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Image
            </>
          )}
        </button>

        <button
          onClick={() => setShowUrlInput(v => !v)}
          style={{
            padding: '7px 14px',
            background: 'white',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Or paste URL
        </button>
      </div>

      {showUrlInput && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://..."
            style={{ flex: 1, padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={handleUrlSubmit}
            style={{ padding: '7px 14px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Use URL
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}

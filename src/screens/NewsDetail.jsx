import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = import.meta.env.VITE_OTP_SERVER_URL

export default function NewsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [news, setNews]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    setLoading(true); setError(false)
    fetch(`${API}/news/${id}`)
      .then(r => r.json())
      .then(d => { if (d.news) setNews(d.news); else setError(true) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const pubDate = news?.published_at
    ? new Date(news.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100vh', background: 'white', paddingBottom: 32 }}>
      <style>{`@keyframes shim{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: '4px 4px 4px 0', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>News</span>
        <div style={{ width: 22 }} />
      </div>

      {loading ? (
        <div style={{ padding: 0 }}>
          <div style={{ height: 200, background: '#F3F4F6', animation: 'shim 1.4s ease-in-out infinite' }} />
          <div style={{ padding: '16px' }}>
            <div style={{ height: 20, background: '#F3F4F6', borderRadius: 6, width: '85%', marginBottom: 10, animation: 'shim 1.4s ease-in-out infinite' }} />
            <div style={{ height: 12, background: '#F3F4F6', borderRadius: 5, width: '35%', marginBottom: 20, animation: 'shim 1.4s ease-in-out infinite' }} />
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 11, background: '#F3F4F6', borderRadius: 5, marginBottom: 8, width: i % 3 === 0 ? '70%' : '100%', animation: 'shim 1.4s ease-in-out infinite' }} />)}
          </div>
        </div>
      ) : error || !news ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Article not found</p>
        </div>
      ) : (
        <>
          {news.image_url ? (
            <img src={news.image_url} alt={news.title} style={{ width: '100%', height: 200, objectFit: 'cover', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} />
          ) : (
            <div style={{ height: 200, background: 'linear-gradient(135deg,#E0A800,#F5C518)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} />
          )}
          <div style={{ padding: '18px 16px 0' }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1.4, marginBottom: 8 }}>{news.title}</h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>{pubDate}</p>
            <div style={{ height: 1, background: '#F3F4F6', marginBottom: 16 }} />
          </div>
          <div className="news-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginTop: 24, marginBottom: 12, lineHeight: 1.3, borderBottom: '2px solid #F5C518', paddingBottom: 8 }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', marginTop: 20, marginBottom: 10, lineHeight: 1.3 }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginTop: 16, marginBottom: 8, lineHeight: 1.3 }}>{children}</h3>
                ),
                p: ({ children }) => (
                  <p style={{ fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 16 }}>{children}</p>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 700, color: '#1a1a1a' }}>{children}</strong>
                ),
                em: ({ children }) => (
                  <em style={{ fontStyle: 'italic', color: '#555' }}>{children}</em>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ol>
                ),
                li: ({ children }) => (
                  <li style={{ fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 6 }}>{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{ borderLeft: '4px solid #F5C518', paddingLeft: 16, paddingTop: 4, paddingBottom: 4, marginLeft: 0, marginBottom: 16, background: '#FFF8DC', borderRadius: '0 8px 8px 0' }}>{children}</blockquote>
                ),
                code: ({ inline, children }) => (
                  inline ? (
                    <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13, color: '#e11d48', fontFamily: 'monospace' }}>{children}</code>
                  ) : (
                    <pre style={{ background: '#1a1a1a', color: '#f0f0f0', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, marginBottom: 16 }}>
                      <code>{children}</code>
                    </pre>
                  )
                ),
                hr: () => (
                  <hr style={{ border: 'none', borderTop: '2px solid #F5C518', margin: '24px 0', opacity: 0.4 }} />
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#F5C518', textDecoration: 'underline', fontWeight: 500 }}>{children}</a>
                ),
                img: ({ src, alt }) => (
                  <img src={src} alt={alt} draggable="false" onContextMenu={e => e.preventDefault()} style={{ width: '100%', borderRadius: 8, marginBottom: 16, display: 'block' }} />
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th style={{ background: '#F5C518', color: '#1a1a1a', padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb' }}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', color: '#444', verticalAlign: 'top' }}>{children}</td>
                ),
                tr: ({ children }) => (
                  <tr style={{ background: 'white' }}>{children}</tr>
                ),
              }}
            >
              {news.content || 'Full article coming soon'}
            </ReactMarkdown>
          </div>
        </>
      )}
    </div>
  )
}

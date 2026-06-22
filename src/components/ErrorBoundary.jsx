import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '24px',
          background: '#fff', textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="#EF4444" />
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
            Please refresh the page
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#F5C518', color: '#1a1a1a',
              border: 'none', borderRadius: 24,
              padding: '12px 32px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: 16, fontSize: 11, color: '#999',
              textAlign: 'left', maxWidth: '100%', overflow: 'auto',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

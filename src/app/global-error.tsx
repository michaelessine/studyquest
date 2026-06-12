'use client'
// Root error boundary — last resort if the root layout itself fails.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#030712', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>{error.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => reset()}
              style={{ marginTop: 20, padding: '8px 16px', background: '#c2410c', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

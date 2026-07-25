export default function ClientDetailLoading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ height: '1.5rem', width: '50%', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
            <div style={{ height: '1rem', width: '60%', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '0.875rem', width: '80%', background: '#e5e7eb', borderRadius: '0.25rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
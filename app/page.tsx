export default function HomePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start', 
        minHeight: '100vh',
        paddingTop: '60px',
        textAlign: 'center',
      }}
    >
      
      <h1 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>
        University of Toronto Japanese Network
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        トロント大学日本人ネットワーク
      </p>

      <a
        href=""
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold',
        }}
      >
        Join us!
      </a>
    </div>
  );
}

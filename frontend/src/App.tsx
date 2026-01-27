import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(JSON.stringify(d, null, 2)))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>
      <h1>Intent Drift Radar</h1>
      <p>Frontend + backend from one container.</p>
      <pre>{health ?? '…'}</pre>
    </div>
  )
}

export default App

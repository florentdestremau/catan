import { useState } from 'react'

interface SetupProps {
  onStart: (names: string[]) => void
}

export function Setup({ onStart }: SetupProps) {
  const [count, setCount] = useState(3)
  const [names, setNames] = useState(['Alice', 'Bob', 'Claire', 'David'])

  function updateName(i: number, val: string) {
    setNames(prev => prev.map((n, idx) => idx === i ? val : n))
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a1a2e', color: '#eee', fontFamily: 'sans-serif',
    }}>
      <div style={{ background: '#16213e', borderRadius: 12, padding: 32, width: 340 }}>
        <h2 style={{ margin: '0 0 20px', textAlign: 'center' }}>🏝️ Catan</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14 }}>Nombre de joueurs</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4].map(n => (
              <button key={n}
                style={{
                  flex: 1, padding: 8, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: count === n ? '#e67e22' : '#333', color: '#fff', fontWeight: 'bold',
                }}
                onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Joueur {i + 1}</label>
            <input
              value={names[i]}
              onChange={e => updateName(i, e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #444',
                background: '#222', color: '#fff', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        <button
          style={{
            width: '100%', padding: '10px', marginTop: 16, borderRadius: 8, border: 'none',
            background: '#27ae60', color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
          }}
          onClick={() => onStart(names.slice(0, count))}
        >
          Commencer
        </button>
      </div>
    </div>
  )
}

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
      background: 'radial-gradient(circle at top, #1a2a4e 0%, #0f0f1a 70%)',
      color: '#eee', fontFamily: 'sans-serif', padding: 24,
    }}>
      <div style={{
        display: 'flex', gap: 32, alignItems: 'stretch',
        maxWidth: 900, width: '100%', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <div style={{
          flex: '1 1 380px', maxWidth: 460,
          background: 'rgba(22,33,62,0.6)', border: '1px solid #2a3a5a',
          borderRadius: 16, padding: 28, backdropFilter: 'blur(6px)',
        }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 42 }}>🏝️ Catan</h1>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5, color: '#cfd8e3' }}>
            Une adaptation hotseat (2-4 joueurs sur le même écran) des <strong>Colons de Catan</strong>,
            implémentée en React + TypeScript. Partie rapide, sauvegarde locale automatique.
          </p>
          <h3 style={{ margin: '18px 0 8px', fontSize: 20, color: '#e67e22', textTransform: 'uppercase', letterSpacing: 1 }}>
            Règles couvertes
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: '#cfd8e3' }}>
            <li>Placement initial en serpent (2 colonies + 2 routes)</li>
            <li>Production sur jet de dés, voleur sur un 7</li>
            <li>Défausse (&gt;7 cartes), déplacement du voleur, vol</li>
            <li>Construction : route, colonie, ville, carte dév</li>
            <li>Cartes dév : chevalier, abondance, monopole, routes, PV</li>
            <li>Plus grande armée (+2 PV à partir de 3 chevaliers)</li>
            <li>Échange 4:1 avec la banque</li>
            <li>Victoire à <strong>10 PV</strong></li>
          </ul>
          <p style={{ margin: '16px 0 0', fontSize: 16, color: '#7a8a9a' }}>
            Non inclus : ports, commerce entre joueurs, plus longue route.
          </p>
        </div>

        <div style={{
          flex: '0 1 340px',
          background: '#16213e', borderRadius: 16, padding: 28, alignSelf: 'flex-start',
        }}>
          <h2 style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 29 }}>Nouvelle partie</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 18 }}>Nombre de joueurs</label>
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
              <label style={{ display: 'block', marginBottom: 4, fontSize: 17 }}>Joueur {i + 1}</label>
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
              background: '#27ae60', color: '#fff', fontSize: 21, fontWeight: 'bold', cursor: 'pointer',
            }}
            onClick={() => onStart(names.slice(0, count))}
          >
            Commencer
          </button>
        </div>
      </div>
    </div>
  )
}

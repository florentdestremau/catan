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
      minHeight: '100vh',
      background:
        'radial-gradient(ellipse at 20% -10%, #2a4a8e33 0%, transparent 50%),' +
        'radial-gradient(ellipse at 80% 110%, #e67e2222 0%, transparent 50%),' +
        'linear-gradient(180deg, #0f1424 0%, #0a0a12 100%)',
      color: '#eee', fontFamily: 'sans-serif',
      padding: 'clamp(16px, 3vw, 40px)',
    }}>
      {/* Hero */}
      <header style={{
        maxWidth: 1200, margin: '0 auto 40px', textAlign: 'center', paddingTop: 24,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(44px, 7vw, 76px)',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -1.5,
          background: 'linear-gradient(135deg, #f39c12 0%, #e74c3c 50%, #8e44ad 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          🏝️ Catan
        </h1>
        <p style={{
          margin: '14px auto 0', maxWidth: 620,
          fontSize: 'clamp(15px, 2vw, 19px)', lineHeight: 1.5, color: '#b8c5d6',
        }}>
          Une adaptation <strong style={{ color: '#fff' }}>hotseat</strong> des Colons de Catan
          pour 2-4 joueurs sur le même écran. Desktop ou mobile, sauvegarde locale automatique.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <Pill>⚛️ React 19</Pill>
          <Pill>TypeScript</Pill>
          <Pill>📱 Responsive</Pill>
          <Pill>🎲 0 dépendance de jeu</Pill>
        </div>
      </header>

      {/* Grid principal : formulaire + screenshots */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr',
        gap: 32, alignItems: 'start',
      }} className="setup-grid">
        {/* Colonne gauche : nouvelle partie */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2550 0%, #101830 100%)',
          borderRadius: 16, padding: 24,
          border: '1px solid #2a3a5a',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          position: 'sticky', top: 24,
        }}>
          <h2 style={{ margin: '0 0 18px', textAlign: 'center', fontSize: 22, color: '#fff' }}>
            🎲 Nouvelle partie
          </h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#a0b0c5', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Nombre de joueurs
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3, 4].map(n => (
                <button key={n}
                  style={{
                    flex: 1, padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 18,
                    background: count === n
                      ? 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)'
                      : '#222b3c',
                    color: '#fff', fontWeight: 'bold',
                    boxShadow: count === n ? '0 4px 12px rgba(230,126,34,0.4)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
          </div>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#a0b0c5' }}>
                Joueur {i + 1}
              </label>
              <input
                value={names[i]}
                onChange={e => updateName(i, e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #2a3a5a',
                  background: '#0c1528', color: '#fff',
                  boxSizing: 'border-box', fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>
          ))}
          <button
            style={{
              width: '100%', padding: '14px', marginTop: 18, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #27ae60 0%, #16a085 100%)',
              color: '#fff', fontSize: 17, fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(39,174,96,0.35)',
              letterSpacing: 0.5,
            }}
            onClick={() => onStart(names.slice(0, count))}
          >
            ▶ Commencer la partie
          </button>
          <button
            style={{
              width: '100%', padding: '10px', marginTop: 10, borderRadius: 8,
              border: '1px dashed #556070',
              background: 'transparent', color: '#a0b0c5',
              fontSize: 13, cursor: 'pointer',
            }}
            onClick={() => { location.href = `?fixture=mid&t=${Date.now()}` }}
            title="Charge un plateau aléatoire en milieu de partie pour tester rapidement"
          >
            🧪 Démo : partie en cours (aléatoire)
          </button>
        </div>

        {/* Colonne droite : screenshots + règles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Screenshots side-by-side */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 16,
            alignItems: 'start',
          }} className="shots-grid">
            <Shot src="/screenshot-game.png" alt="Aperçu desktop" label="💻 Desktop" />
            <Shot src="/screenshot-mobile.png" alt="Aperçu mobile" label="📱 Mobile" tall />
          </div>

          {/* Règles */}
          <div style={{
            background: 'rgba(20,28,48,0.5)',
            border: '1px solid #2a3a5a',
            borderRadius: 16, padding: 24,
            backdropFilter: 'blur(6px)',
          }}>
            <h3 style={{
              margin: '0 0 14px', fontSize: 16, color: '#f39c12',
              textTransform: 'uppercase', letterSpacing: 1.5,
            }}>
              ⚡ Règles couvertes
            </h3>
            <ul style={{
              margin: 0, padding: 0, listStyle: 'none',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 8,
            }}>
              {[
                ['🏘️', 'Placement initial en serpent'],
                ['🎲', 'Production sur jet de dés, voleur sur un 7'],
                ['🗑️', 'Défausse >7 cartes, voleur, vol'],
                ['🛤️', 'Construction : route, colonie, ville, carte dév'],
                ['🎴', 'Cartes dév : chevalier, abondance, monopole, routes, PV'],
                ['⚔️', 'Plus grande armée (+2 PV dès 3 chevaliers)'],
                ['🏦', 'Échange 4:1 avec la banque'],
                ['🏆', <>Victoire à <strong>10 PV</strong></>],
              ].map(([icon, text], i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8, fontSize: 14, color: '#d5dce8',
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6a7890', fontStyle: 'italic' }}>
              Non inclus : ports, commerce entre joueurs, plus longue route.
            </p>
          </div>
        </div>
      </div>

      <footer style={{
        maxWidth: 1200, margin: '40px auto 0', textAlign: 'center',
        fontSize: 12, color: '#556070',
      }}>
        Fait main — <a href="https://github.com/florentdestremau/catan" style={{ color: '#7a8a9a' }}>github</a>
      </footer>

      <style>{`
        @media (max-width: 820px) {
          .setup-grid { grid-template-columns: 1fr !important; }
          .setup-grid > div:first-child { position: static !important; }
          .shots-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 999,
      fontSize: 12, color: '#b8c5d6',
      letterSpacing: 0.3,
    }}>
      {children}
    </span>
  )
}

function Shot({ src, alt, label, tall = false }: { src: string; alt: string; label: string; tall?: boolean }) {
  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          maxHeight: tall ? 560 : undefined,
          objectFit: 'cover', objectPosition: 'top',
          borderRadius: 12,
          border: '1px solid #2a3a5a',
          display: 'block',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      />
      <figcaption style={{
        position: 'absolute', top: 10, left: 10,
        padding: '4px 10px',
        background: 'rgba(10,14,28,0.85)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 999,
        fontSize: 12, fontWeight: 'bold', color: '#fff',
        backdropFilter: 'blur(4px)',
      }}>
        {label}
      </figcaption>
    </figure>
  )
}

import { useState } from 'react'
import { createRoomApi, joinRoomApi, saveCreds } from '../net/api'

interface HomeProps {
  onJoined: (roomId: string) => void
}

export function Home({ onJoined }: HomeProps) {
  const params = new URLSearchParams(location.search)
  const initialJoin = (params.get('join') ?? '').toUpperCase()
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(initialJoin ? 'join' : 'menu')
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialJoin)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setBusy(true); setError(null)
    try {
      const c = await createRoomApi(name.trim() || 'Hôte')
      saveCreds(c)
      onJoined(c.roomId)
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  async function handleJoin() {
    setBusy(true); setError(null)
    try {
      const roomId = code.trim().toUpperCase()
      const c = await joinRoomApi(roomId, name.trim() || 'Joueur')
      saveCreds(c)
      onJoined(c.roomId)
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
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
      <header style={{ maxWidth: 1100, margin: '0 auto 32px', textAlign: 'center', paddingTop: 20 }}>
        <h1 style={{
          margin: 0, fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #f39c12 0%, #e74c3c 50%, #8e44ad 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          🏝️ Catan <span style={{ fontSize: '0.4em', verticalAlign: 'middle', color: '#8e44ad', WebkitTextFillColor: '#c89cff' }}>online</span>
        </h1>
        <p style={{ margin: '14px auto 0', maxWidth: 620, fontSize: 'clamp(15px, 2vw, 18px)', color: '#b8c5d6', lineHeight: 1.5 }}>
          Version <strong>multijoueur en ligne</strong> : 1 joueur par appareil, un code de salon à partager avec tes amis.
        </p>
      </header>

      <div style={{
        maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24,
        gridTemplateColumns: 'minmax(300px, 420px) 1fr',
        alignItems: 'start',
      }} className="home-grid">
        {/* Colonne gauche : actions */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2550 0%, #101830 100%)',
          border: '1px solid #2a3a5a', borderRadius: 16, padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          position: 'sticky', top: 24,
        }}>
          {mode === 'menu' && (
            <>
              <h2 style={{ margin: '0 0 18px', textAlign: 'center', fontSize: 22 }}>🎲 Jouer</h2>
              <button style={btnPrimary} onClick={() => setMode('create')}>
                🆕 Créer une partie
              </button>
              <button style={btnSecondary} onClick={() => setMode('join')}>
                🔗 Rejoindre avec un code
              </button>
              <a
                href="https://catan.once.florent.cc"
                style={{ ...btnGhost, display: 'block', textDecoration: 'none', textAlign: 'center' as const }}
              >
                🎮 Mode hotseat (local)
              </a>
            </>
          )}

          {mode === 'create' && (
            <>
              <h2 style={{ margin: '0 0 14px', textAlign: 'center', fontSize: 20 }}>🆕 Nouvelle partie</h2>
              <label style={labelStyle}>Ton pseudo</label>
              <input
                autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="Alice" style={inputStyle} maxLength={20}
              />
              <button style={btnPrimary} disabled={busy} onClick={handleCreate}>
                {busy ? '…' : '▶ Créer le salon'}
              </button>
              <button style={btnGhost} onClick={() => { setMode('menu'); setError(null) }}>
                ← Retour
              </button>
            </>
          )}

          {mode === 'join' && (
            <>
              <h2 style={{ margin: '0 0 14px', textAlign: 'center', fontSize: 20 }}>🔗 Rejoindre</h2>
              <label style={labelStyle}>Code du salon</label>
              <input
                autoFocus value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDE" maxLength={8}
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, textAlign: 'center' }}
              />
              <label style={labelStyle}>Ton pseudo</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Bob" style={inputStyle} maxLength={20}
              />
              <button style={btnPrimary} disabled={busy || code.length < 3} onClick={handleJoin}>
                {busy ? '…' : '▶ Rejoindre'}
              </button>
              <button style={btnGhost} onClick={() => { setMode('menu'); setError(null) }}>
                ← Retour
              </button>
            </>
          )}

          {error && <div style={errorStyle}>{error}</div>}
        </div>

        {/* Colonne droite : tuto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Tutorial />
          <div style={{
            background: 'rgba(20,28,48,0.5)', border: '1px solid #2a3a5a',
            borderRadius: 16, padding: 20, backdropFilter: 'blur(6px)',
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#f39c12', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              ⚡ Fonctionnalités
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#d5dce8', fontSize: 14, lineHeight: 1.7 }}>
              <li>2 à 4 joueurs, 1 par appareil</li>
              <li>Placement initial en serpent · production · voleur · vol</li>
              <li>Cartes dév, plus grande armée, échange 4:1, victoire à 10 PV</li>
              <li>Reconnexion automatique (token local)</li>
              <li>Dés tirés par le serveur (pas de triche possible)</li>
            </ul>
          </div>
        </div>
      </div>

      <footer style={{ maxWidth: 1100, margin: '40px auto 0', textAlign: 'center', fontSize: 12, color: '#556070' }}>
        Fait main — <a href="https://github.com/florentdestremau/catan" style={{ color: '#7a8a9a' }}>github</a>
      </footer>

      <style>{`
        @media (max-width: 820px) {
          .home-grid { grid-template-columns: 1fr !important; }
          .home-grid > div:first-child { position: static !important; }
        }
      `}</style>
    </div>
  )
}

function Tutorial() {
  const steps: Array<[string, string, string]> = [
    ['1', '🆕 Crée un salon', 'Clique « Créer une partie », choisis ton pseudo. Le serveur te donne un code à 5 lettres.'],
    ['2', '🔗 Partage le code', 'Envoie le code à tes amis (copie-colle l\'URL ou dicte le code). Ils rejoignent depuis leur propre appareil.'],
    ['3', '▶ Démarre', 'Quand tout le monde est là (2 à 4 joueurs), l\'hôte clique « Démarrer ».'],
    ['4', '🎮 Joue ton tour', 'Seul le joueur courant peut cliquer. Chaque action est synchronisée en temps réel.'],
  ]
  return (
    <div style={{
      background: 'rgba(20,28,48,0.5)', border: '1px solid #2a3a5a',
      borderRadius: 16, padding: 24, backdropFilter: 'blur(6px)',
    }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, color: '#f39c12', textTransform: 'uppercase', letterSpacing: 1.5 }}>
        🚀 Comment jouer
      </h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {steps.map(([n, title, body]) => (
          <div key={n} style={{
            display: 'grid', gridTemplateColumns: '36px 1fr', gap: 12, alignItems: 'start',
            padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
              color: '#fff', fontWeight: 'bold', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#b8c5d6', lineHeight: 1.5 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', marginBottom: 10, borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #27ae60 0%, #16a085 100%)',
  color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
  boxShadow: '0 6px 18px rgba(39,174,96,0.35)',
}
const btnSecondary: React.CSSProperties = {
  width: '100%', padding: '12px', marginBottom: 10, borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
  color: '#fff', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
  boxShadow: '0 6px 14px rgba(52,152,219,0.25)',
}
const btnGhost: React.CSSProperties = {
  width: '100%', padding: '10px', marginTop: 4, borderRadius: 8,
  border: '1px dashed #556070',
  background: 'transparent', color: '#a0b0c5',
  fontSize: 13, cursor: 'pointer',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #2a3a5a',
  background: '#0c1528', color: '#fff',
  boxSizing: 'border-box', fontSize: 15, outline: 'none',
  marginBottom: 12,
}
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4, fontSize: 12,
  color: '#a0b0c5', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
}
const errorStyle: React.CSSProperties = {
  marginTop: 10, padding: '8px 12px', borderRadius: 6,
  background: 'rgba(192,57,43,0.2)', border: '1px solid #c0392b',
  color: '#fff', fontSize: 13, textAlign: 'center',
}

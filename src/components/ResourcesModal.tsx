import type { GameState, Resource, DevCardKind } from '../game/types'
import type { GameAction } from '../game/actions'
import { canAfford, COSTS } from '../game/rules'

interface ResourcesModalProps {
  state: GameState
  dispatch: (action: GameAction) => void
  onClose: () => void
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore']
const RES_FR: Record<Resource, string> = {
  wood: 'Bois', brick: 'Argile', wheat: 'Blé', sheep: 'Mouton', ore: 'Pierre',
}
const RES_COLORS: Record<Resource, string> = {
  wood: '#2d6a2d', brick: '#c0522a', wheat: '#d4a017', sheep: '#6abf6a', ore: '#888',
}
const RES_ICON: Record<Resource, string> = {
  wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️',
}

const DEV_META: Record<DevCardKind, { label: string; icon: string; color: string }> = {
  knight:         { label: 'Chevalier',    icon: '⚔️', color: '#c0392b' },
  road_building:  { label: 'Construction', icon: '🛤️', color: '#8e44ad' },
  year_of_plenty: { label: 'Abondance',    icon: '🌾', color: '#d4a017' },
  monopoly:       { label: 'Monopole',     icon: '👑', color: '#2c3e50' },
  vp:             { label: 'Pt Victoire',  icon: '⭐', color: '#f1c40f' },
}

const COST_ROWS: Array<{ label: string; icon: string; costs: Partial<Record<Resource, number>> }> = [
  { label: 'Route',     icon: '🛤️', costs: COSTS.road },
  { label: 'Colonie',   icon: '🏠', costs: COSTS.settlement },
  { label: 'Ville',     icon: '🏙️', costs: COSTS.city },
  { label: 'Carte dév', icon: '🎴', costs: COSTS.devCard },
]

export function ResourcesModal({ state, dispatch, onClose }: ResourcesModalProps) {
  const current = state.players[state.currentPlayerIndex]
  const devCounts: Record<DevCardKind, number> = {
    knight: 0, vp: 0, road_building: 0, year_of_plenty: 0, monopoly: 0,
  }
  for (const c of current.devCards) devCounts[c]++
  const newCounts: Record<DevCardKind, number> = {
    knight: 0, vp: 0, road_building: 0, year_of_plenty: 0, monopoly: 0,
  }
  for (const c of current.newDevCards) newCounts[c]++

  function rollDice() {
    const d1 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
    const d2 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
    dispatch({ type: 'ROLL_DICE', dice: [d1, d2] })
    onClose()
  }

  function endTurn() {
    dispatch({ type: 'END_TURN' })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#16213e',
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: 16,
          display: 'flex', flexDirection: 'column', gap: 14,
          color: '#eee',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: current.color, fontWeight: 'bold', fontSize: 20 }}>
            {current.name}
            <span style={{
              marginLeft: 8, fontSize: 14, background: '#222',
              padding: '2px 10px', borderRadius: 12, color: '#fff',
            }}>
              ⭐ {current.vp}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: '#fff', border: '1px solid #444',
              borderRadius: 6, fontSize: 20, width: 36, height: 36, cursor: 'pointer',
            }}
            aria-label="Fermer"
          >✕</button>
        </div>

        {/* Ressources en grand */}
        <div>
          <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginBottom: 6 }}>
            Ressources
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {RESOURCES.map(res => {
              const n = current.resources[res]
              const has = n > 0
              return (
                <div key={res} style={{
                  background: has ? RES_COLORS[res] : '#2a2a2a',
                  border: has ? '1px solid rgba(255,255,255,0.35)' : '1px solid #333',
                  borderRadius: 8, padding: '10px 4px',
                  textAlign: 'center',
                  opacity: has ? 1 : 0.45,
                }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>{RES_ICON[res]}</div>
                  <div style={{ fontSize: 10, color: '#fff', marginTop: 4 }}>{RES_FR[res]}</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', lineHeight: 1.1, marginTop: 2 }}>{n}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cartes dév */}
        <div>
          <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginBottom: 6 }}>
            Cartes dév.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(Object.keys(DEV_META) as DevCardKind[]).map(kind => {
              const n = devCounts[kind]
              const nNew = newCounts[kind]
              if (n === 0 && nNew === 0) return null
              const meta = DEV_META[kind]
              return (
                <div key={kind} style={{
                  background: '#1a1a24',
                  border: `1px solid ${meta.color}66`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 6, padding: '6px 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                }}>
                  <span style={{ fontSize: 12 }}>
                    <span style={{ marginRight: 4 }}>{meta.icon}</span>
                    <span style={{ color: meta.color, fontWeight: 'bold' }}>{meta.label}</span>
                  </span>
                  <span style={{ fontSize: 12, color: '#ddd' }}>
                    {n > 0 && <strong>×{n}</strong>}
                    {nNew > 0 && <span style={{ color: '#888', marginLeft: 6 }}>+{nNew} 🕒</span>}
                  </span>
                </div>
              )
            })}
            {current.devCards.length === 0 && current.newDevCards.length === 0 && (
              <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', gridColumn: '1 / -1' }}>Aucune carte</div>
            )}
          </div>
        </div>

        {/* Coûts de construction */}
        <div>
          <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', marginBottom: 6 }}>
            Coûts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {COST_ROWS.map(row => {
              const affordable = canAfford(current.resources, row.costs)
              return (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px', borderRadius: 6,
                  background: affordable ? 'rgba(39, 174, 96, 0.15)' : '#1c1c1c',
                  border: `1px solid ${affordable ? 'rgba(46, 204, 113, 0.6)' : '#2a2a2a'}`,
                  opacity: affordable ? 1 : 0.65,
                }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{row.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{row.label}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {(Object.entries(row.costs) as Array<[Resource, number]>).map(([res, n]) => (
                      <span key={res} style={{
                        background: RES_COLORS[res], color: '#fff',
                        borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 'bold',
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}>
                        <span style={{ fontSize: 10 }}>{RES_ICON[res]}</span>
                        <span>{n}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions rapides */}
        {state.phase === 'roll' && (
          <button onClick={rollDice} style={quickBtn('#e67e22')}>
            🎲 Lancer les dés
          </button>
        )}
        {state.phase === 'actions' && (
          <button onClick={endTurn} style={quickBtn('#27ae60')}>
            Fin de tour
          </button>
        )}
      </div>
    </div>
  )
}

function quickBtn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 8,
    padding: '14px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
    width: '100%',
  }
}

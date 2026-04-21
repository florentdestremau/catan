import { useState } from 'react'
import type { GameState, Resource, DevCardKind } from '../game/types'
import type { GameAction } from '../game/actions'
import { totalCards, canAfford, COSTS, isRoadPlacementValid, isSettlementPlacementValid } from '../game/rules'
import { canBuildAnything } from '../game/checks'

const DEV_META: Record<DevCardKind, { label: string; icon: string; color: string; desc: string }> = {
  knight:         { label: 'Chevalier',        icon: '⚔️',  color: '#c0392b', desc: 'Déplace le voleur et vole une carte' },
  road_building:  { label: 'Construction',     icon: '🛤️', color: '#8e44ad', desc: 'Construisez 2 routes gratuites' },
  year_of_plenty: { label: 'Abondance',        icon: '🌾', color: '#d4a017', desc: 'Piochez 2 ressources de la banque' },
  monopoly:       { label: 'Monopole',         icon: '👑', color: '#2c3e50', desc: 'Prenez toutes les cartes d\'une ressource' },
  vp:             { label: 'Point de Victoire', icon: '⭐', color: '#f1c40f', desc: '+1 PV (automatique)' },
}

interface ControlsProps {
  state: GameState
  dispatch: (action: GameAction) => void
}

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore']
const RES_FR: Record<Resource, string> = {
  wood: 'Bois', brick: 'Argile', wheat: 'Blé', sheep: 'Mouton', ore: 'Pierre',
}
const RESOURCE_COLORS: Record<Resource, string> = {
  wood: '#2d6a2d', brick: '#c0522a', wheat: '#d4a017', sheep: '#6abf6a', ore: '#888',
}
const RES_ICON_FR: Record<Resource, string> = {
  wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️',
}

export function Controls({ state, dispatch }: ControlsProps) {
  const { phase, players, currentPlayerIndex, dice, pendingDiscards, stealFrom } = state
  const currentPlayer = players[currentPlayerIndex]
  const [discardSelection, setDiscardSelection] = useState<Partial<Record<Resource, number>>>({})

  function handleEndTurn() {
    if (phase === 'actions' && canBuildAnything(state)) {
      if (!confirm('Vous pouvez encore construire. Finir le tour quand même ?')) return
    }
    dispatch({ type: 'END_TURN' })
  }

  function rollDice() {
    const d1 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
    const d2 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
    dispatch({ type: 'ROLL_DICE', dice: [d1, d2] })
  }

  const activeDiscarderId = pendingDiscards[0] ?? null
  const discardPlayer = activeDiscarderId ? players.find(p => p.id === activeDiscarderId) : null
  const discardTotal = discardPlayer ? totalCards(discardPlayer.resources) : 0
  const mustDiscard = discardPlayer ? Math.floor(discardTotal / 2) : 0
  const currentDiscardCount = Object.values(discardSelection).reduce((a, b) => a + (b ?? 0), 0)

  function handleDiscardChange(res: Resource, val: number) {
    setDiscardSelection(prev => ({ ...prev, [res]: Math.max(0, val) }))
  }

  function submitDiscard() {
    if (!activeDiscarderId || !discardPlayer) return
    if (currentDiscardCount !== mustDiscard) return
    dispatch({ type: 'DISCARD', playerId: activeDiscarderId, resources: discardSelection })
    setDiscardSelection({})
  }

  if (phase === 'ended') {
    const winner = players.find(p => p.id === state.winner)
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 'bold', color: winner?.color }}>🎉 {winner?.name} gagne !</div>
        <button style={btnStyle} onClick={() => { localStorage.removeItem('catan:state:v1'); location.reload() }}>Nouvelle partie</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Bandeau du joueur actif */}
      <div style={{
        background: `linear-gradient(135deg, ${currentPlayer.color} 0%, ${currentPlayer.color}aa 100%)`,
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: `0 0 12px ${currentPlayer.color}66`,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
          Tour de
        </div>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {currentPlayer.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
          {phaseLabel(phase)}
        </div>
      </div>

      {/* Rappel des ressources du joueur actif, en grand */}
      <ResourcesBar player={currentPlayer} />

      {/* Dés */}
      {dice && (
        <div style={{ textAlign: 'center', fontSize: 28 }}>
          {dieEmoji(dice[0])} {dieEmoji(dice[1])}
          <span style={{ fontSize: 16, marginLeft: 8 }}>= {dice[0] + dice[1]}</span>
        </div>
      )}

      {/* Actions selon la phase */}
      {phase === 'roll' && (
        <button style={{ ...btnStyle, background: '#e67e22' }} onClick={rollDice}>
          🎲 Lancer les dés <Kbd>Espace</Kbd>
        </button>
      )}

      {phase === 'discard' && discardPlayer && (
        <div style={{ background: '#2c2c2c', borderRadius: 6, padding: 10 }}>
          <div style={{ marginBottom: 8, fontSize: 13 }}>
            <strong style={{ color: discardPlayer.color }}>{discardPlayer.name}</strong> doit défausser {mustDiscard} cartes
          </div>
          <div style={{ marginBottom: 8, fontSize: 11, color: '#aaa' }}>
            Clic sur une ressource pour défausser, re-clic sur le compteur pour annuler.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
            {RESOURCES.map(res => {
              const owned = discardPlayer.resources[res]
              const picked = discardSelection[res] ?? 0
              const remaining = owned - picked
              const canAdd = remaining > 0 && currentDiscardCount < mustDiscard
              return (
                <div
                  key={res}
                  onClick={() => { if (canAdd) handleDiscardChange(res, picked + 1) }}
                  style={{
                    background: owned > 0 ? RESOURCE_COLORS[res] : '#333',
                    borderRadius: 6,
                    padding: '8px 2px',
                    textAlign: 'center',
                    cursor: canAdd ? 'pointer' : 'not-allowed',
                    opacity: owned > 0 ? 1 : 0.4,
                    border: picked > 0 ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ fontSize: 20, lineHeight: 1 }}>{RES_ICON_FR[res]}</div>
                  <div style={{ fontSize: 11, color: '#fff', marginTop: 2 }}>{RES_FR[res]}</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', marginTop: 2 }}>{remaining}</div>
                  {picked > 0 && (
                    <div
                      onClick={e => { e.stopPropagation(); handleDiscardChange(res, picked - 1) }}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        background: '#c0392b', color: '#fff', borderRadius: 12,
                        minWidth: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
                        border: '2px solid #fff',
                      }}
                      title="Retirer de la défausse"
                    >
                      −{picked}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, marginBottom: 6, color: currentDiscardCount === mustDiscard ? '#2ecc71' : '#aaa' }}>
            {currentDiscardCount} / {mustDiscard} sélectionnée{mustDiscard > 1 ? 's' : ''}
          </div>
          <button
            style={{ ...btnStyle, background: currentDiscardCount === mustDiscard ? '#c0392b' : '#555' }}
            disabled={currentDiscardCount !== mustDiscard}
            onClick={submitDiscard}
          >
            Défausser
          </button>
        </div>
      )}

      {phase === 'move_robber' && (
        <div style={{ fontSize: 13, color: '#e67e22' }}>Cliquez sur un hex pour déplacer le voleur</div>
      )}

      {phase === 'steal' && stealFrom && stealFrom.length > 0 && (
        <div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Voler une ressource à :</div>
          {stealFrom.map(tid => {
            const target = players.find(p => p.id === tid)
            return (
              <button key={tid} style={{ ...btnStyle, background: target?.color ?? '#555', marginBottom: 4 }}
                onClick={() => dispatch({ type: 'STEAL', targetId: tid })}>
                {target?.name}
              </button>
            )
          })}
        </div>
      )}

      {phase === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(state.pendingFreeRoads ?? 0) > 0 && (
            <div style={{ background: '#8e44ad', color: '#fff', padding: 8, borderRadius: 6, fontSize: 13, textAlign: 'center' }}>
              🛤️ Placez {state.pendingFreeRoads} route{state.pendingFreeRoads! > 1 ? 's' : ''} gratuite{state.pendingFreeRoads! > 1 ? 's' : ''}
            </div>
          )}

          <DevCardsPanel state={state} dispatch={dispatch} />

          <div style={{ fontSize: 12, color: '#aaa' }}>
            Échanger avec la banque (4:1) :
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RESOURCES.filter(r => currentPlayer.resources[r] >= 4).map(give => (
              <div key={give} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1c1c1c', border: '1px solid #333',
                borderRadius: 6, padding: '6px 8px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: RESOURCE_COLORS[give], color: '#fff',
                  borderRadius: 4, padding: '4px 8px',
                  fontSize: 13, fontWeight: 'bold',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}>
                  <span style={{ fontSize: 16 }}>{RES_ICON_FR[give]}</span>
                  <span>×4</span>
                </div>
                <span style={{ fontSize: 16, color: '#aaa' }}>→</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
                  {RESOURCES.filter(r => r !== give).map(receive => (
                    <button
                      key={receive}
                      title={`4 ${RES_FR[give]} → 1 ${RES_FR[receive]}`}
                      onClick={() => dispatch({ type: 'BANK_TRADE', give, receive })}
                      style={{
                        background: RESOURCE_COLORS[receive],
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 4, padding: '4px 8px',
                        fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 2,
                      }}
                    >
                      <span>{RES_ICON_FR[receive]}</span>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>+1</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...btnStyle, background: '#27ae60', marginTop: 4 }}
            onClick={handleEndTurn}>
            Fin de tour → <Kbd>Espace</Kbd>
          </button>
        </div>
      )}

      <BuildPanel state={state} dispatch={dispatch} />
    </div>
  )
}


function BuildPanel({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const current = state.players[state.currentPlayerIndex]
  const COLORS: Record<Resource, string> = {
    wood: '#2d6a2d', brick: '#c0522a', wheat: '#d4a017', sheep: '#6abf6a', ore: '#888',
  }
  const RES_ICON: Record<Resource, string> = {
    wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️',
  }

  const inActions = state.phase === 'actions'
  const canRoad = inActions && canAfford(current.resources, COSTS.road) && current.pieces.roads > 0
    && Object.keys(state.board.edges).some(eid => isRoadPlacementValid(state, eid, current.id))
  const canSettlement = inActions && canAfford(current.resources, COSTS.settlement) && current.pieces.settlements > 0
    && Object.keys(state.board.vertices).some(vid => isSettlementPlacementValid(state, vid, true, current.id))
  const canCity = inActions && canAfford(current.resources, COSTS.city) && current.pieces.cities > 0
    && Object.values(state.board.vertices).some(v => v.building?.owner === current.id && v.building.type === 'settlement')
  const canDev = inActions && canAfford(current.resources, COSTS.devCard) && state.devDeck.length > 0

  const rows: Array<{
    label: string
    icon: string
    available: boolean
    costs: Array<{ res: Resource; n: number }>
    onClick?: () => void
    extra?: string
  }> = [
    { label: 'Route',     icon: '🛤️', available: canRoad,       costs: [{ res: 'wood', n: 1 }, { res: 'brick', n: 1 }] },
    { label: 'Colonie',   icon: '🏠', available: canSettlement, costs: [{ res: 'wood', n: 1 }, { res: 'brick', n: 1 }, { res: 'wheat', n: 1 }, { res: 'sheep', n: 1 }] },
    { label: 'Ville',     icon: '🏙️', available: canCity,       costs: [{ res: 'wheat', n: 2 }, { res: 'ore', n: 3 }] },
    { label: 'Carte dév', icon: '🎴', available: canDev,        costs: [{ res: 'wheat', n: 1 }, { res: 'sheep', n: 1 }, { res: 'ore', n: 1 }],
      onClick: canDev ? () => dispatch({ type: 'BUY_DEV_CARD' }) : undefined,
      extra: `${state.devDeck.length} restante${state.devDeck.length > 1 ? 's' : ''}` },
  ]

  const anyAvailable = rows.some(r => r.available)

  return (
    <div style={{
      borderTop: '1px solid #444',
      paddingTop: 10,
      marginTop: 4,
    }}>
      <div style={{
        fontSize: 11,
        color: anyAvailable ? '#2ecc71' : '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 'bold',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {anyAvailable ? '✨ Constructions dispo' : 'Constructions'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(row => (
          <div
            key={row.label}
            onClick={row.onClick}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 70px 1fr',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: row.available ? 'rgba(39, 174, 96, 0.15)' : '#1c1c1c',
              border: `1px solid ${row.available ? 'rgba(46, 204, 113, 0.6)' : '#2a2a2a'}`,
              opacity: row.available ? 1 : 0.55,
              boxShadow: row.available ? '0 0 10px rgba(46, 204, 113, 0.25)' : undefined,
              transition: 'all 0.25s ease',
              cursor: row.onClick ? 'pointer' : 'default',
            }}
          >
            <span style={{ fontSize: 16, textAlign: 'center' }}>{row.icon}</span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: row.available ? '#fff' : '#aaa',
            }}>
              {row.label}
              {row.extra && (
                <span style={{ display: 'block', fontSize: 9, color: '#888', fontWeight: 400 }}>
                  {row.extra}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {row.costs.map((c, i) => (
                <span
                  key={`${c.res}-${i}`}
                  title={`${c.n} ${c.res}`}
                  style={{
                    background: COLORS[c.res],
                    color: '#fff',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 11,
                    fontWeight: 'bold',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    minWidth: 28,
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{RES_ICON[c.res]}</span>
                  <span>{c.n}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {anyAvailable && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' }}>
          Cliquez sur un emplacement surligné.
        </div>
      )}
    </div>
  )
}

function ResourcesBar({ player }: { player: GameState['players'][number] }) {
  const items: Array<{ res: Resource; icon: string; label: string; color: string }> = [
    { res: 'wood',  icon: '🪵', label: 'Bois',   color: '#2d6a2d' },
    { res: 'brick', icon: '🧱', label: 'Argile', color: '#c0522a' },
    { res: 'wheat', icon: '🌾', label: 'Blé',    color: '#d4a017' },
    { res: 'sheep', icon: '🐑', label: 'Mouton', color: '#6abf6a' },
    { res: 'ore',   icon: '⛏️', label: 'Pierre', color: '#888'    },
  ]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 4,
      background: '#1a1a24',
      border: '1px solid #333',
      borderRadius: 8,
      padding: 6,
    }}>
      {items.map(it => {
        const n = player.resources[it.res]
        const has = n > 0
        return (
          <div
            key={it.res}
            title={it.label}
            style={{
              background: has ? it.color : '#2a2a2a',
              border: has ? '1px solid rgba(255,255,255,0.3)' : '1px solid #333',
              borderRadius: 6,
              padding: '6px 2px',
              textAlign: 'center',
              opacity: has ? 1 : 0.45,
            }}
          >
            <div style={{ fontSize: 18, lineHeight: 1 }}>{it.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', lineHeight: 1.1, marginTop: 2 }}>{n}</div>
          </div>
        )
      })}
    </div>
  )
}

function DevCardsPanel({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const current = state.players[state.currentPlayerIndex]
  const [yopR1, setYopR1] = useState<Resource>('wood')
  const [yopR2, setYopR2] = useState<Resource>('wood')
  const [monoRes, setMonoRes] = useState<Resource>('wood')

  const hasPending = (state.pendingFreeRoads ?? 0) > 0
  const canPlayDev = !current.hasPlayedDevCard && !hasPending

  // Grouper les cartes jouables par type
  const playable: Record<DevCardKind, number> = {
    knight: 0, vp: 0, road_building: 0, year_of_plenty: 0, monopoly: 0,
  }
  for (const c of current.devCards) playable[c]++
  const newByKind: Record<DevCardKind, number> = {
    knight: 0, vp: 0, road_building: 0, year_of_plenty: 0, monopoly: 0,
  }
  for (const c of current.newDevCards) newByKind[c]++

  const playableKinds = (['knight', 'road_building', 'year_of_plenty', 'monopoly'] as DevCardKind[])
    .filter(k => playable[k] > 0)
  const newKindsToShow = (Object.keys(newByKind) as DevCardKind[]).filter(k => newByKind[k] > 0)

  return (
    <div style={{ borderTop: '1px solid #444', paddingTop: 8, marginTop: 4 }}>
      <div style={{
        fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1,
        fontWeight: 'bold', marginBottom: 6,
      }}>
        🎴 Mes cartes dév.
      </div>

      {/* Cartes jouables */}
      {playableKinds.length === 0 && newKindsToShow.length === 0 && (
        <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>Aucune carte</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {playableKinds.map(kind => {
          const meta = DEV_META[kind]
          const count = playable[kind]
          const playAction =
            kind === 'knight' ? () => dispatch({ type: 'PLAY_KNIGHT' }) :
            kind === 'road_building' ? () => dispatch({ type: 'PLAY_ROAD_BUILDING' }) :
            kind === 'year_of_plenty' ? () => dispatch({ type: 'PLAY_YEAR_OF_PLENTY', resources: [yopR1, yopR2] }) :
            kind === 'monopoly' ? () => dispatch({ type: 'PLAY_MONOPOLY', resource: monoRes }) :
            undefined

          return (
            <div key={kind} style={{
              position: 'relative',
              background: '#1a1a24',
              border: `1px solid ${meta.color}66`,
              borderLeft: `4px solid ${meta.color}`,
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              {count > 1 && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  background: meta.color, color: '#fff',
                  borderRadius: 10, padding: '1px 7px',
                  fontSize: 11, fontWeight: 'bold',
                  zIndex: 2,
                }}>
                  ×{count}
                </div>
              )}

              <div style={{
                padding: '10px 10px 8px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  fontSize: 24, lineHeight: 1,
                  width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${meta.color}22`,
                  borderRadius: 8,
                  border: `1px solid ${meta.color}55`,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: meta.color }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                    {meta.desc}
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 10px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
                {kind === 'year_of_plenty' && (
                  <>
                    <ResourceSelect value={yopR1} onChange={setYopR1} />
                    <ResourceSelect value={yopR2} onChange={setYopR2} />
                  </>
                )}
                {kind === 'monopoly' && <ResourceSelect value={monoRes} onChange={setMonoRes} />}
                <button
                  disabled={!canPlayDev || !playAction}
                  onClick={playAction}
                  style={{
                    flex: 1,
                    background: canPlayDev ? meta.color : '#333',
                    color: '#fff', border: 'none', borderRadius: 6,
                    padding: '6px 10px', fontSize: 12, fontWeight: 'bold',
                    cursor: canPlayDev ? 'pointer' : 'not-allowed',
                    opacity: canPlayDev ? 1 : 0.5,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    boxShadow: canPlayDev ? `0 2px 6px ${meta.color}66` : undefined,
                  }}
                >
                  ▶ Jouer
                </button>
              </div>
            </div>
          )
        })}

        {/* Carte Point de Victoire (auto) */}
        {playable.vp > 0 && (
          <div style={{
            position: 'relative',
            background: '#1a1a24',
            border: `1px solid ${DEV_META.vp.color}66`,
            borderLeft: `4px solid ${DEV_META.vp.color}`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            {playable.vp > 1 && (
              <div style={{
                position: 'absolute', top: 6, right: 6,
                background: DEV_META.vp.color, color: '#000',
                borderRadius: 10, padding: '1px 7px',
                fontSize: 11, fontWeight: 'bold',
              }}>
                ×{playable.vp}
              </div>
            )}
            <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontSize: 24, lineHeight: 1,
                width: 38, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${DEV_META.vp.color}22`,
                borderRadius: 8,
                border: `1px solid ${DEV_META.vp.color}55`,
              }}>
                ⭐
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: DEV_META.vp.color }}>
                  Point{playable.vp > 1 ? 's' : ''} de Victoire
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                  Compté{playable.vp > 1 ? 's' : ''} automatiquement dans vos PV
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cartes achetées ce tour (dos de carte) */}
        {newKindsToShow.map(kind => {
          const meta = DEV_META[kind]
          const count = newByKind[kind]
          return (
            <div key={`new-${kind}`} style={{
              position: 'relative',
              background: 'repeating-linear-gradient(45deg, #1e1e2a, #1e1e2a 8px, #282838 8px, #282838 16px)',
              border: `2px dashed ${meta.color}aa`,
              borderRadius: 10,
              padding: '10px',
              display: 'flex', alignItems: 'center', gap: 10,
              opacity: 0.85,
            }}>
              {count > 1 && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  background: '#000', color: '#fff',
                  borderRadius: 12, padding: '2px 8px',
                  fontSize: 11, fontWeight: 'bold',
                  border: `1px solid ${meta.color}`,
                }}>
                  ×{count}
                </div>
              )}
              <div style={{
                fontSize: 22, width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0f0f1a', borderRadius: 8,
                border: `1px solid ${meta.color}66`,
                filter: 'grayscale(0.6)',
              }}>
                🕒
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#ddd' }}>
                  {meta.icon} {meta.label}
                </div>
                <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                  Achetée ce tour · jouable au tour suivant
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {current.hasPlayedDevCard && (
        <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 4 }}>
          Une carte dév. déjà jouée ce tour.
        </div>
      )}

      {state.largestArmy && (
        <div style={{ fontSize: 11, color: '#f1c40f', marginTop: 6, fontWeight: 'bold' }}>
          🏆 Plus grande armée : {state.players.find(p => p.id === state.largestArmy)?.name} (+2 PV)
        </div>
      )}
    </div>
  )
}

function ResourceSelect({ value, onChange }: { value: Resource; onChange: (r: Resource) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Resource)}
      style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: 4, padding: '2px 4px', fontSize: 11 }}
    >
      <option value="wood">🪵 Bois</option>
      <option value="brick">🧱 Argile</option>
      <option value="wheat">🌾 Blé</option>
      <option value="sheep">🐑 Mouton</option>
      <option value="ore">⛏️ Pierre</option>
    </select>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      marginLeft: 8,
      padding: '2px 6px',
      fontSize: 10,
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.35)',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.25)',
      letterSpacing: 0.5,
      verticalAlign: 'middle',
    }}>
      {children}
    </span>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#2980b9',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 14px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 14,
  width: '100%',
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'setup1': return 'Placement (phase 1) — posez une colonie'
    case 'setup2': return 'Placement (phase 2) — posez une colonie'
    case 'roll': return 'Lancez les dés'
    case 'discard': return 'Défausse (voleur)'
    case 'move_robber': return 'Déplacez le voleur'
    case 'steal': return 'Volez une ressource'
    case 'actions': return 'Actions'
    default: return ''
  }
}

function dieEmoji(n: number): string {
  return ['⚀','⚁','⚂','⚃','⚄','⚅'][n - 1] ?? '🎲'
}

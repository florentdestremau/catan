import { useEffect, useState } from 'react'
import type { GameState, Resource, PlayerId, Player } from '../game/types'

const RESOURCE_ICONS: Record<Resource, string> = {
  wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️',
}

interface PlayerCardProps {
  player: Player
  isActive: boolean
  delta?: Partial<Record<Resource, number>>
  largestArmy: boolean
  knightsPlayed: number
}

export function PlayerCard({ player, isActive, delta, largestArmy, knightsPlayed }: PlayerCardProps) {
  const totalCards = Object.values(player.resources).reduce((a, b) => a + b, 0)
  const devCardsTotal = player.devCards.length + player.newDevCards.length

  return (
    <div
      style={{
        position: 'relative',
        border: `${isActive ? 4 : 2}px solid ${player.color}`,
        borderRadius: 12,
        padding: isActive ? '16px 18px' : '12px 16px',
        background: isActive
          ? `linear-gradient(135deg, ${player.color}44 0%, ${player.color}11 100%)`
          : 'rgba(20,20,30,0.75)',
        opacity: isActive ? 1 : 0.7,
        boxShadow: isActive ? `0 0 26px ${player.color}aa` : undefined,
        transition: 'all 0.25s ease',
        backdropFilter: 'blur(4px)',
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          top: -2, left: -2, right: -2,
          height: 6,
          background: player.color,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontWeight: 'bold',
          color: player.color,
          fontSize: isActive ? 24 : 20,
          textShadow: isActive ? `0 0 12px ${player.color}aa` : undefined,
        }}>
          {player.name}
        </span>
        <span style={{
          fontSize: 17, fontWeight: 'bold',
          background: '#222', borderRadius: 14,
          padding: '4px 12px', border: '1px solid #444',
        }}>
          ⭐ {player.vp}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 15, flexWrap: 'wrap' }}>
        <span title="Cartes ressources en main" style={{ position: 'relative' }}>
          🎴 <strong>{totalCards}</strong>
          {delta && (
            <span style={{
              position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 3, animation: 'floatUp 2.2s ease forwards',
              whiteSpace: 'nowrap',
            }}>
              {(Object.entries(delta) as Array<[Resource, number]>).map(([res, n]) => (
                <span key={res} style={{
                  background: n > 0 ? '#27ae60' : '#c0392b',
                  color: '#fff', padding: '2px 5px', borderRadius: 8,
                  fontSize: 11, fontWeight: 'bold',
                }}>
                  {n > 0 ? '+' : ''}{n}{RESOURCE_ICONS[res]}
                </span>
              ))}
            </span>
          )}
        </span>
        {devCardsTotal > 0 && <span title="Cartes développement">🎴✨ <strong>{devCardsTotal}</strong></span>}
        <span>🛤️ {player.pieces.roads}</span>
        <span>🏠 {player.pieces.settlements}</span>
        <span>🏙️ {player.pieces.cities}</span>
        {knightsPlayed > 0 && (
          <span title="Chevaliers joués" style={{ color: largestArmy ? '#f1c40f' : '#ccc' }}>
            ⚔️ {knightsPlayed}{largestArmy && ' 🏆'}
          </span>
        )}
      </div>
    </div>
  )
}

interface PlayerPanelProps {
  state: GameState
}

// Rend tous les joueurs empilés (utile en backup / debug). Le layout principal
// (autour du plateau) instancie directement <PlayerCard>.
export function PlayerPanel({ state }: PlayerPanelProps) {
  const { players, currentPlayerIndex, lastDeltas } = state
  const [visibleDeltas, setVisibleDeltas] = useState<{
    id: number
    byPlayer: Record<PlayerId, Partial<Record<Resource, number>>>
  } | null>(null)

  useEffect(() => {
    if (!lastDeltas) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleDeltas(lastDeltas)
    const timer = setTimeout(() => setVisibleDeltas(null), 2400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDeltas?.id])

  return (
    <>
      <style>{keyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {players.map((player, i) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={i === currentPlayerIndex}
            delta={visibleDeltas?.byPlayer[player.id]}
            largestArmy={state.largestArmy === player.id}
            knightsPlayed={player.knightsPlayed}
          />
        ))}
      </div>
    </>
  )
}

export const keyframes = `
@keyframes floatUp {
  0%   { transform: translate(-50%, 6px); opacity: 0; }
  15%  { transform: translate(-50%, 0); opacity: 1; }
  75%  { transform: translate(-50%, -4px); opacity: 1; }
  100% { transform: translate(-50%, -20px); opacity: 0; }
}
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.8); }
  100% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
}
`

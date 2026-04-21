import { useEffect, useState } from 'react'
import type { GameState, Resource } from '../game/types'

const RESOURCE_COLORS: Record<Resource, string> = {
  wood: '#2d6a2d', brick: '#c0522a', wheat: '#d4a017', sheep: '#6abf6a', ore: '#888',
}
const RESOURCE_ICONS: Record<Resource, string> = {
  wood: '🪵', brick: '🧱', wheat: '🌾', sheep: '🐑', ore: '⛏️',
}
const RESOURCE_SHORT: Record<Resource, string> = {
  wood: 'Bois', brick: 'Argile', wheat: 'Blé', sheep: 'Mouton', ore: 'Pierre',
}

interface GainOverlayProps {
  state: GameState
}

export function GainOverlay({ state }: GainOverlayProps) {
  const [show, setShow] = useState<GameState['lastDeltas']>()

  useEffect(() => {
    if (!state.lastDeltas) return
    setShow(state.lastDeltas)
    const t = setTimeout(() => setShow(undefined), 2200)
    return () => clearTimeout(t)
  }, [state.lastDeltas?.id])

  if (!show) return null

  const entries = Object.entries(show.byPlayer)
  if (entries.length === 0) return null

  const title = state.dice ? `Dés : ${state.dice[0]} + ${state.dice[1]} = ${state.dice[0] + state.dice[1]}` : 'Vol'

  return (
    <>
      <style>{overlayCSS}</style>
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'overlayFade 2.2s ease forwards',
      }}>
        <div style={{
          background: 'rgba(15, 15, 26, 0.85)',
          border: '2px solid rgba(255,255,255,0.15)',
          borderRadius: 18,
          padding: '22px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          minWidth: 360,
          animation: 'overlayPop 2.2s ease forwards',
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: 14,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 18,
            fontWeight: 600,
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map(([pid, delta]) => {
              const player = state.players.find(p => p.id === pid)
              if (!player) return null
              const items = (Object.entries(delta) as Array<[Resource, number]>).filter(([, n]) => n !== 0)
              return (
                <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    minWidth: 100,
                    fontWeight: 'bold',
                    color: player.color,
                    fontSize: 20,
                    textShadow: `0 0 12px ${player.color}66`,
                  }}>
                    {player.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {items.map(([res, n]) => (
                      <div key={res} style={{
                        background: n > 0 ? RESOURCE_COLORS[res] : '#444',
                        color: '#fff',
                        padding: '10px 14px',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 22,
                        fontWeight: 'bold',
                        border: '2px solid rgba(255,255,255,0.3)',
                        boxShadow: `0 4px 18px ${n > 0 ? RESOURCE_COLORS[res] : '#000'}66`,
                        animation: 'itemBounce 0.6s ease',
                      }}>
                        <span style={{ fontSize: 28 }}>{RESOURCE_ICONS[res]}</span>
                        <span>{n > 0 ? '+' : ''}{n}</span>
                        <span style={{ fontSize: 13, opacity: 0.85 }}>{RESOURCE_SHORT[res]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

const overlayCSS = `
@keyframes overlayFade {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes overlayPop {
  0%   { transform: scale(0.7) translateY(20px); }
  15%  { transform: scale(1.05) translateY(0); }
  25%  { transform: scale(1) translateY(0); }
  80%  { transform: scale(1) translateY(0); }
  100% { transform: scale(0.95) translateY(-10px); }
}
@keyframes itemBounce {
  0%   { transform: scale(0.4); opacity: 0; }
  40%  { transform: scale(1.2); opacity: 1; }
  70%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}
`

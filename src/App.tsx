import { useEffect, useReducer, useState } from 'react'
import { Board } from './components/Board'
import { PlayerCard, keyframes as playerKeyframes } from './components/PlayerPanel'
import { Controls } from './components/Controls'
import { canBuildAnything } from './game/checks'
import { Log } from './components/Log'
import { Setup } from './components/Setup'
import { GainOverlay } from './components/GainOverlay'
import { reducer } from './game/reducer'
import { createInitialState } from './game/setup'
import { buildMidGameFixture } from './game/fixtures'
import type { GameState, Resource, PlayerId } from './game/types'

const STORAGE_KEY = 'catan:state:v2'

function loadSavedState(): GameState | null {
  try {
    // Fixture pour screenshots / vitrine : ?fixture=mid
    const params = new URLSearchParams(location.search)
    if (params.get('fixture') === 'mid') return buildMidGameFixture()

    localStorage.removeItem('catan:state:v1')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (!parsed.devDeck || !parsed.players?.every(p => Array.isArray(p.devCards))) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY)
}

function useIsMobile(): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 820px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const h = () => setM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return m
}

export default function App() {
  const [initialState, setInitialState] = useState<GameState | null>(() => loadSavedState())

  function handleStart(names: string[]) {
    const s = createInitialState(names)
    saveState(s)
    setInitialState(s)
  }

  function handleReset() {
    clearSavedState()
    setInitialState(null)
  }

  if (!initialState) {
    return <Setup onStart={handleStart} />
  }

  return <Game initialState={initialState} onReset={handleReset} />
}

type CornerPos = { top?: string; right?: string; bottom?: string; left?: string }
const POSITIONS: Record<number, CornerPos[]> = {
  2: [
    { top: '16px',    left: '50%' },
    { bottom: '16px', left: '50%' },
  ],
  3: [
    { top: '16px',    left: '16px' },
    { top: '16px',    right: '16px' },
    { bottom: '16px', left: '50%' },
  ],
  4: [
    { top: '16px',    left: '16px' },
    { top: '16px',    right: '16px' },
    { bottom: '16px', right: '16px' },
    { bottom: '16px', left: '16px' },
  ],
}

function translateFor(pos: CornerPos): string | undefined {
  if (pos.left === '50%' || pos.right === '50%') return 'translateX(-50%)'
  return undefined
}

function Game({ initialState, onReset }: { initialState: GameState; onReset: () => void }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null)
  const [visibleDeltas, setVisibleDeltas] = useState<{
    id: number
    byPlayer: Record<PlayerId, Partial<Record<Resource, number>>>
  } | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!state.lastDeltas) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleDeltas(state.lastDeltas)
    const t = setTimeout(() => setVisibleDeltas(null), 2400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastDeltas?.id])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (state.phase === 'roll') {
        e.preventDefault()
        const d1 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
        const d2 = Math.ceil(Math.random() * 6) as 1|2|3|4|5|6
        dispatch({ type: 'ROLL_DICE', dice: [d1, d2] })
      } else if (state.phase === 'actions') {
        e.preventDefault()
        if (canBuildAnything(state) && !confirm('Vous pouvez encore construire. Finir le tour quand même ?')) return
        dispatch({ type: 'END_TURN' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state])

  if (isMobile) {
    return <MobileGame state={state} dispatch={dispatch} selectedVertex={selectedVertex} setSelectedVertex={setSelectedVertex} visibleDeltas={visibleDeltas} onReset={onReset} />
  }

  const positions = POSITIONS[state.players.length] ?? POSITIONS[4]

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#eee',
      fontFamily: 'sans-serif',
    }}>
      <style>{playerKeyframes}</style>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 900, height: 800,
          border: `6px solid ${state.players[state.currentPlayerIndex].color}`,
          borderRadius: 12,
          boxShadow: `0 0 24px ${state.players[state.currentPlayerIndex].color}66`,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
          overflow: 'hidden',
        }}>
          <Board
            state={state}
            dispatch={dispatch}
            selectedVertex={selectedVertex}
            onSelectVertex={setSelectedVertex}
          />
        </div>

        {state.players.map((player, i) => {
          const pos = positions[i]
          const transform = translateFor(pos)
          return (
            <div
              key={player.id}
              style={{ position: 'absolute', zIndex: 5, transform, ...pos }}
            >
              <PlayerCard
                player={player}
                isActive={i === state.currentPlayerIndex}
                delta={visibleDeltas?.byPlayer[player.id]}
                largestArmy={state.largestArmy === player.id}
                knightsPlayed={player.knightsPlayed}
              />
            </div>
          )
        })}

        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          width: 260,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <h3 style={{
            margin: 0, fontSize: 15, color: '#ddd',
            background: 'rgba(15,15,26,0.7)', borderRadius: 6,
            padding: '4px 10px', backdropFilter: 'blur(4px)',
            border: '1px solid #333',
          }}>
            🏝️ Catan
          </h3>
          <div style={{
            maxHeight: 140, overflow: 'hidden',
            background: 'rgba(15,15,26,0.7)',
            borderRadius: 6, border: '1px solid #333',
            backdropFilter: 'blur(4px)',
          }}>
            <Log entries={state.log} />
          </div>
          <button
            style={{
              background: 'rgba(127,140,141,0.85)', color: '#fff', border: 'none',
              borderRadius: 6, padding: 6, cursor: 'pointer', fontSize: 12,
            }}
            onClick={() => { if (confirm('Abandonner la partie en cours ?')) onReset() }}
          >
            Nouvelle partie
          </button>
        </div>
      </div>

      <div style={{ width: 300, padding: 12, overflowY: 'auto', borderLeft: '1px solid #333' }}>
        <Controls state={state} dispatch={dispatch} />
      </div>

      <GainOverlay state={state} />
    </div>
  )
}

interface MobileGameProps {
  state: GameState
  dispatch: (a: Parameters<typeof reducer>[1]) => void
  selectedVertex: string | null
  setSelectedVertex: (v: string | null) => void
  visibleDeltas: { id: number; byPlayer: Record<PlayerId, Partial<Record<Resource, number>>> } | null
  onReset: () => void
}

function MobileGame({ state, dispatch, selectedVertex, setSelectedVertex, visibleDeltas, onReset }: MobileGameProps) {
  const current = state.players[state.currentPlayerIndex]
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#eee',
      fontFamily: 'sans-serif',
    }}>
      <style>{playerKeyframes}</style>

      {/* Header sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '8px 12px',
        background: 'rgba(15,15,26,0.92)',
        borderBottom: '1px solid #333',
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>🏝️</span>
          <span style={{
            fontSize: 13, color: '#aaa',
          }}>Tour :</span>
          <span style={{
            color: current.color, fontWeight: 'bold', fontSize: 15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {current.name}
          </span>
        </div>
        <button
          onClick={() => { if (confirm('Abandonner la partie en cours ?')) onReset() }}
          style={{
            background: 'rgba(127,140,141,0.85)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
            flexShrink: 0,
          }}
        >
          Nouvelle
        </button>
      </div>

      {/* Player cards — ligne unique (2/3 joueurs) ou grille 2×2 (4 joueurs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: state.players.length === 4 ? '1fr 1fr' : `repeat(${state.players.length}, 1fr)`,
        gap: 4, padding: '6px 8px',
      }}>
        {state.players.map((player, i) => (
          <PlayerCard
            key={player.id}
            player={player}
            isActive={i === state.currentPlayerIndex}
            delta={visibleDeltas?.byPlayer[player.id]}
            largestArmy={state.largestArmy === player.id}
            knightsPlayed={player.knightsPlayed}
            compact
          />
        ))}
      </div>

      {/* Plateau */}
      <div style={{
        width: '100%', padding: '0 4px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: 900, position: 'relative',
          border: `4px solid ${current.color}`,
          borderRadius: 10,
          boxShadow: `0 0 16px ${current.color}66`,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}>
          <Board
            state={state}
            dispatch={dispatch}
            selectedVertex={selectedVertex}
            onSelectVertex={setSelectedVertex}
          />
        </div>
      </div>

      {/* Controls full width */}
      <div style={{ padding: 10 }}>
        <Controls state={state} dispatch={dispatch} isMobile />
      </div>

      {/* Log compact */}
      <div style={{ padding: '0 10px 10px' }}>
        <div style={{
          maxHeight: 110, overflow: 'hidden',
          background: 'rgba(15,15,26,0.7)',
          borderRadius: 6, border: '1px solid #333',
        }}>
          <Log entries={state.log} />
        </div>
      </div>

      <GainOverlay state={state} />
    </div>
  )
}

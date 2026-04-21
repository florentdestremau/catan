import { useEffect, useReducer, useState } from 'react'
import { Board } from './components/Board'
import { PlayerPanel } from './components/PlayerPanel'
import { Controls, canBuildAnything } from './components/Controls'
import { Log } from './components/Log'
import { Setup } from './components/Setup'
import { GainOverlay } from './components/GainOverlay'
import { reducer } from './game/reducer'
import { createInitialState } from './game/setup'
import type { GameState } from './game/types'

const STORAGE_KEY = 'catan:state:v2'

function loadSavedState(): GameState | null {
  try {
    // Nettoyer d'éventuelles anciennes versions
    localStorage.removeItem('catan:state:v1')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    // Validation de schéma minimal (attrape les sauvegardes d'un ancien format)
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
    /* ignore quota errors */
  }
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY)
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

function Game({ initialState, onReset }: { initialState: GameState; onReset: () => void }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#eee',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ width: 240, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', borderRight: '1px solid #333' }}>
        <h3 style={{ margin: 0, textAlign: 'center' }}>🏝️ Catan</h3>
        <PlayerPanel state={state} />
        <Log entries={state.log} />
        <button
          style={{ background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: 6, padding: 8, cursor: 'pointer', fontSize: 13 }}
          onClick={() => {
            if (confirm('Abandonner la partie en cours ?')) onReset()
          }}
        >
          Nouvelle partie
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Board
          state={state}
          dispatch={dispatch}
          selectedVertex={selectedVertex}
          onSelectVertex={setSelectedVertex}
        />
      </div>

      <div style={{ width: 260, padding: 12, overflowY: 'auto', borderLeft: '1px solid #333' }}>
        <Controls state={state} dispatch={dispatch} />
      </div>

      <GainOverlay state={state} />
    </div>
  )
}

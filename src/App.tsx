import { useEffect, useReducer, useState } from 'react'
import { Board } from './components/Board'
import { PlayerCard, keyframes as playerKeyframes } from './components/PlayerPanel'
import { Controls } from './components/Controls'
import { canBuildAnything } from './game/checks'
import { Log } from './components/Log'
import { Home } from './components/Home'
import { Lobby } from './components/Lobby'
import { GainOverlay } from './components/GainOverlay'
import { reducer } from './game/reducer'
import { buildMidGameFixture } from './game/fixtures'
import { useRoom } from './net/useRoom'
import { loadCreds, clearCreds, joinRoomApi, saveCreds } from './net/api'
import type { GameState, Resource, PlayerId } from './game/types'
import type { GameAction } from './game/actions'

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

// ---- Entrée : détermine le flow (demo hotseat via ?fixture=mid, sinon multijoueur)
export default function App() {
  const params = new URLSearchParams(location.search)
  const fixtureMode = params.get('fixture') === 'mid'

  if (fixtureMode) {
    return <HotseatDemo />
  }
  return <MultiplayerRoot />
}

// ---- Mode hotseat local (démo fixture) ----
function HotseatDemo() {
  const [initial] = useState<GameState>(() => buildMidGameFixture())
  const [state, dispatch] = useReducer(reducer, initial)
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null)
  return (
    <GameView
      state={state}
      dispatch={dispatch}
      selectedVertex={selectedVertex}
      setSelectedVertex={setSelectedVertex}
      myPlayerId={state.players[state.currentPlayerIndex].id}
      onLeave={() => { location.href = '/' }}
      hotseat
    />
  )
}

// ---- Mode multijoueur en ligne ----
type Creds = { roomId: string; token: string; playerId: string }

function MultiplayerRoot() {
  const [creds, setCreds] = useState<Creds | null>(() => detectInitialCreds())
  const [autoError, setAutoError] = useState<string | null>(null)

  // Détecte un ?join=ROOMID : rejoindre automatiquement si pas encore de creds
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const join = params.get('join')
    if (join && !creds) {
      // On envoie l'utilisateur sur la home ; elle peut cliquer "rejoindre" avec le code pré-rempli
      // Plus simple : on propose le join directement via creds locaux si existants
      const local = loadCreds(join.toUpperCase())
      if (local) {
        // Retenter avec token stocké — le serveur l'accepte même si la partie est démarrée
        joinRoomApi(join.toUpperCase(), '', local.token)
          .then(c => { saveCreds(c); setCreds(c); cleanJoinParam() })
          .catch(e => setAutoError((e as Error).message))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!creds) {
    return (
      <>
        {autoError && <Banner message={autoError} />}
        <Home onJoined={roomId => {
          const c = loadCreds(roomId)
          if (c) setCreds(c)
        }} />
      </>
    )
  }
  return <ConnectedRoom creds={creds} onLeave={() => { clearCreds(creds.roomId); setCreds(null) }} />
}

function detectInitialCreds(): Creds | null {
  const params = new URLSearchParams(location.search)
  const join = params.get('join')
  if (join) {
    const existing = loadCreds(join.toUpperCase())
    if (existing) return existing
  }
  // Cherche n'importe quel creds stocké (pour reprise auto)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('catan:mp:')) {
      try {
        const raw = localStorage.getItem(k)
        if (raw) return JSON.parse(raw) as Creds
      } catch { /* ignore */ }
    }
  }
  return null
}

function cleanJoinParam() {
  const url = new URL(location.href)
  url.searchParams.delete('join')
  history.replaceState({}, '', url.toString())
}

function ConnectedRoom({ creds, onLeave }: { creds: Creds; onLeave: () => void }) {
  const { room, myPlayerId, connected, lastError, sendAction } = useRoom(creds.roomId, creds.token)

  if (!room || !myPlayerId) {
    return (
      <CenteredMessage>
        <div style={{ fontSize: 18 }}>
          {connected ? '⏳ Chargement du salon…' : '🔌 Connexion au serveur…'}
        </div>
        {lastError && <div style={{ color: '#e74c3c', marginTop: 10 }}>{lastError}</div>}
        <button onClick={onLeave} style={leaveBtn}>Retour</button>
      </CenteredMessage>
    )
  }

  if (!room.state) {
    return <Lobby room={room} myPlayerId={myPlayerId} token={creds.token} onLeave={onLeave} />
  }

  // Partie lancée : le dispatch passe par le WS
  const dispatch = (action: GameAction) => sendAction(action)
  return (
    <OnlineGame
      state={room.state}
      dispatch={dispatch}
      myPlayerId={myPlayerId}
      connected={connected}
      lastError={lastError}
      onLeave={onLeave}
    />
  )
}

function Banner({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
      background: '#c0392b', color: '#fff', padding: '8px 16px', borderRadius: 8,
      fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 8,
      background: '#0f0f1a', color: '#eee', fontFamily: 'sans-serif',
    }}>{children}</div>
  )
}

const leaveBtn: React.CSSProperties = {
  marginTop: 14, padding: '8px 16px', borderRadius: 6,
  background: 'rgba(127,140,141,0.85)', color: '#fff', border: 'none',
  cursor: 'pointer', fontSize: 13,
}

// ---- OnlineGame = wrap GameView avec gate myPlayerId ----
function OnlineGame({
  state, dispatch, myPlayerId, connected, lastError, onLeave,
}: {
  state: GameState
  dispatch: (a: GameAction) => void
  myPlayerId: PlayerId
  connected: boolean
  lastError: string | null
  onLeave: () => void
}) {
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null)
  return (
    <>
      {!connected && <Banner message="🔌 Reconnexion en cours…" />}
      {lastError && <Banner message={lastError} />}
      <GameView
        state={state}
        dispatch={dispatch}
        selectedVertex={selectedVertex}
        setSelectedVertex={setSelectedVertex}
        myPlayerId={myPlayerId}
        onLeave={onLeave}
      />
    </>
  )
}

// ---- GameView = layout + dispatch-gate ----
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

interface GameViewProps {
  state: GameState
  dispatch: (a: GameAction) => void
  selectedVertex: string | null
  setSelectedVertex: (v: string | null) => void
  myPlayerId: PlayerId
  onLeave: () => void
  hotseat?: boolean
}

function GameView({ state, dispatch, selectedVertex, setSelectedVertex, myPlayerId, onLeave, hotseat = false }: GameViewProps) {
  const [visibleDeltas, setVisibleDeltas] = useState<{
    id: number
    byPlayer: Record<PlayerId, Partial<Record<Resource, number>>>
  } | null>(null)
  const isMobile = useIsMobile()
  const currentPlayer = state.players[state.currentPlayerIndex]
  const isMyTurn = hotseat || currentPlayer.id === myPlayerId

  // Gate : si ce n'est pas mon tour (sauf défausse qui me concerne), les actions sont inertes
  const gatedDispatch = (action: GameAction) => {
    if (!hotseat) {
      const isDiscardForMe = action.type === 'DISCARD' && action.playerId === myPlayerId
      if (!isMyTurn && !isDiscardForMe) return
    }
    dispatch(action)
  }

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
      if (!isMyTurn) return
      if (state.phase === 'roll') {
        e.preventDefault()
        gatedDispatch({ type: 'ROLL_DICE', dice: [1, 1] })
      } else if (state.phase === 'actions') {
        e.preventDefault()
        if (canBuildAnything(state) && !confirm('Vous pouvez encore construire. Finir le tour quand même ?')) return
        gatedDispatch({ type: 'END_TURN' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isMyTurn])

  if (isMobile) {
    return (
      <MobileGame
        state={state}
        dispatch={gatedDispatch}
        selectedVertex={selectedVertex}
        setSelectedVertex={setSelectedVertex}
        visibleDeltas={visibleDeltas}
        myPlayerId={myPlayerId}
        isMyTurn={isMyTurn}
        onLeave={onLeave}
      />
    )
  }

  const positions = POSITIONS[state.players.length] ?? POSITIONS[4]

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#0f0f1a', color: '#eee', fontFamily: 'sans-serif',
    }}>
      <style>{playerKeyframes}</style>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 900, height: 800,
          border: `6px solid ${currentPlayer.color}`,
          borderRadius: 12,
          boxShadow: `0 0 24px ${currentPlayer.color}66`,
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
          overflow: 'hidden',
        }}>
          <Board
            state={state}
            dispatch={gatedDispatch}
            selectedVertex={selectedVertex}
            onSelectVertex={setSelectedVertex}
          />
        </div>

        {state.players.map((player, i) => {
          const pos = positions[i]
          const transform = translateFor(pos)
          return (
            <div key={player.id} style={{ position: 'absolute', zIndex: 5, transform, ...pos }}>
              <PlayerCard
                player={player}
                isActive={i === state.currentPlayerIndex}
                delta={visibleDeltas?.byPlayer[player.id]}
                largestArmy={state.largestArmy === player.id}
                knightsPlayed={player.knightsPlayed}
              />
              {player.id === myPlayerId && !hotseat && (
                <div style={meBadge}>Toi</div>
              )}
            </div>
          )
        })}

        <div style={{
          position: 'absolute', bottom: 16, left: 16, width: 260, zIndex: 5,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <h3 style={{
            margin: 0, fontSize: 15, color: '#ddd',
            background: 'rgba(15,15,26,0.7)', borderRadius: 6,
            padding: '4px 10px', backdropFilter: 'blur(4px)',
            border: '1px solid #333',
          }}>
            🏝️ Catan {hotseat && <span style={{ fontSize: 11, color: '#888' }}>(démo locale)</span>}
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
            onClick={() => { if (confirm(hotseat ? 'Retour à l\'accueil ?' : 'Quitter le salon ?')) onLeave() }}
          >
            {hotseat ? 'Retour' : 'Quitter'}
          </button>
        </div>
      </div>

      <div style={{ width: 300, padding: 12, overflowY: 'auto', borderLeft: '1px solid #333' }}>
        {!isMyTurn && !hotseat && (
          <div style={waitingBanner}>
            ⏳ Tour de <strong style={{ color: currentPlayer.color }}>{currentPlayer.name}</strong>
          </div>
        )}
        <Controls state={state} dispatch={gatedDispatch} />
      </div>

      <GainOverlay state={state} />
    </div>
  )
}

interface MobileGameProps {
  state: GameState
  dispatch: (a: GameAction) => void
  selectedVertex: string | null
  setSelectedVertex: (v: string | null) => void
  visibleDeltas: { id: number; byPlayer: Record<PlayerId, Partial<Record<Resource, number>>> } | null
  myPlayerId: PlayerId
  isMyTurn: boolean
  onLeave: () => void
}

function MobileGame({ state, dispatch, selectedVertex, setSelectedVertex, visibleDeltas, myPlayerId, isMyTurn, onLeave }: MobileGameProps) {
  const current = state.players[state.currentPlayerIndex]
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: '#0f0f1a', color: '#eee', fontFamily: 'sans-serif',
    }}>
      <style>{playerKeyframes}</style>

      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '8px 12px',
        background: 'rgba(15,15,26,0.92)', borderBottom: '1px solid #333',
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>🏝️</span>
          <span style={{ fontSize: 13, color: '#aaa' }}>Tour :</span>
          <span style={{
            color: current.color, fontWeight: 'bold', fontSize: 15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{current.name}{isMyTurn && ' (toi)'}</span>
        </div>
        <button
          onClick={() => { if (confirm('Quitter ?')) onLeave() }}
          style={{
            background: 'rgba(127,140,141,0.85)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
            flexShrink: 0,
          }}
        >Quitter</button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: state.players.length === 4 ? '1fr 1fr' : `repeat(${state.players.length}, 1fr)`,
        gap: 4, padding: '6px 8px',
      }}>
        {state.players.map((player, i) => (
          <div key={player.id} style={{ position: 'relative' }}>
            <PlayerCard
              player={player}
              isActive={i === state.currentPlayerIndex}
              delta={visibleDeltas?.byPlayer[player.id]}
              largestArmy={state.largestArmy === player.id}
              knightsPlayed={player.knightsPlayed}
              compact
            />
            {player.id === myPlayerId && (
              <div style={{ ...meBadge, top: 2, right: 2, fontSize: 9, padding: '1px 5px' }}>toi</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        width: '100%', padding: '0 4px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: '100%', maxWidth: 900, position: 'relative',
          border: `4px solid ${current.color}`, borderRadius: 10,
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

      <div style={{ padding: 10 }}>
        {!isMyTurn && (
          <div style={waitingBanner}>
            ⏳ Tour de <strong style={{ color: current.color }}>{current.name}</strong>
          </div>
        )}
        <Controls state={state} dispatch={dispatch} isMobile />
      </div>

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

const meBadge: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6,
  background: '#2ecc71', color: '#fff',
  borderRadius: 10, padding: '2px 8px',
  fontSize: 10, fontWeight: 'bold',
  boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
  border: '1px solid #fff',
  zIndex: 6,
}

const waitingBanner: React.CSSProperties = {
  background: 'rgba(52,152,219,0.15)', border: '1px solid #3498db',
  color: '#eee', borderRadius: 8, padding: '8px 12px',
  marginBottom: 10, fontSize: 13, textAlign: 'center',
}

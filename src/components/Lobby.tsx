import { useEffect, useState } from 'react'
import type { PublicRoom } from '../net/types'
import type { PlayerId } from '../game/types'
import { clearCreds, renameSlotApi, startRoomApi } from '../net/api'

interface LobbyProps {
  room: PublicRoom
  myPlayerId: PlayerId
  token: string
  onLeave: () => void
}

export function Lobby({ room, myPlayerId, token, onLeave }: LobbyProps) {
  const mySlot = room.slots.find(s => s.playerId === myPlayerId)
  const isHost = room.host === myPlayerId
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(mySlot?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shareUrl = `${location.origin}/?join=${room.id}`
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(
    () => (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    if (notifPerm === 'unsupported') return
    const h = () => setNotifPerm(Notification.permission)
    window.addEventListener('focus', h)
    return () => window.removeEventListener('focus', h)
  }, [notifPerm])

  async function handleEnableNotif() {
    if (notifPerm === 'unsupported') return
    const res = await Notification.requestPermission()
    setNotifPerm(res)
  }

  async function handleRename() {
    setBusy(true); setError(null)
    try {
      await renameSlotApi(room.id, token, newName)
      setEditing(false)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function handleStart() {
    setBusy(true); setError(null)
    try { await startRoomApi(room.id, token) }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(shareUrl) } catch { /* ignore */ }
  }

  function handleLeave() {
    clearCreds(room.id)
    onLeave()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f1424 0%, #0a0a12 100%)',
      color: '#eee', fontFamily: 'sans-serif',
      padding: 'clamp(16px, 3vw, 40px)',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px', textAlign: 'center' }}>
          Salon <span style={{
            background: '#1a2550', padding: '4px 14px', borderRadius: 10,
            letterSpacing: 4, fontFamily: 'monospace', color: '#f39c12',
          }}>{room.id}</span>
        </h1>
        <p style={{ textAlign: 'center', color: '#b8c5d6', fontSize: 14, margin: '0 0 20px' }}>
          Partage ce code à tes amis pour qu'ils rejoignent.
        </p>

        <div style={{
          background: '#101830', border: '1px solid #2a3a5a',
          borderRadius: 12, padding: 14, marginBottom: 20,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            readOnly value={shareUrl}
            style={{
              flex: 1, background: '#0c1528', color: '#fff',
              border: '1px solid #2a3a5a', borderRadius: 6,
              padding: '8px 12px', fontSize: 13, fontFamily: 'monospace',
            }}
            onFocus={e => e.currentTarget.select()}
          />
          <button onClick={handleCopy} style={{
            background: '#3498db', color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 'bold',
          }}>📋 Copier</button>
        </div>

        {notifPerm === 'default' && (
          <button onClick={handleEnableNotif} style={{
            width: '100%', padding: '10px 14px', marginBottom: 16, borderRadius: 10,
            border: '1px solid #2a3a5a', background: '#101830', color: '#e8eef7',
            cursor: 'pointer', fontSize: 13,
          }}>
            🔔 Activer les notifications quand c'est à toi de jouer
          </button>
        )}
        {notifPerm === 'denied' && (
          <div style={{
            padding: '8px 12px', marginBottom: 16, borderRadius: 8,
            background: 'rgba(230,126,34,0.12)', border: '1px solid #c98a3a',
            color: '#e8d8b8', fontSize: 12, textAlign: 'center',
          }}>
            🔕 Notifications bloquées — active-les dans les réglages du navigateur pour être prévenu à ton tour.
          </div>
        )}

        <h2 style={{ fontSize: 16, color: '#a0b0c5', textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 10px' }}>
          Joueurs ({room.slots.length}/4)
        </h2>
        <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
          {room.slots.map((slot, i) => {
            const isMe = slot.playerId === myPlayerId
            return (
              <div key={slot.playerId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: isMe ? `${slot.color}22` : '#101830',
                border: `2px solid ${slot.color}${isMe ? 'ff' : '55'}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: slot.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold',
                }}>{i + 1}</div>
                {isMe && editing ? (
                  <>
                    <input
                      autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                      maxLength={20}
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                      style={{
                        flex: 1, background: '#0c1528', color: '#fff',
                        border: '1px solid #2a3a5a', borderRadius: 6,
                        padding: '6px 10px', fontSize: 15,
                      }}
                    />
                    <button onClick={handleRename} disabled={busy} style={miniBtn}>✓</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>
                      {slot.name} {isMe && <span style={{ color: '#888', fontSize: 12 }}>(toi)</span>}
                      {slot.playerId === room.host && <span title="Hôte" style={{ marginLeft: 6 }}>👑</span>}
                    </span>
                    {isMe && (
                      <button
                        onClick={() => { setNewName(slot.name); setEditing(true) }}
                        style={miniBtn}
                      >✏️</button>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {Array.from({ length: 4 - room.slots.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              padding: '12px 14px', borderRadius: 10,
              border: '2px dashed #2a3a5a',
              color: '#556070', fontSize: 14, fontStyle: 'italic',
            }}>
              En attente d'un joueur…
            </div>
          ))}
        </div>

        {error && <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: 'rgba(192,57,43,0.2)', border: '1px solid #c0392b',
          color: '#fff', fontSize: 13, textAlign: 'center',
        }}>{error}</div>}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={busy || room.slots.length < 2}
            style={{
              width: '100%', padding: 16, borderRadius: 12, border: 'none',
              background: room.slots.length < 2
                ? '#555'
                : 'linear-gradient(135deg, #27ae60 0%, #16a085 100%)',
              color: '#fff', fontSize: 17, fontWeight: 'bold',
              cursor: room.slots.length < 2 ? 'not-allowed' : 'pointer',
              boxShadow: room.slots.length < 2 ? undefined : '0 6px 18px rgba(39,174,96,0.4)',
            }}
          >
            {room.slots.length < 2 ? '⏳ Il faut au moins 2 joueurs' : '▶ Démarrer la partie'}
          </button>
        ) : (
          <div style={{
            padding: 14, textAlign: 'center', color: '#b8c5d6',
            background: '#101830', border: '1px solid #2a3a5a',
            borderRadius: 10, fontSize: 14,
          }}>
            ⏳ En attente que l'hôte démarre la partie…
          </div>
        )}

        <button onClick={handleLeave} style={{
          width: '100%', marginTop: 14, padding: 10, borderRadius: 8,
          border: '1px dashed #556070', background: 'transparent',
          color: '#a0b0c5', fontSize: 13, cursor: 'pointer',
        }}>
          Quitter le salon
        </button>
      </div>
    </div>
  )
}

const miniBtn: React.CSSProperties = {
  background: '#2a3a5a', color: '#fff', border: 'none',
  borderRadius: 6, padding: '6px 10px', fontSize: 13, cursor: 'pointer',
}

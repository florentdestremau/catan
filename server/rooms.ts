import { createInitialState } from '../src/game/setup'
import { reducer } from '../src/game/reducer'
import type { GameAction } from '../src/game/actions'
import type { GameState, PlayerId } from '../src/game/types'
import { saveRoom, loadRoom, loadAllRooms } from './db'

export type Slot = { playerId: PlayerId; token: string; name: string; color: string }

export type Room = {
  id: string
  host: PlayerId
  slots: Slot[]
  state: GameState | null
}

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']
const MAX_SLOTS = 4

const rooms = new Map<string, Room>()

function genId(len: number): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)]
  return s
}

function genToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function persist(room: Room) {
  saveRoom(room.id, JSON.stringify(room))
}

export function loadRoomsFromDisk() {
  for (const { id, json } of loadAllRooms()) {
    try {
      const r = JSON.parse(json) as Room
      rooms.set(id, r)
    } catch { /* ignore */ }
  }
}

export function getRoom(id: string): Room | null {
  const inMem = rooms.get(id)
  if (inMem) return inMem
  const raw = loadRoom(id)
  if (!raw) return null
  try {
    const r = JSON.parse(raw) as Room
    rooms.set(id, r)
    return r
  } catch { return null }
}

export function createRoom(hostName: string): { room: Room; token: string; playerId: PlayerId } {
  let id = genId(5)
  while (getRoom(id)) id = genId(5)
  const playerId: PlayerId = 'p0'
  const token = genToken()
  const room: Room = {
    id,
    host: playerId,
    slots: [{ playerId, token, name: hostName || 'Joueur 1', color: PLAYER_COLORS[0] }],
    state: null,
  }
  rooms.set(id, room)
  persist(room)
  return { room, token, playerId }
}

export function joinRoom(id: string, name: string, existingToken?: string): { room: Room; token: string; playerId: PlayerId } | { error: string } {
  const room = getRoom(id)
  if (!room) return { error: 'Room introuvable' }

  if (existingToken) {
    const found = room.slots.find(s => s.token === existingToken)
    if (found) return { room, token: found.token, playerId: found.playerId }
  }

  if (room.state !== null) return { error: 'Partie déjà démarrée' }
  if (room.slots.length >= MAX_SLOTS) return { error: 'Room pleine' }

  const playerId: PlayerId = `p${room.slots.length}`
  const token = genToken()
  room.slots.push({
    playerId,
    token,
    name: name || `Joueur ${room.slots.length + 1}`,
    color: PLAYER_COLORS[room.slots.length],
  })
  persist(room)
  return { room, token, playerId }
}

export function renameSlot(id: string, token: string, name: string): Room | { error: string } {
  const room = getRoom(id)
  if (!room) return { error: 'Room introuvable' }
  const slot = room.slots.find(s => s.token === token)
  if (!slot) return { error: 'Token invalide' }
  if (room.state !== null) return { error: 'Partie déjà démarrée' }
  slot.name = name.slice(0, 20) || slot.name
  persist(room)
  return room
}

export function startRoom(id: string, token: string): Room | { error: string } {
  const room = getRoom(id)
  if (!room) return { error: 'Room introuvable' }
  const slot = room.slots.find(s => s.token === token)
  if (!slot) return { error: 'Token invalide' }
  if (slot.playerId !== room.host) return { error: 'Seul l\'hôte peut démarrer' }
  if (room.slots.length < 2) return { error: 'Il faut au moins 2 joueurs' }
  if (room.state !== null) return { error: 'Déjà démarré' }

  const state = createInitialState(room.slots.map(s => s.name))
  state.players = state.players.map((p, i) => ({ ...p, id: room.slots[i].playerId, color: room.slots[i].color }))
  room.state = state
  persist(room)
  return room
}

export function applyAction(id: string, token: string, action: GameAction): Room | { error: string } {
  const room = getRoom(id)
  if (!room) return { error: 'Room introuvable' }
  if (!room.state) return { error: 'Partie pas encore démarrée' }
  const slot = room.slots.find(s => s.token === token)
  if (!slot) return { error: 'Token invalide' }

  const state = room.state
  const currentPlayer = state.players[state.currentPlayerIndex]
  const isDiscardFor = action.type === 'DISCARD' && action.playerId === slot.playerId

  if (!isDiscardFor && currentPlayer.id !== slot.playerId) {
    return { error: 'Ce n\'est pas votre tour' }
  }

  let effective = action
  if (action.type === 'ROLL_DICE') {
    const d1 = (Math.ceil(Math.random() * 6) as 1|2|3|4|5|6)
    const d2 = (Math.ceil(Math.random() * 6) as 1|2|3|4|5|6)
    effective = { type: 'ROLL_DICE', dice: [d1, d2] }
  }

  const next = reducer(state, effective)
  if (next === state) return { error: 'Action invalide' }
  room.state = next
  persist(room)
  return room
}

export function slotForToken(room: Room, token: string): Slot | undefined {
  return room.slots.find(s => s.token === token)
}

export function publicRoom(room: Room) {
  return {
    id: room.id,
    host: room.host,
    slots: room.slots.map(s => ({ playerId: s.playerId, name: s.name, color: s.color })),
    state: room.state,
  }
}

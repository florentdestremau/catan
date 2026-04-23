import type { GameState, PlayerId } from '../game/types'

export type PublicSlot = { playerId: PlayerId; name: string; color: string }

export type PublicRoom = {
  id: string
  host: PlayerId
  slots: PublicSlot[]
  state: GameState | null
}

export type ServerMessage =
  | { type: 'ROOM'; room: PublicRoom; myPlayerId: PlayerId }
  | { type: 'ERROR'; message: string }

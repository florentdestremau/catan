import type { GameState, Player, DevCardKind } from './types'
import { buildBoard } from './board'
import { emptyResources, terrainToResource } from './rules'
import { mulberry32 } from './rng'

export function buildDevDeck(rand: () => number): DevCardKind[] {
  const deck: DevCardKind[] = [
    ...Array<DevCardKind>(14).fill('knight'),
    ...Array<DevCardKind>(5).fill('vp'),
    ...Array<DevCardKind>(2).fill('road_building'),
    ...Array<DevCardKind>(2).fill('year_of_plenty'),
    ...Array<DevCardKind>(2).fill('monopoly'),
  ]
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']

export function createInitialState(playerNames: string[], seed?: number): GameState {
  const rand = mulberry32(seed ?? Date.now())
  const board = buildBoard(rand)

  const players: Player[] = playerNames.map((name, i) => ({
    id: `p${i}`,
    name,
    color: PLAYER_COLORS[i],
    resources: emptyResources(),
    pieces: { roads: 15, settlements: 5, cities: 4 },
    vp: 0,
    devCards: [],
    newDevCards: [],
    knightsPlayed: 0,
    hasPlayedDevCard: false,
  }))

  return {
    board,
    players,
    currentPlayerIndex: 0,
    phase: 'setup1',
    pendingDiscards: [],
    log: ['La partie commence !'],
    setupIndex: 0,  // 0..n-1 = setup1, n..2n-1 = setup2
    devDeck: buildDevDeck(rand),
  }
}

// Après le placement de la 2e colonie (setup2), donner les ressources
export function grantSetup2Resources(state: GameState, vertexId: string): GameState {
  const { board, players, currentPlayerIndex } = state
  const vertex = board.vertices[vertexId]
  const newPlayers = players.map(p => ({ ...p, resources: { ...p.resources } }))
  const player = newPlayers[currentPlayerIndex]

  for (const hexId of vertex.hexes) {
    const hex = board.hexes[hexId]
    if (!hex) continue
    const res = terrainToResource(hex.terrain)
    if (res) player.resources[res]++
  }

  return { ...state, players: newPlayers }
}

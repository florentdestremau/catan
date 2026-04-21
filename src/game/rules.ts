import type { GameState, ResourceMap, VertexId, EdgeId, PlayerId, Resource } from './types'
import { adjacentVertices, edgesOfVertex } from './board'

export const COSTS: Record<'road' | 'settlement' | 'city' | 'devCard', Partial<ResourceMap>> = {
  road:       { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city:       { wheat: 2, ore: 3 },
  devCard:    { wheat: 1, sheep: 1, ore: 1 },
}

export function emptyResources(): ResourceMap {
  return { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }
}

export function canAfford(resources: ResourceMap, cost: Partial<ResourceMap>): boolean {
  return (Object.entries(cost) as Array<[Resource, number]>).every(
    ([r, n]) => resources[r] >= n
  )
}

export function deductCost(resources: ResourceMap, cost: Partial<ResourceMap>): ResourceMap {
  const r = { ...resources }
  for (const [res, n] of Object.entries(cost) as Array<[Resource, number]>) {
    r[res] -= n
  }
  return r
}

// Règle de distance-2 : aucun sommet adjacent ne peut avoir un bâtiment
export function isSettlementPlacementValid(
  state: GameState,
  vid: VertexId,
  checkRoad: boolean,  // faux pendant le setup
  playerId: PlayerId
): boolean {
  const { board } = state
  const vertex = board.vertices[vid]
  if (!vertex) return false
  if (vertex.building) return false  // déjà occupé

  // Règle de distance
  const neighbors = adjacentVertices(vid, board.edges)
  if (neighbors.some(nvid => board.vertices[nvid]?.building)) return false

  if (!checkRoad) return true

  // Doit être connecté à une route du joueur
  const playerEdges = edgesOfVertex(vid, board.edges)
  return playerEdges.some(eid => board.edges[eid]?.road?.owner === playerId)
}

export function isRoadPlacementValid(
  state: GameState,
  eid: EdgeId,
  playerId: PlayerId,
  setupVertexId?: VertexId  // pendant le setup on autorise la route adjacente à la colonie posée
): boolean {
  const { board } = state
  const edge = board.edges[eid]
  if (!edge) return false
  if (edge.road) return false  // occupé

  const [v1, v2] = edge.vertices

  if (setupVertexId) {
    // Setup : la route doit toucher le sommet de la colonie posée
    return v1 === setupVertexId || v2 === setupVertexId
  }

  // Hors setup : doit être connectée au réseau du joueur
  for (const vid of [v1, v2]) {
    const v = board.vertices[vid]
    // Si le sommet a une colonie ennemie, elle coupe la route
    if (v?.building && v.building.owner !== playerId) continue
    // Colonie propre → route valide
    if (v?.building?.owner === playerId) return true
    // Sinon chercher une route adjacente du joueur sur ce sommet
    const adjEdges = edgesOfVertex(vid, board.edges)
    if (adjEdges.some(ae => ae !== eid && board.edges[ae]?.road?.owner === playerId)) {
      return true
    }
  }
  return false
}

// Vertices disponibles pour construire une colonie dans le setup
export function setupSettlementVertices(state: GameState): VertexId[] {
  return Object.keys(state.board.vertices).filter(vid =>
    isSettlementPlacementValid(state, vid, false, '')
  )
}

// Produce resources for a dice roll
export function produceResources(state: GameState, roll: number): GameState {
  if (roll === 7) return state
  const { board, players } = state
  const newPlayers = players.map(p => ({ ...p, resources: { ...p.resources } }))

  for (const hex of Object.values(board.hexes)) {
    if (hex.number !== roll) continue
    if (hex.id === board.robberHex) continue

    for (const vid of Object.keys(board.vertices)) {
      const vertex = board.vertices[vid]
      if (!vertex.building) continue
      if (!vertex.hexes.includes(hex.id)) continue

      const amount = vertex.building.type === 'city' ? 2 : 1
      const playerIdx = newPlayers.findIndex(p => p.id === vertex.building!.owner)
      if (playerIdx === -1) continue

      const resource = terrainToResource(hex.terrain)
      if (resource) {
        newPlayers[playerIdx].resources[resource] += amount
      }
    }
  }

  return { ...state, players: newPlayers }
}

import type { Terrain } from './types'

export function terrainToResource(terrain: Terrain): Resource | null {
  switch (terrain) {
    case 'forest':    return 'wood'
    case 'hills':     return 'brick'
    case 'fields':    return 'wheat'
    case 'pasture':   return 'sheep'
    case 'mountains': return 'ore'
    default:          return null
  }
}

export function totalCards(resources: ResourceMap): number {
  return Object.values(resources).reduce((a, b) => a + b, 0)
}

// Joueurs devant défausser après un 7
export function playersToDiscard(state: GameState): PlayerId[] {
  return state.players
    .filter(p => totalCards(p.resources) > 7)
    .map(p => p.id)
}

// Voisins d'un hex (par leurs PlayerId présents sur les sommets adjacents)
export function stealTargets(state: GameState, hexId: string, thiefId: PlayerId): PlayerId[] {
  const { board } = state
  const targets = new Set<PlayerId>()
  for (const v of Object.values(board.vertices)) {
    if (!v.hexes.includes(hexId)) continue
    if (!v.building) continue
    if (v.building.owner !== thiefId) {
      targets.add(v.building.owner)
    }
  }
  return [...targets]
}

export function computeVP(state: GameState): GameState {
  // Largest army : détenu par le joueur avec le plus de chevaliers (min 3).
  // Ne change de mains que si quelqu'un dépasse *strictement* le détenteur actuel.
  let largestArmy = state.largestArmy
  if (!largestArmy) {
    const leader = [...state.players]
      .filter(p => p.knightsPlayed >= 3)
      .sort((a, b) => b.knightsPlayed - a.knightsPlayed)[0]
    if (leader) largestArmy = leader.id
  } else {
    const holder = state.players.find(p => p.id === largestArmy)!
    const challenger = state.players
      .filter(p => p.id !== largestArmy && p.knightsPlayed > holder.knightsPlayed)
      .sort((a, b) => b.knightsPlayed - a.knightsPlayed)[0]
    if (challenger) largestArmy = challenger.id
  }

  const newPlayers = state.players.map(p => {
    let vp = 0
    for (const v of Object.values(state.board.vertices)) {
      if (!v.building || v.building.owner !== p.id) continue
      vp += v.building.type === 'city' ? 2 : 1
    }
    // Cartes Point de Victoire (on compte main + achetées ce tour)
    vp += p.devCards.filter(c => c === 'vp').length
    vp += p.newDevCards.filter(c => c === 'vp').length
    if (largestArmy === p.id) vp += 2
    return { ...p, vp }
  })
  const winner = newPlayers.find(p => p.vp >= 10)
  return {
    ...state,
    players: newPlayers,
    largestArmy,
    ...(winner ? { winner: winner.id, phase: 'ended' as const } : {}),
  }
}

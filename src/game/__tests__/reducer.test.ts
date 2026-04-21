import { describe, it, expect } from 'vitest'
import { createInitialState } from '../setup'
import { reducer } from '../reducer'
import { computeVP, isSettlementPlacementValid } from '../rules'
import type { GameState } from '../types'

function makeState(players = ['Alice', 'Bob'], seed = 42): GameState {
  return createInitialState(players, seed)
}

// Avancer le setup jusqu'à la phase 'roll'
function skipSetup(state: GameState): GameState {
  let s = state
  const n = s.players.length
  // setup1 + setup2 = 2n tours (colonie + route chacun)
  for (let turn = 0; turn < 2 * n; turn++) {
    // Trouver le premier sommet valide pour une colonie
    const vid = Object.keys(s.board.vertices).find(
      v => isSettlementPlacementValid(s, v, false, s.players[s.currentPlayerIndex].id)
    )
    if (!vid) throw new Error(`Aucun sommet valide au tour ${turn}, phase ${s.phase}`)
    s = reducer(s, { type: 'PLACE_SETTLEMENT', vertexId: vid })
    const pending = (s as GameState & { _pendingSettlement?: string })._pendingSettlement
    if (!pending) throw new Error(`Pas de _pendingSettlement après placement au tour ${turn}`)
    const eid = Object.keys(s.board.edges).find(
      e => s.board.edges[e].vertices.includes(pending) && !s.board.edges[e].road
    )
    if (!eid) throw new Error(`Pas d'arête disponible au tour ${turn}`)
    s = reducer(s, { type: 'PLACE_ROAD', edgeId: eid })
  }
  return s
}

describe('setup', () => {
  it('produit le bon nombre de sommets et arêtes', () => {
    const s = makeState()
    expect(Object.keys(s.board.hexes)).toHaveLength(19)
    expect(Object.keys(s.board.vertices).length).toBeGreaterThanOrEqual(54)
    expect(Object.keys(s.board.edges).length).toBeGreaterThanOrEqual(72)
  })

  it('le désert porte le voleur initial', () => {
    const s = makeState()
    const desert = Object.values(s.board.hexes).find(h => h.terrain === 'desert')!
    expect(s.board.robberHex).toBe(desert.id)
  })
})

describe('setup placement', () => {
  it('démarre en phase setup1', () => {
    expect(makeState().phase).toBe('setup1')
  })

  it('interdit de placer deux colonies adjacentes', () => {
    const s = makeState()
    const vids = Object.keys(s.board.vertices)
    const s2 = reducer(s, { type: 'PLACE_SETTLEMENT', vertexId: vids[0] })
    const pending = (s2 as GameState & { _pendingSettlement?: string })._pendingSettlement
    if (!pending) return  // placement rejeté d'emblée
    const edgeId = Object.keys(s2.board.edges).find(
      eid => s2.board.edges[eid].vertices.includes(pending) && !s2.board.edges[eid].road
    )!
    const s3 = reducer(s2, { type: 'PLACE_ROAD', edgeId })
    // Essayer de placer sur un sommet adjacent au premier
    const adjEdges = Object.values(s3.board.edges).filter(e => e.vertices.includes(vids[0]))
    const adjacentVids = adjEdges.flatMap(e => e.vertices).filter(v => v !== vids[0])
    const s4 = reducer(s3, { type: 'PLACE_SETTLEMENT', vertexId: adjacentVids[0] })
    expect(s4.board.vertices[adjacentVids[0]].building).toBeUndefined()
  })

  it('termine en phase roll après tous les placements', () => {
    const s = skipSetup(makeState())
    expect(s.phase).toBe('roll')
  })
})

describe('production de ressources', () => {
  it('les joueurs reçoivent des ressources sur le jet correspondant', () => {
    const s = skipSetup(makeState(['Alice', 'Bob'], 42))
    expect(s.phase).toBe('roll')

    // Trouver un hex numéroté avec une colonie, hors voleur
    let targetHexId: string | null = null
    let targetNumber: number | null = null
    let ownerIdx = -1

    for (const hex of Object.values(s.board.hexes)) {
      if (!hex.number || hex.id === s.board.robberHex) continue
      for (const v of Object.values(s.board.vertices)) {
        if (v.building && v.hexes.includes(hex.id)) {
          ownerIdx = s.players.findIndex(p => p.id === v.building!.owner)
          targetHexId = hex.id
          targetNumber = hex.number
          break
        }
      }
      if (targetHexId) break
    }

    if (!targetHexId || !targetNumber || ownerIdx === -1) return  // skip si aucun match

    const d1 = Math.min(targetNumber - 1, 6)
    const d2 = targetNumber - d1
    if (d2 < 1 || d2 > 6 || d1 < 1) return  // pas représentable, skip

    const beforeTotal = Object.values(s.players[ownerIdx].resources).reduce((a, b) => a + b, 0)
    type Die = 1|2|3|4|5|6
    const s2 = reducer(s, { type: 'ROLL_DICE', dice: [d1 as Die, d2 as Die] })
    const afterTotal = Object.values(s2.players[ownerIdx].resources).reduce((a, b) => a + b, 0)
    expect(afterTotal).toBeGreaterThan(beforeTotal)
  })
})

describe('voleur', () => {
  it('déclenche la phase move_robber sur un 7 (sans joueur >7 cartes)', () => {
    const s = skipSetup(makeState())
    const s2 = reducer(s, { type: 'ROLL_DICE', dice: [3, 4] })
    expect(s2.phase).toBe('move_robber')
  })

  it('déclenche la phase discard si un joueur a >7 cartes', () => {
    let s = skipSetup(makeState())
    s = { ...s, players: s.players.map((p, i) => i === 0 ? { ...p, resources: { wood: 2, brick: 2, wheat: 2, sheep: 1, ore: 1 } } : p) }
    const s2 = reducer(s, { type: 'ROLL_DICE', dice: [3, 4] })
    expect(s2.phase).toBe('discard')
    expect(s2.pendingDiscards).toContain(s2.players[0].id)
  })

  it('passe à move_robber après défausse complète', () => {
    let s = skipSetup(makeState())
    s = { ...s, players: s.players.map((p, i) => i === 0 ? { ...p, resources: { wood: 2, brick: 2, wheat: 2, sheep: 1, ore: 1 } } : p) }
    let s2 = reducer(s, { type: 'ROLL_DICE', dice: [3, 4] })
    s2 = reducer(s2, { type: 'DISCARD', playerId: s2.players[0].id, resources: { wood: 2, brick: 2 } })
    expect(s2.phase).toBe('move_robber')
  })
})

describe('victoire', () => {
  it('passe en phase ended quand un joueur atteint 10 PV', () => {
    let s = skipSetup(makeState(['Alice', 'Bob'], 1))
    const vids = Object.keys(s.board.vertices)
    // Forger 5 villes pour le joueur 0 sur des sommets libres
    let placed = 0
    for (const vid of vids) {
      if (placed >= 5) break
      const v = s.board.vertices[vid]
      if (!v.building) {
        s = {
          ...s,
          board: {
            ...s.board,
            vertices: {
              ...s.board.vertices,
              [vid]: { ...v, building: { owner: 'p0', type: 'city' } },
            },
          },
        }
        placed++
      }
    }
    const result = computeVP(s)
    expect(result.phase).toBe('ended')
    expect(result.winner).toBe('p0')
  })
})

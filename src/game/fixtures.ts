import type { GameState, Resource } from './types'
import { createInitialState } from './setup'
import { reducer } from './reducer'
import { isSettlementPlacementValid } from './rules'

// Construit un état de partie "milieu de partie" réaliste, pour vitrine/screenshot.
// Pas de hasard : on parcourt le setup en choisissant le premier emplacement valide,
// puis on force quelques ressources et constructions.
export function buildMidGameFixture(): GameState {
  let s = createInitialState(['Alice', 'Bob', 'Claire'], 7)
  const n = s.players.length

  // Setup serpent : 2n tours (colonie + route par tour)
  for (let turn = 0; turn < 2 * n; turn++) {
    const current = s.players[s.currentPlayerIndex]
    const vid = Object.keys(s.board.vertices).find(
      v => isSettlementPlacementValid(s, v, false, current.id)
    )
    if (!vid) throw new Error(`Pas de sommet valide au tour ${turn}`)
    s = reducer(s, { type: 'PLACE_SETTLEMENT', vertexId: vid })
    const pending = (s as GameState & { _pendingSettlement?: string })._pendingSettlement
    if (!pending) throw new Error(`Pas de _pendingSettlement au tour ${turn}`)
    const eid = Object.keys(s.board.edges).find(
      e => s.board.edges[e].vertices.includes(pending) && !s.board.edges[e].road
    )
    if (!eid) throw new Error(`Pas d'arête libre au tour ${turn}`)
    s = reducer(s, { type: 'PLACE_ROAD', edgeId: eid })
  }

  // Phase 'roll' — on force des ressources à chaque joueur + quelques cartes dev
  const giveRes: Record<Resource, number>[] = [
    { wood: 3, brick: 2, wheat: 2, sheep: 1, ore: 0 },
    { wood: 1, brick: 1, wheat: 3, sheep: 2, ore: 2 },
    { wood: 2, brick: 3, wheat: 1, sheep: 2, ore: 1 },
  ]
  s = {
    ...s,
    phase: 'actions',
    dice: [3, 4],
    players: s.players.map((p, i) => ({
      ...p,
      resources: giveRes[i] ?? p.resources,
      vp: [4, 3, 3][i] ?? p.vp,
      knightsPlayed: i === 0 ? 2 : i === 1 ? 1 : 0,
      devCards: i === 0 ? ['knight', 'year_of_plenty'] : i === 1 ? ['monopoly'] : [],
    })),
    log: [
      'La partie commence !',
      'Alice place sa 1re colonie',
      'Bob place sa 1re colonie',
      'Claire place sa 1re colonie',
      'Claire place sa 2e colonie',
      'Bob place sa 2e colonie',
      'Alice place sa 2e colonie',
      'Alice lance 3 + 4 = 7',
      'Alice déplace le voleur',
      'Bob lance 6 + 5 = 11',
      'Bob construit une route',
      'Claire lance 3 + 2 = 5',
      'Alice joue un Chevalier',
      'Alice prend la plus grande armée',
    ],
    largestArmy: undefined,
  }

  // Promouvoir une colonie en ville chez Alice pour que le board montre les deux
  const alice = s.players[0]
  const aliceSettlement = Object.entries(s.board.vertices).find(
    ([, v]) => v.building?.owner === alice.id && v.building.type === 'settlement'
  )
  if (aliceSettlement) {
    const [vid, v] = aliceSettlement
    s = {
      ...s,
      board: {
        ...s.board,
        vertices: {
          ...s.board.vertices,
          [vid]: { ...v, building: { owner: alice.id, type: 'city' } },
        },
      },
      players: s.players.map((p, i) => i === 0
        ? { ...p, pieces: { ...p.pieces, settlements: p.pieces.settlements + 1, cities: p.pieces.cities - 1 } }
        : p
      ),
    }
  }

  return s
}

import type { GameState } from './types'
import { canAfford, COSTS, isRoadPlacementValid, isSettlementPlacementValid } from './rules'

export function canBuildAnything(state: GameState): boolean {
  const current = state.players[state.currentPlayerIndex]
  const canRoad = canAfford(current.resources, COSTS.road) && current.pieces.roads > 0
    && Object.keys(state.board.edges).some(eid => isRoadPlacementValid(state, eid, current.id))
  if (canRoad) return true
  const canSettlement = canAfford(current.resources, COSTS.settlement) && current.pieces.settlements > 0
    && Object.keys(state.board.vertices).some(vid => isSettlementPlacementValid(state, vid, true, current.id))
  if (canSettlement) return true
  const canCity = canAfford(current.resources, COSTS.city) && current.pieces.cities > 0
    && Object.values(state.board.vertices).some(v => v.building?.owner === current.id && v.building.type === 'settlement')
  return canCity
}

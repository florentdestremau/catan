import type { VertexId, EdgeId, PlayerId, Resource } from './types'

export type GameAction =
  | { type: 'PLACE_SETTLEMENT'; vertexId: VertexId }
  | { type: 'PLACE_ROAD'; edgeId: EdgeId }
  | { type: 'ROLL_DICE'; dice: [number, number] }
  | { type: 'DISCARD'; playerId: PlayerId; resources: Partial<Record<Resource, number>> }
  | { type: 'MOVE_ROBBER'; hexId: string }
  | { type: 'STEAL'; targetId: PlayerId | null }
  | { type: 'BUILD_ROAD'; edgeId: EdgeId }
  | { type: 'BUILD_SETTLEMENT'; vertexId: VertexId }
  | { type: 'BUILD_CITY'; vertexId: VertexId }
  | { type: 'BANK_TRADE'; give: Resource; receive: Resource }
  | { type: 'BUY_DEV_CARD' }
  | { type: 'PLAY_KNIGHT' }
  | { type: 'PLAY_ROAD_BUILDING' }
  | { type: 'PLAY_YEAR_OF_PLENTY'; resources: [Resource, Resource] }
  | { type: 'PLAY_MONOPOLY'; resource: Resource }
  | { type: 'END_TURN' }

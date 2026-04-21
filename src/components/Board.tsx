import type { GameState } from '../game/types'
import type { GameAction } from '../game/actions'
import { hexToPixel, hexPoints } from '../game/hex'
import { vertexPosition } from '../game/board'
import {
  isSettlementPlacementValid,
  isRoadPlacementValid,
  canAfford,
  COSTS,
} from '../game/rules'

interface BoardProps {
  state: GameState
  dispatch: (action: GameAction) => void
  selectedVertex: string | null
  onSelectVertex: (vid: string | null) => void
}

const TERRAIN_COLORS: Record<string, string> = {
  forest:    '#2d6a2d',
  hills:     '#c0522a',
  fields:    '#d4a017',
  pasture:   '#6abf6a',
  mountains: '#888',
  desert:    '#e8d48b',
}

function TerrainPatterns() {
  return (
    <defs>
      {/* Forêt : sapins */}
      <pattern id="pat-forest" patternUnits="userSpaceOnUse" width="28" height="28">
        <rect width="28" height="28" fill="#2d6a2d" />
        <g fill="#1e4d1e">
          <polygon points="6,18 10,8 14,18" />
          <rect x="9" y="18" width="2" height="3" />
          <polygon points="18,22 22,12 26,22" />
          <rect x="21" y="22" width="2" height="3" />
        </g>
        <g fill="#3d8a3d" opacity="0.5">
          <polygon points="2,25 5,20 8,25" />
          <polygon points="14,12 17,7 20,12" />
        </g>
      </pattern>

      {/* Collines (argile) : briques */}
      <pattern id="pat-hills" patternUnits="userSpaceOnUse" width="24" height="16">
        <rect width="24" height="16" fill="#c0522a" />
        <g stroke="#7e2f15" strokeWidth="1" fill="none">
          <line x1="0" y1="8" x2="24" y2="8" />
          <line x1="0" y1="0" x2="0" y2="8" />
          <line x1="12" y1="0" x2="12" y2="8" />
          <line x1="6" y1="8" x2="6" y2="16" />
          <line x1="18" y1="8" x2="18" y2="16" />
          <line x1="0" y1="16" x2="24" y2="16" />
        </g>
        <g fill="#d96840" opacity="0.3">
          <rect x="1" y="1" width="10" height="6" />
          <rect x="13" y="1" width="10" height="6" />
          <rect x="7" y="9" width="10" height="6" />
        </g>
      </pattern>

      {/* Champs (blé) : tiges */}
      <pattern id="pat-fields" patternUnits="userSpaceOnUse" width="18" height="22">
        <rect width="18" height="22" fill="#d4a017" />
        <g stroke="#8a6a10" strokeWidth="1.2" fill="none">
          <line x1="3" y1="22" x2="3" y2="8" />
          <line x1="9" y1="22" x2="9" y2="4" />
          <line x1="15" y1="22" x2="15" y2="8" />
        </g>
        <g fill="#6a5410">
          <ellipse cx="3" cy="7" rx="1.5" ry="3" />
          <ellipse cx="9" cy="3" rx="1.5" ry="3" />
          <ellipse cx="15" cy="7" rx="1.5" ry="3" />
        </g>
        <g stroke="#e6b828" strokeWidth="0.6" fill="none">
          <line x1="3" y1="6" x2="1" y2="8" />
          <line x1="3" y1="6" x2="5" y2="8" />
          <line x1="9" y1="2" x2="7" y2="4" />
          <line x1="9" y1="2" x2="11" y2="4" />
          <line x1="15" y1="6" x2="13" y2="8" />
          <line x1="15" y1="6" x2="17" y2="8" />
        </g>
      </pattern>

      {/* Pâturage (mouton) : herbe + touffes */}
      <pattern id="pat-pasture" patternUnits="userSpaceOnUse" width="24" height="20">
        <rect width="24" height="20" fill="#6abf6a" />
        <g fill="#4a9a4a">
          <ellipse cx="6" cy="16" rx="4" ry="2" />
          <ellipse cx="18" cy="6" rx="4" ry="2" />
        </g>
        <g fill="#fff" opacity="0.85">
          <circle cx="6" cy="14" r="2.2" />
          <circle cx="7.5" cy="13" r="1.5" />
          <circle cx="4.5" cy="13" r="1.5" />
          <circle cx="18" cy="4" r="2.2" />
          <circle cx="19.5" cy="3" r="1.5" />
          <circle cx="16.5" cy="3" r="1.5" />
        </g>
        <g fill="#2c2c2c">
          <circle cx="6" cy="15.5" r="0.7" />
          <circle cx="18" cy="5.5" r="0.7" />
        </g>
      </pattern>

      {/* Montagnes (pierre) : pics */}
      <pattern id="pat-mountains" patternUnits="userSpaceOnUse" width="32" height="24">
        <rect width="32" height="24" fill="#888" />
        <polygon points="0,24 8,6 16,24" fill="#5a5a5a" />
        <polygon points="16,24 24,10 32,24" fill="#6a6a6a" />
        <polygon points="8,6 10,10 12,8 8,6" fill="#e8e8e8" />
        <polygon points="24,10 26,13 28,11 24,10" fill="#e8e8e8" />
      </pattern>

      {/* Désert : dunes */}
      <pattern id="pat-desert" patternUnits="userSpaceOnUse" width="32" height="16">
        <rect width="32" height="16" fill="#e8d48b" />
        <path d="M0,12 Q8,6 16,12 T32,12" stroke="#c4a85e" strokeWidth="1.2" fill="none" />
        <path d="M0,4 Q8,0 16,4 T32,4" stroke="#c4a85e" strokeWidth="0.8" fill="none" opacity="0.6" />
        <circle cx="5" cy="14" r="0.6" fill="#a08648" />
        <circle cx="20" cy="8" r="0.6" fill="#a08648" />
        <circle cx="28" cy="2" r="0.6" fill="#a08648" />
      </pattern>
    </defs>
  )
}

function terrainFill(terrain: string): string {
  switch (terrain) {
    case 'forest':    return 'url(#pat-forest)'
    case 'hills':     return 'url(#pat-hills)'
    case 'fields':    return 'url(#pat-fields)'
    case 'pasture':   return 'url(#pat-pasture)'
    case 'mountains': return 'url(#pat-mountains)'
    case 'desert':    return 'url(#pat-desert)'
    default:          return TERRAIN_COLORS[terrain] ?? '#999'
  }
}

const RESOURCE_LABELS: Record<string, string> = {
  forest: 'BOIS', hills: 'ARGILE', fields: 'BLÉ', pasture: 'MOUTON', mountains: 'PIERRE', desert: 'DÉSERT',
}

const SVG_W = 900
const SVG_H = 800
const OFFSET_X = SVG_W / 2
const OFFSET_Y = SVG_H / 2

export function Board({ state, dispatch, selectedVertex, onSelectVertex }: BoardProps) {
  const { board, phase, currentPlayerIndex, players } = state
  const currentPlayer = players[currentPlayerIndex]
  const pendingSettlement = (state as GameState & { _pendingSettlement?: string })._pendingSettlement

  function handleVertexClick(vid: string) {
    if (phase === 'setup1' || phase === 'setup2') {
      if (!pendingSettlement) {
        if (isSettlementPlacementValid(state, vid, false, currentPlayer.id)) {
          dispatch({ type: 'PLACE_SETTLEMENT', vertexId: vid })
        }
      }
      return
    }
    if (phase === 'actions') {
      if (canAfford(currentPlayer.resources, COSTS.settlement) && isSettlementPlacementValid(state, vid, true, currentPlayer.id)) {
        dispatch({ type: 'BUILD_SETTLEMENT', vertexId: vid })
        return
      }
      const vertex = board.vertices[vid]
      if (vertex?.building?.owner === currentPlayer.id && vertex.building.type === 'settlement'
        && canAfford(currentPlayer.resources, COSTS.city)) {
        dispatch({ type: 'BUILD_CITY', vertexId: vid })
        return
      }
      if (selectedVertex === vid) {
        onSelectVertex(null)
      } else {
        onSelectVertex(vid)
      }
    }
  }

  function handleEdgeClick(eid: string) {
    if (phase === 'setup1' || phase === 'setup2') {
      if (pendingSettlement) {
        dispatch({ type: 'PLACE_ROAD', edgeId: eid })
      }
      return
    }
    if (phase === 'actions' && canAfford(currentPlayer.resources, COSTS.road)) {
      if (isRoadPlacementValid(state, eid, currentPlayer.id)) {
        dispatch({ type: 'BUILD_ROAD', edgeId: eid })
      }
    }
  }

  function handleHexClick(hexId: string) {
    if (phase === 'move_robber') {
      dispatch({ type: 'MOVE_ROBBER', hexId })
    }
  }

  // Calculer les sommets cliquables en surbrillance
  function isVertexHighlighted(vid: string): boolean {
    if (phase === 'setup1' || phase === 'setup2') {
      if (!pendingSettlement) return isSettlementPlacementValid(state, vid, false, currentPlayer.id)
      return false
    }
    if (phase === 'actions') {
      const vertex = board.vertices[vid]
      if (canAfford(currentPlayer.resources, COSTS.settlement) && isSettlementPlacementValid(state, vid, true, currentPlayer.id)) return true
      if (vertex?.building?.owner === currentPlayer.id && vertex.building.type === 'settlement'
        && canAfford(currentPlayer.resources, COSTS.city)) return true
    }
    return false
  }

  function isEdgeHighlighted(eid: string): boolean {
    if (phase === 'setup1' || phase === 'setup2') {
      if (pendingSettlement) return isRoadPlacementValid(state, eid, currentPlayer.id, pendingSettlement)
      return false
    }
    if (phase === 'actions' && canAfford(currentPlayer.resources, COSTS.road)) {
      return isRoadPlacementValid(state, eid, currentPlayer.id)
    }
    return false
  }

  const hexArray = Object.values(board.hexes)
  const vertexArray = Object.values(board.vertices)
  const edgeArray = Object.values(board.edges)

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', maxWidth: SVG_W, maxHeight: SVG_H, background: '#1a6496', display: 'block' }}
    >
      <TerrainPatterns />
      {/* Hexes */}
      {hexArray.map(hex => {
        const { x, y } = hexToPixel(hex.q, hex.r)
        const cx = x + OFFSET_X, cy = y + OFFSET_Y
        const pts = hexPoints(cx, cy)
        const isRobber = board.robberHex === hex.id
        const canMoveRobber = phase === 'move_robber' && hex.id !== board.robberHex

        return (
          <g key={hex.id} onClick={() => handleHexClick(hex.id)} style={{ cursor: canMoveRobber ? 'pointer' : 'default' }}>
            <polygon
              points={pts}
              fill={terrainFill(hex.terrain)}
              stroke={canMoveRobber ? '#fff' : '#333'}
              strokeWidth={canMoveRobber ? 3 : 1}
              opacity={canMoveRobber ? 0.85 : 1}
            />
            <text
              x={cx} y={cy - 18}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#fff"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={2}
              paintOrder="stroke"
              style={{ pointerEvents: 'none', letterSpacing: 1 }}
            >
              {RESOURCE_LABELS[hex.terrain]}
            </text>
            {hex.number && (
              <g style={{ pointerEvents: 'none' }}>
                <circle cx={cx} cy={cy + 8} r={14} fill="rgba(255,255,255,0.9)" />
                <text
                  x={cx} y={cy + 13}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="bold"
                  fill={hex.number === 6 || hex.number === 8 ? '#c0392b' : '#222'}
                >
                  {hex.number}
                </text>
              </g>
            )}
            {isRobber && (
              <circle cx={cx} cy={cy + 8} r={10} fill="#111" style={{ pointerEvents: 'none' }} />
            )}
          </g>
        )
      })}

      {/* Arêtes */}
      {edgeArray.map(edge => {
        const p1 = vertexPosition(edge.vertices[0])
        const p2 = vertexPosition(edge.vertices[1])
        const highlighted = isEdgeHighlighted(edge.id)
        const road = edge.road

        if (!road && !highlighted) return null

        const owner = road ? players.find(p => p.id === road.owner) : null
        return (
          <line
            key={edge.id}
            x1={p1.x + OFFSET_X} y1={p1.y + OFFSET_Y}
            x2={p2.x + OFFSET_X} y2={p2.y + OFFSET_Y}
            stroke={road ? owner?.color ?? '#fff' : 'rgba(255,255,255,0.5)'}
            strokeWidth={road ? 6 : 4}
            strokeLinecap="round"
            style={{ cursor: highlighted ? 'pointer' : 'default' }}
            onClick={() => handleEdgeClick(edge.id)}
          />
        )
      })}

      {/* Zones de clic pour arêtes (invisible, plus large) */}
      {edgeArray.filter(e => isEdgeHighlighted(e.id)).map(edge => {
        const p1 = vertexPosition(edge.vertices[0])
        const p2 = vertexPosition(edge.vertices[1])
        return (
          <line
            key={`click-${edge.id}`}
            x1={p1.x + OFFSET_X} y1={p1.y + OFFSET_Y}
            x2={p2.x + OFFSET_X} y2={p2.y + OFFSET_Y}
            stroke="transparent"
            strokeWidth={16}
            style={{ cursor: 'pointer' }}
            onClick={() => handleEdgeClick(edge.id)}
          />
        )
      })}

      {/* Sommets */}
      {vertexArray.map(vertex => {
        const { x, y } = vertexPosition(vertex.id)
        const cx = x + OFFSET_X, cy = y + OFFSET_Y
        const highlighted = isVertexHighlighted(vertex.id)
        const building = vertex.building
        const owner = building ? players.find(p => p.id === building.owner) : null

        return (
          <g key={vertex.id}>
            {highlighted && (
              <circle
                cx={cx} cy={cy} r={12}
                fill="rgba(255,255,255,0.3)"
                stroke="white"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => handleVertexClick(vertex.id)}
              />
            )}
            {building && (
              <rect
                x={cx - (building.type === 'city' ? 10 : 7)}
                y={cy - (building.type === 'city' ? 10 : 7)}
                width={building.type === 'city' ? 20 : 14}
                height={building.type === 'city' ? 20 : 14}
                fill={owner?.color ?? '#fff'}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onClick={() => handleVertexClick(vertex.id)}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

import type { BoardState, HexId, VertexId, EdgeId } from './types'
import { hexCornerIds, hexEdgeId, hexToPixel } from './hex'
import type { Hex, Vertex, Edge, Terrain } from './types'
import { shuffle } from './rng'

// Les 19 hexes du plateau de Catan standard en coords axiales
const CATAN_HEXES: Array<{ q: number; r: number }> = [
  // rang r=-2
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  // rang r=-1
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  // rang r=0
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // rang r=1
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  // rang r=2
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
]

const TERRAINS: Terrain[] = [
  'forest', 'forest', 'forest', 'forest',
  'fields', 'fields', 'fields', 'fields',
  'pasture', 'pasture', 'pasture', 'pasture',
  'hills', 'hills', 'hills',
  'mountains', 'mountains', 'mountains',
  'desert',
]

// Jetons standard de Catan (placement en spirale) — on les assigne séquentiellement
const TOKENS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11]
// 18 tokens pour 18 hexes (hors désert)

export function buildBoard(rand: () => number): BoardState {
  const shuffledTerrains = shuffle(TERRAINS, rand)
  const shuffledTokens = [...TOKENS]
  let tokenIdx = 0

  const hexes: Record<HexId, Hex> = {}
  let desertId = ''

  CATAN_HEXES.forEach(({ q, r }, i) => {
    const id = `${q},${r}`
    const terrain = shuffledTerrains[i]
    const hex: Hex = { id, q, r, terrain }
    if (terrain !== 'desert') {
      hex.number = shuffledTokens[tokenIdx++]
    } else {
      desertId = id
    }
    hexes[id] = hex
  })

  // Construire sommets et arêtes
  const vertices: Record<VertexId, Vertex> = {}
  const edges: Record<EdgeId, Edge> = {}

  for (const { q, r } of CATAN_HEXES) {
    const hexId = `${q},${r}`
    const cornerIds = hexCornerIds(q, r)

    // Sommets
    for (const vid of cornerIds) {
      if (!vertices[vid]) {
        vertices[vid] = { id: vid, hexes: [] }
      }
      if (!vertices[vid].hexes.includes(hexId)) {
        vertices[vid].hexes.push(hexId)
      }
    }

    // Arêtes
    for (let i = 0; i < 6; i++) {
      const eid = hexEdgeId(q, r, i)
      if (!edges[eid]) {
        const v1 = cornerIds[i]
        const v2 = cornerIds[(i + 1) % 6]
        edges[eid] = { id: eid, vertices: [v1, v2] }
      }
    }
  }

  // Filtrer : garder uniquement les sommets et arêtes dont tous les hexes sont dans le plateau
  const validHexIds = new Set(Object.keys(hexes))

  const filteredVertices: Record<VertexId, Vertex> = {}
  for (const [vid, v] of Object.entries(vertices)) {
    // Un sommet est valide s'il appartient à au moins un hex du plateau
    if (v.hexes.some(h => validHexIds.has(h))) {
      filteredVertices[vid] = v
    }
  }

  const filteredEdges: Record<EdgeId, Edge> = {}
  for (const [eid, e] of Object.entries(edges)) {
    if (filteredVertices[e.vertices[0]] && filteredVertices[e.vertices[1]]) {
      filteredEdges[eid] = e
    }
  }

  return {
    hexes,
    vertices: filteredVertices,
    edges: filteredEdges,
    robberHex: desertId,
  }
}

// Précalcul des positions pixel pour le rendu
export function hexCenter(q: number, r: number): { x: number; y: number } {
  return hexToPixel(q, r)
}

export function vertexPosition(vid: VertexId): { x: number; y: number } {
  // vid = "q1,r1|q2,r2|q3,r3" (trié). Le sommet est le centroïde des 3 centres d'hex.
  const points = vid.split('|').map(hid => {
    const [q, r] = hid.split(',').map(Number)
    return hexToPixel(q, r)
  })
  const x = points.reduce((s, p) => s + p.x, 0) / points.length
  const y = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x, y }
}

// Calcule les ids des arêtes adjacentes à un sommet
export function edgesOfVertex(vid: VertexId, edges: Record<EdgeId, Edge>): EdgeId[] {
  return Object.keys(edges).filter(eid => edges[eid].vertices.includes(vid))
}

// Calcule les ids des sommets adjacents à un sommet (via arêtes)
export function adjacentVertices(vid: VertexId, edges: Record<EdgeId, Edge>): VertexId[] {
  const result: VertexId[] = []
  for (const e of Object.values(edges)) {
    if (e.vertices[0] === vid) result.push(e.vertices[1])
    else if (e.vertices[1] === vid) result.push(e.vertices[0])
  }
  return result
}

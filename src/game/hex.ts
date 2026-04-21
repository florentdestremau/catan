// Coordonnées axiales (q, r) → pixel (flat-top hexagons)
export const HEX_SIZE = 60  // rayon du centre au sommet

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r)
  return { x, y }
}

export function hexCorner(cx: number, cy: number, i: number): { x: number; y: number } {
  const angleDeg = 60 * i  // flat-top: corner 0 à droite
  const angleRad = (Math.PI / 180) * angleDeg
  return {
    x: cx + HEX_SIZE * Math.cos(angleRad),
    y: cy + HEX_SIZE * Math.sin(angleRad),
  }
}

export function hexPoints(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = hexCorner(cx, cy, i)
    return `${x},${y}`
  }).join(' ')
}

// Les 6 voisins d'un hex en coords axiales
export const HEX_DIRECTIONS = [
  { dq: 1, dr: 0 },
  { dq: 1, dr: -1 },
  { dq: 0, dr: -1 },
  { dq: -1, dr: 0 },
  { dq: -1, dr: 1 },
  { dq: 0, dr: 1 },
]

export function hexNeighborId(q: number, r: number, dir: number): string {
  const d = HEX_DIRECTIONS[dir]
  return `${q + d.dq},${r + d.dr}`
}

// 6 coins d'un hex (indices partagés avec les voisins)
// corner 0 = entre dir 0 et dir 5, corner i = entre dir i et dir (i-1+6)%6
export function hexCornerIds(q: number, r: number): string[] {
  // On nomme chaque sommet par les 3 hexes qui le partagent.
  // Formule standard : pour le flat-top, le coin i appartient à (q,r), neighbor(dir i), neighbor(dir (i+5)%6)
  return Array.from({ length: 6 }, (_, i) => {
    const d1 = HEX_DIRECTIONS[i]
    const d2 = HEX_DIRECTIONS[(i + 5) % 6]
    const q1 = q + d1.dq, r1 = r + d1.dr
    const q2 = q + d2.dq, r2 = r + d2.dr
    // Trier les 3 hex pour un id canonique
    const trio = [[q, r], [q1, r1], [q2, r2]].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    return trio.map(c => `${c[0]},${c[1]}`).join('|')
  })
}

// Arête i du hex q,r : entre coin i et coin (i+1)%6
export function hexEdgeId(q: number, r: number, i: number): string {
  const corners = hexCornerIds(q, r)
  const a = corners[i]
  const b = corners[(i + 1) % 6]
  return [a, b].sort().join('~')
}

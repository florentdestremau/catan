export type Resource = "wood" | "brick" | "wheat" | "sheep" | "ore";
export type Terrain =
  | "forest"
  | "hills"
  | "fields"
  | "pasture"
  | "mountains"
  | "desert";
export type BuildingType = "settlement" | "city";
export type Phase =
  | "setup1" // placement ordre normal
  | "setup2" // placement ordre inverse
  | "roll" // lancer les dés
  | "discard" // défausse (7)
  | "move_robber"
  | "steal"
  | "actions" // tour libre
  | "ended";

export type DevCardKind =
  | "knight"
  | "vp"
  | "road_building"
  | "year_of_plenty"
  | "monopoly";

export type HexId = string;
export type VertexId = string;
export type EdgeId = string;
export type PlayerId = string;

export interface Hex {
  id: HexId;
  q: number;
  r: number;
  terrain: Terrain;
  number?: number; // pas de jeton sur le désert
}

export interface Building {
  owner: PlayerId;
  type: BuildingType;
}

export interface Road {
  owner: PlayerId;
}

export interface Vertex {
  id: VertexId;
  hexes: HexId[];
  building?: Building;
}

export interface Edge {
  id: EdgeId;
  vertices: [VertexId, VertexId];
  road?: Road;
}

export type ResourceMap = Record<Resource, number>;

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  resources: ResourceMap;
  pieces: {
    roads: number;
    settlements: number;
    cities: number;
  };
  vp: number;
  devCards: DevCardKind[]; // cartes jouables (achetées les tours précédents)
  newDevCards: DevCardKind[]; // achetées ce tour (injouables)
  knightsPlayed: number;
  hasPlayedDevCard: boolean; // une carte dev max par tour
}

export interface BoardState {
  hexes: Record<HexId, Hex>;
  vertices: Record<VertexId, Vertex>;
  edges: Record<EdgeId, Edge>;
  robberHex: HexId;
}

export type ResourceDelta = Partial<Record<Resource, number>>;

export interface GameState {
  board: BoardState;
  players: Player[];
  currentPlayerIndex: number;
  phase: Phase;
  dice?: [number, number];
  pendingDiscards: PlayerId[]; // joueurs qui doivent encore défausser
  stealFrom?: PlayerId[]; // cibles possibles pour le vol
  winner?: PlayerId;
  log: string[];
  setupIndex: number; // avancement du setup
  devDeck: DevCardKind[]; // pioche des cartes dev
  largestArmy?: PlayerId; // détenteur de la plus grande armée (3+ chevaliers)
  pendingFreeRoads?: number; // routes gratuites à placer (carte construction)
  pendingDevChoice?: "year_of_plenty" | "monopoly"; // attente choix joueur
  // Pour animations : deltas de ressources de la dernière action, par joueur
  lastDeltas?: {
    id: number; // identifiant unique pour redéclencher l'anim
    byPlayer: Record<PlayerId, ResourceDelta>;
  };
}

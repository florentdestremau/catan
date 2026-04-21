import type { GameState, Phase, Resource } from './types'
import type { GameAction } from './actions'
import {
  isSettlementPlacementValid,
  isRoadPlacementValid,
  canAfford,
  deductCost,
  COSTS,
  produceResources,
  playersToDiscard,
  stealTargets,
  computeVP,
  totalCards,
} from './rules'
import { grantSetup2Resources } from './setup'

export function reducer(state: GameState, action: GameAction): GameState {
  const { board, players, currentPlayerIndex } = state
  const currentPlayer = players[currentPlayerIndex]
  const n = players.length

  switch (action.type) {
    case 'PLACE_SETTLEMENT': {
      if (state.phase !== 'setup1' && state.phase !== 'setup2') return state
      const { vertexId } = action
      if (!isSettlementPlacementValid(state, vertexId, false, currentPlayer.id)) return state

      const newBoard = {
        ...board,
        vertices: {
          ...board.vertices,
          [vertexId]: {
            ...board.vertices[vertexId],
            building: { owner: currentPlayer.id, type: 'settlement' as const },
          },
        },
      }
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, pieces: { ...p.pieces, settlements: p.pieces.settlements - 1 } }
          : p
      )
      let newState: GameState = {
        ...state,
        board: newBoard,
        players: newPlayers,
        log: [...state.log, `${currentPlayer.name} pose une colonie`],
        // on marque le sommet en attente de route
        phase: state.phase,
      }

      // Setup2 : donner les ressources des hexes adjacents
      if (state.phase === 'setup2') {
        newState = grantSetup2Resources(newState, vertexId)
      }

      // Enregistrer le sommet courant pour la route suivante
      return { ...newState, _pendingSettlement: vertexId } as GameState & { _pendingSettlement: string }
    }

    case 'PLACE_ROAD': {
      if (state.phase !== 'setup1' && state.phase !== 'setup2') return state
      const { edgeId } = action
      const pendingVertex = (state as GameState & { _pendingSettlement?: string })._pendingSettlement
      if (!isRoadPlacementValid(state, edgeId, currentPlayer.id, pendingVertex)) return state

      const newBoard = {
        ...board,
        edges: {
          ...board.edges,
          [edgeId]: { ...board.edges[edgeId], road: { owner: currentPlayer.id } },
        },
      }
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, pieces: { ...p.pieces, roads: p.pieces.roads - 1 } }
          : p
      )

      // Avancer le setup
      const setupIndex = state.setupIndex + 1
      let phase: Phase = state.phase
      let nextPlayerIndex = currentPlayerIndex
      let log = [...state.log, `${currentPlayer.name} pose une route`]

      if (state.phase === 'setup1') {
        if (setupIndex < n) {
          nextPlayerIndex = setupIndex
        } else {
          // Fin setup1, début setup2 en sens inverse
          phase = 'setup2'
          nextPlayerIndex = n - 1
          log = [...log, 'Phase 2 du setup : sens inverse']
        }
      } else {
        // setup2
        const setup2Idx = setupIndex - n  // nombre de tours setup2 terminés
        if (setup2Idx < n) {
          nextPlayerIndex = n - 1 - setup2Idx
        } else {
          // Fin du setup
          phase = 'roll'
          nextPlayerIndex = 0
          log = [...log, 'Setup terminé ! À ' + newPlayers[0].name + ' de lancer les dés.']
        }
      }

      const s: GameState = {
        ...state,
        board: newBoard,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        phase,
        setupIndex,
        log,
      }
      delete (s as GameState & { _pendingSettlement?: string })._pendingSettlement
      return s
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'roll') return state
      const { dice } = action
      const roll = dice[0] + dice[1]

      if (roll === 7) {
        const toDiscard = playersToDiscard(state)
        return {
          ...state,
          dice,
          phase: toDiscard.length > 0 ? 'discard' : 'move_robber',
          pendingDiscards: toDiscard,
          log: [...state.log, `${currentPlayer.name} lance ${dice[0]}+${dice[1]}=7 ! Le voleur !`],
        }
      }

      const stateWithProduction = produceResources(state, roll)
      const byPlayer: Record<string, Partial<Record<Resource, number>>> = {}
      for (const before of state.players) {
        const after = stateWithProduction.players.find(p => p.id === before.id)!
        const delta: Partial<Record<Resource, number>> = {}
        let any = false
        for (const res of ['wood', 'brick', 'wheat', 'sheep', 'ore'] as Resource[]) {
          const d = after.resources[res] - before.resources[res]
          if (d !== 0) { delta[res] = d; any = true }
        }
        if (any) byPlayer[before.id] = delta
      }
      return {
        ...stateWithProduction,
        dice,
        phase: 'actions',
        lastDeltas: Object.keys(byPlayer).length > 0 ? { id: Date.now(), byPlayer } : undefined,
        log: [...stateWithProduction.log, `${currentPlayer.name} lance ${dice[0]}+${dice[1]}=${roll}`],
      }
    }

    case 'DISCARD': {
      if (state.phase !== 'discard') return state
      const { playerId, resources } = action
      const playerIdx = players.findIndex(p => p.id === playerId)
      if (playerIdx === -1) return state

      const player = players[playerIdx]
      const total = totalCards(player.resources)
      const discardAmount = Object.values(resources).reduce((a, b) => a + b, 0)
      if (discardAmount !== Math.floor(total / 2)) return state

      const newResources = { ...player.resources }
      for (const [res, n] of Object.entries(resources) as Array<[Resource, number]>) {
        newResources[res] -= n
        if (newResources[res] < 0) return state
      }

      const newPlayers = players.map((p, i) =>
        i === playerIdx ? { ...p, resources: newResources } : p
      )
      const pendingDiscards = state.pendingDiscards.filter(id => id !== playerId)
      const phase = pendingDiscards.length === 0 ? 'move_robber' : 'discard'

      return {
        ...state,
        players: newPlayers,
        pendingDiscards,
        phase,
        log: [...state.log, `${player.name} défausse ${discardAmount} cartes`],
      }
    }

    case 'MOVE_ROBBER': {
      if (state.phase !== 'move_robber') return state
      const { hexId } = action
      if (hexId === board.robberHex) return state  // doit bouger

      const targets = stealTargets(state, hexId, currentPlayer.id)
      const newBoard = { ...board, robberHex: hexId }

      return {
        ...state,
        board: newBoard,
        phase: targets.length > 0 ? 'steal' : 'actions',
        stealFrom: targets,
        log: [...state.log, `${currentPlayer.name} déplace le voleur`],
      }
    }

    case 'STEAL': {
      if (state.phase !== 'steal') return state
      const { targetId } = action
      if (!targetId) return { ...state, phase: 'actions', stealFrom: undefined }

      const targetIdx = players.findIndex(p => p.id === targetId)
      if (targetIdx === -1) return state

      const target = players[targetIdx]
      const available = (Object.entries(target.resources) as Array<[Resource, number]>)
        .filter(([, n]) => n > 0)
        .flatMap(([r, n]) => Array(n).fill(r) as Resource[])
      if (available.length === 0) return { ...state, phase: 'actions', stealFrom: undefined }

      // Choisir une ressource aléatoire (côté client on passe targetId, le reducer choisit au hasard)
      const stolen = available[Math.floor(Math.random() * available.length)]
      const newPlayers = players.map((p, i) => {
        if (i === targetIdx) return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] - 1 } }
        if (i === currentPlayerIndex) return { ...p, resources: { ...p.resources, [stolen]: p.resources[stolen] + 1 } }
        return p
      })

      return {
        ...state,
        players: newPlayers,
        phase: 'actions',
        stealFrom: undefined,
        lastDeltas: {
          id: Date.now(),
          byPlayer: {
            [currentPlayer.id]: { [stolen]: 1 },
            [target.id]: { [stolen]: -1 },
          },
        },
        log: [...state.log, `${currentPlayer.name} vole une ressource à ${target.name}`],
      }
    }

    case 'BUILD_ROAD': {
      if (state.phase !== 'actions') return state
      if (!isRoadPlacementValid(state, action.edgeId, currentPlayer.id)) return state
      if (currentPlayer.pieces.roads <= 0) return state

      const free = (state.pendingFreeRoads ?? 0) > 0
      if (!free && !canAfford(currentPlayer.resources, COSTS.road)) return state

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? {
              ...p,
              resources: free ? p.resources : deductCost(p.resources, COSTS.road),
              pieces: { ...p.pieces, roads: p.pieces.roads - 1 },
            }
          : p
      )
      const newBoard = {
        ...board,
        edges: {
          ...board.edges,
          [action.edgeId]: { ...board.edges[action.edgeId], road: { owner: currentPlayer.id } },
        },
      }
      const pendingFreeRoads = free ? (state.pendingFreeRoads ?? 1) - 1 : state.pendingFreeRoads
      return {
        ...state,
        board: newBoard,
        players: newPlayers,
        pendingFreeRoads: pendingFreeRoads && pendingFreeRoads > 0 ? pendingFreeRoads : undefined,
        log: [...state.log, `${currentPlayer.name} construit une route${free ? ' (gratuite)' : ''}`],
      }
    }

    case 'BUILD_SETTLEMENT': {
      if (state.phase !== 'actions') return state
      if (!canAfford(currentPlayer.resources, COSTS.settlement)) return state
      if (!isSettlementPlacementValid(state, action.vertexId, true, currentPlayer.id)) return state
      if (currentPlayer.pieces.settlements <= 0) return state

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, resources: deductCost(p.resources, COSTS.settlement), pieces: { ...p.pieces, settlements: p.pieces.settlements - 1 } }
          : p
      )
      const newBoard = {
        ...board,
        vertices: {
          ...board.vertices,
          [action.vertexId]: { ...board.vertices[action.vertexId], building: { owner: currentPlayer.id, type: 'settlement' as const } },
        },
      }
      return computeVP({ ...state, board: newBoard, players: newPlayers, log: [...state.log, `${currentPlayer.name} construit une colonie`] })
    }

    case 'BUILD_CITY': {
      if (state.phase !== 'actions') return state
      if (!canAfford(currentPlayer.resources, COSTS.city)) return state
      if (currentPlayer.pieces.cities <= 0) return state

      const vertex = board.vertices[action.vertexId]
      if (!vertex?.building || vertex.building.owner !== currentPlayer.id || vertex.building.type !== 'settlement') return state

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? {
              ...p,
              resources: deductCost(p.resources, COSTS.city),
              pieces: { ...p.pieces, cities: p.pieces.cities - 1, settlements: p.pieces.settlements + 1 },
            }
          : p
      )
      const newBoard = {
        ...board,
        vertices: {
          ...board.vertices,
          [action.vertexId]: { ...board.vertices[action.vertexId], building: { owner: currentPlayer.id, type: 'city' as const } },
        },
      }
      return computeVP({ ...state, board: newBoard, players: newPlayers, log: [...state.log, `${currentPlayer.name} construit une ville`] })
    }

    case 'BANK_TRADE': {
      if (state.phase !== 'actions') return state
      const { give, receive } = action
      if (currentPlayer.resources[give] < 4) return state

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, resources: { ...p.resources, [give]: p.resources[give] - 4, [receive]: p.resources[receive] + 1 } }
          : p
      )
      return {
        ...state,
        players: newPlayers,
        log: [...state.log, `${currentPlayer.name} échange 4 ${give} → 1 ${receive}`],
      }
    }

    case 'BUY_DEV_CARD': {
      if (state.phase !== 'actions') return state
      if (state.devDeck.length === 0) return state
      if (!canAfford(currentPlayer.resources, COSTS.devCard)) return state

      const [drawn, ...restDeck] = state.devDeck
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? {
              ...p,
              resources: deductCost(p.resources, COSTS.devCard),
              newDevCards: [...p.newDevCards, drawn],
            }
          : p
      )
      return computeVP({
        ...state,
        players: newPlayers,
        devDeck: restDeck,
        log: [...state.log, `${currentPlayer.name} achète une carte développement`],
      })
    }

    case 'PLAY_KNIGHT': {
      if (state.phase !== 'actions') return state
      if (currentPlayer.hasPlayedDevCard) return state
      const idx = currentPlayer.devCards.indexOf('knight')
      if (idx === -1) return state

      const newDev = [...currentPlayer.devCards]
      newDev.splice(idx, 1)
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, devCards: newDev, knightsPlayed: p.knightsPlayed + 1, hasPlayedDevCard: true }
          : p
      )
      const afterVP = computeVP({ ...state, players: newPlayers })
      if (afterVP.phase === 'ended') return afterVP
      return {
        ...afterVP,
        phase: 'move_robber',
        log: [...afterVP.log, `${currentPlayer.name} joue un Chevalier`],
      }
    }

    case 'PLAY_ROAD_BUILDING': {
      if (state.phase !== 'actions') return state
      if (currentPlayer.hasPlayedDevCard) return state
      const idx = currentPlayer.devCards.indexOf('road_building')
      if (idx === -1) return state

      const newDev = [...currentPlayer.devCards]
      newDev.splice(idx, 1)
      const roadsLeft = currentPlayer.pieces.roads
      const freeCount = Math.min(2, roadsLeft)
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, devCards: newDev, hasPlayedDevCard: true }
          : p
      )
      return {
        ...state,
        players: newPlayers,
        pendingFreeRoads: freeCount > 0 ? freeCount : undefined,
        log: [...state.log, `${currentPlayer.name} joue Construction de routes (${freeCount} route${freeCount > 1 ? 's' : ''} gratuite${freeCount > 1 ? 's' : ''})`],
      }
    }

    case 'PLAY_YEAR_OF_PLENTY': {
      if (state.phase !== 'actions') return state
      if (currentPlayer.hasPlayedDevCard) return state
      const idx = currentPlayer.devCards.indexOf('year_of_plenty')
      if (idx === -1) return state
      const [r1, r2] = action.resources

      const newDev = [...currentPlayer.devCards]
      newDev.splice(idx, 1)
      const newResources = { ...currentPlayer.resources }
      newResources[r1]++
      newResources[r2]++
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, devCards: newDev, resources: newResources, hasPlayedDevCard: true }
          : p
      )
      const delta: Partial<Record<Resource, number>> = {}
      delta[r1] = (delta[r1] ?? 0) + 1
      delta[r2] = (delta[r2] ?? 0) + 1
      return {
        ...state,
        players: newPlayers,
        lastDeltas: { id: Date.now(), byPlayer: { [currentPlayer.id]: delta } },
        log: [...state.log, `${currentPlayer.name} joue Année d'abondance (+1 ${r1}, +1 ${r2})`],
      }
    }

    case 'PLAY_MONOPOLY': {
      if (state.phase !== 'actions') return state
      if (currentPlayer.hasPlayedDevCard) return state
      const idx = currentPlayer.devCards.indexOf('monopoly')
      if (idx === -1) return state
      const { resource } = action

      const newDev = [...currentPlayer.devCards]
      newDev.splice(idx, 1)

      let stolen = 0
      const byPlayer: Record<string, Partial<Record<Resource, number>>> = {}
      const newPlayers = players.map((p, i) => {
        if (i === currentPlayerIndex) return p // maj finale ci-dessous
        const n = p.resources[resource]
        if (n > 0) {
          stolen += n
          byPlayer[p.id] = { [resource]: -n }
          return { ...p, resources: { ...p.resources, [resource]: 0 } }
        }
        return p
      })
      const thiefIdx = newPlayers.findIndex((_, i) => i === currentPlayerIndex)
      newPlayers[thiefIdx] = {
        ...newPlayers[thiefIdx],
        devCards: newDev,
        hasPlayedDevCard: true,
        resources: { ...newPlayers[thiefIdx].resources, [resource]: newPlayers[thiefIdx].resources[resource] + stolen },
      }
      if (stolen > 0) byPlayer[currentPlayer.id] = { [resource]: stolen }

      return {
        ...state,
        players: newPlayers,
        lastDeltas: stolen > 0 ? { id: Date.now(), byPlayer } : state.lastDeltas,
        log: [...state.log, `${currentPlayer.name} joue Monopole sur ${resource} (+${stolen})`],
      }
    }

    case 'END_TURN': {
      if (state.phase !== 'actions') return state
      const nextIndex = (currentPlayerIndex + 1) % n
      // On fait passer les cartes "newDevCards" → "devCards" pour tout le monde
      // et on réinitialise hasPlayedDevCard.
      const newPlayers = players.map(p => ({
        ...p,
        devCards: [...p.devCards, ...p.newDevCards],
        newDevCards: [],
        hasPlayedDevCard: false,
      }))
      return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: nextIndex,
        phase: 'roll',
        dice: undefined,
        pendingFreeRoads: undefined,
        log: [...state.log, `C'est au tour de ${players[nextIndex].name}`],
      }
    }

    default:
      return state
  }
}

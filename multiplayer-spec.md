# Spec — Catan multijoueur en ligne

## Objectif

Version **online** où chaque appareil incarne **un** joueur. Cohabite avec la version hotseat :

- `catan.once.florent.cc` (branche `master`) — hotseat local inchangé.
- `catan-online.once.florent.cc` (branche `multiplayer`) — multi en ligne.

## Architecture

Conteneur unique (port 80) qui sert **à la fois** le client statique et l'API/WS. On remplace Caddy (statique seul) par **Bun** qui sert `dist/` + implémente `/up` + `/api/rooms*` + `/ws/:id`.

```
Bun.serve (port 80)
├── GET  /up                → "OK"
├── POST /api/rooms         → crée une room, renvoie {roomId, token, playerId}
├── POST /api/rooms/:id/join → rejoint un slot, renvoie {token, playerId}
├── POST /api/rooms/:id/start → host démarre la partie
├── WS   /ws/:roomId?token= → upgrade, sync state
└── *                       → static dist/ + SPA fallback
```

### Modèle en mémoire + SQLite

Runtime : `Map<roomId, Room>` avec broadcasting via `Set<WebSocket>`.
Persistance : `bun:sqlite` sur `/storage/catan.db`.

```ts
type Room = {
  id: string;
  host: PlayerId;
  slots: { playerId: PlayerId; token: string; name: string; color: string }[];
  state: GameState | null;   // null = lobby, non-null = partie lancée
}
```

SQLite : une table `rooms(id TEXT PK, json TEXT, updated_at INT)`. Pas d'ORM, juste `JSON.stringify(room)`.

### Messages WS

- C→S : `{type:'ACTION', action: GameAction}` — le serveur vérifie que le token correspond au `currentPlayerIndex`, ignore les dés envoyés et retire au besoin lui-même (`ROLL_DICE`).
- S→C : `{type:'ROOM', room: Room, myPlayerId}` après chaque mutation. Un seul type suffit : le client re-render selon `room.state === null` (lobby) ou non (playing).

## Fichiers

- **Nouveau `server/`** — `index.ts` (Bun.serve + WS), `rooms.ts` (CRUD + reducer), `db.ts` (bun:sqlite).
- **Nouveau `src/net/useRoom.ts`** — hook WS, reconnect, expose `{room, myPlayerId, sendAction}`.
- **Nouveau `src/components/Home.tsx`** — page "Créer / Rejoindre" + tuto.
- **Nouveau `src/components/Lobby.tsx`** — slots + bouton start (host).
- **`src/App.tsx`** — machine à états `home | lobby | playing`. Contexte `MyPlayerContext` pour transmettre `myPlayerId`.
- **`src/components/Controls.tsx` + `Board.tsx`** — gate `myPlayerId !== currentPlayer.id` → actions inertes.
- **`Dockerfile`** — remplace stage Caddy par Bun. Build Vite en stage 1, runtime `oven/bun` en stage 2, `CMD bun run server/index.ts`.
- **Suppression `Caddyfile`** (l'app Bun reprend ses rôles).
- **`.github/workflows/ci.yml`** — déjà `type=ref,event=branch` donc `:multiplayer` OK. Ajouter `multiplayer` dans `branches`.

## Phasage

1. **MVP** (cette PR) : lobby + sync WS + gate `myPlayerId`. Les dés sont tirés côté serveur. Les cartes dév restent visibles (fog of war plus tard).
2. Fog of war (plus tard) : sanitizer per-client des `devCards`/`newDevCards` des autres.
3. Reconnexion robuste, notifications, chat.

## Déploiement

- Branche `multiplayer` pushée → CI build+push `ghcr.io/florentdestremau/catan:multiplayer`.
- Premier déploiement : `once deploy ghcr.io/florentdestremau/catan:multiplayer --host catan-online.once.florent.cc` (SSH `ubuntu@ssl.once.florent.cc`).
- Mises à jour : `once update catan-online.once.florent.cc --image ghcr.io/florentdestremau/catan:multiplayer`.

## Vérification (chrome-devtools MCP)

1. Ouvrir `https://catan-online.once.florent.cc` → page Home avec tuto.
2. Cliquer "Créer" → lobby avec 1 slot (moi).
3. Copier code, ouvrir second onglet incognito → rejoindre → 2 slots.
4. Host démarre → les 2 clients passent en mode `playing` avec le même plateau.
5. Vérifier que seul le joueur courant peut cliquer les sommets / lancer les dés.
6. `curl /up` depuis le conteneur → 200.

## Risques

- **Downtime** au redéploiement : les WS coupent, le client doit reconnecter via token localStorage (prévu dans le hook).
- **Migrations `GameState`** : ajouter `version` dans le JSON ; rejeter les rooms d'une version antérieure.
- **Cartes dév visibles** en phase 1 → OK entre amis, à surveiller avant ouverture publique.
- **Bun + TypeScript** en runtime : pas de tsc step pour le serveur, Bun exécute `.ts` directement. Les tests restent en vitest (client-only) pour l'instant.

## Non-objectifs

- Auth / compte utilisateur.
- Matchmaking public, classement.
- Bot / timeout de tour.
- Spectateur.

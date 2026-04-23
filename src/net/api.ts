export interface Credentials {
  roomId: string
  token: string
  playerId: string
}

export function storageKey(roomId: string): string {
  return `catan:mp:${roomId}`
}

export function loadCreds(roomId: string): Credentials | null {
  try {
    const raw = localStorage.getItem(storageKey(roomId))
    if (!raw) return null
    return JSON.parse(raw) as Credentials
  } catch { return null }
}

export function saveCreds(c: Credentials) {
  localStorage.setItem(storageKey(c.roomId), JSON.stringify(c))
}

export function clearCreds(roomId: string) {
  localStorage.removeItem(storageKey(roomId))
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${r.status}`)
  return data as T
}

export function createRoomApi(name: string) {
  return post<Credentials>('/api/rooms', { name })
}

export function joinRoomApi(roomId: string, name: string, token?: string) {
  return post<Credentials>(`/api/rooms/${roomId}/join`, { name, token })
}

export function startRoomApi(roomId: string, token: string) {
  return post<{ ok: true }>(`/api/rooms/${roomId}/start`, { token })
}

export function renameSlotApi(roomId: string, token: string, name: string) {
  return post<{ ok: true }>(`/api/rooms/${roomId}/rename`, { token, name })
}

import { useEffect, useRef } from 'react'

export function useMyTurnNotification(isMyTurn: boolean, currentPlayerName: string) {
  const prev = useRef(false)
  useEffect(() => {
    const was = prev.current
    prev.current = isMyTurn
    if (!isMyTurn || was) return
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const n = new Notification('🎲 À toi de jouer', {
      body: `Catan — ${currentPlayerName}, c'est ton tour.`,
      icon: '/favicon.svg',
      tag: 'catan-turn',
    })
    n.onclick = () => { window.focus(); n.close() }
  }, [isMyTurn, currentPlayerName])
}

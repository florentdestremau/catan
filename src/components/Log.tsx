import { useEffect, useRef } from 'react'

interface LogProps {
  entries: string[]
}

export function Log({ entries }: LogProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [entries])

  return (
    <div ref={ref} style={{
      height: 130,
      overflowY: 'auto',
      background: '#1a1a1a',
      borderRadius: 6,
      padding: 8,
      fontSize: 16,
      color: '#ccc',
    }}>
      {entries.map((e, i) => (
        <div key={i} style={{ borderBottom: '1px solid #2a2a2a', padding: '2px 0' }}>{e}</div>
      ))}
    </div>
  )
}

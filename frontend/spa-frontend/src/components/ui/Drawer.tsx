import type { ReactNode } from 'react'
import { Overlay } from '../overlay/Overlay'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Right-hand slide-over panel (editors with several sections) — thin Overlay wrapper. */
export function Drawer({ title, onClose, children }: Props) {
  return (
    <Overlay variant="drawer" size="md" title={title} onClose={onClose}>
      {children}
    </Overlay>
  )
}

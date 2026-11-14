import type {ReactNode} from 'react'
import {Overlay} from '../../ui/overlay/Overlay.tsx'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode,
  /** Optional footer content (e.g. buttons) */
  footer?: ReactNode
  /** Panel width; default `md` (`lg` for wide editors). */
  size?: 'md' | 'lg'
}

/** Right-hand slide-over panel (editors with several sections) — thin Overlay wrapper. */
export function Drawer({ title, onClose, children, footer, size = 'md' }: Props) {
  return (
    <Overlay variant="drawer" size={size} title={title} onClose={onClose} footer={footer}>
      {children}
    </Overlay>
  )
}

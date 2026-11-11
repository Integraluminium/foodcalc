import type { ReactNode } from 'react'
import { Overlay } from '../../layout/overlay/Overlay.tsx'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Centered modal dialog (forms, confirmations) — thin Overlay wrapper. */
export function Dialog({ title, onClose, children, footer }: Props) {
  return (
    <Overlay variant="modal" size="sm" title={title} onClose={onClose} footer={footer}>
      {children}
    </Overlay>
  )
}

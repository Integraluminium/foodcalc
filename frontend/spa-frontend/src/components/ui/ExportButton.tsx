import type { ReactNode } from 'react'
import { useState } from 'react'
import { downloadFile } from '../../lib/download'
import { Spinner } from './Spinner'

/**
 * Export-Button mit Lade-Feedback: Während der Request läuft, ist der
 * Button deaktiviert und zeigt einen Spinner — der Nutzer sieht sofort,
 * dass der Export angestoßen wurde, auch wenn der Download ein paar
 * Sekunden braucht (PDF-Generierung im Server).
 */
export function ExportButton({
  path,
  filename,
  children,
  className = 'btn btn--ghost',
  title,
  disabled = false,
}: {
  path: string
  filename: string
  children: ReactNode
  className?: string
  title?: string
  disabled?: boolean
}) {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="button"
      className={className}
      title={title}
      disabled={pending || disabled}
      onClick={() => {
        setPending(true)
        void downloadFile(path, filename).finally(() => setPending(false))
      }}
    >
      {pending ? <Spinner size="sm" /> : children}
    </button>
  )
}

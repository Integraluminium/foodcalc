import { ApiError, api } from '../api'
import { notify } from '../molecules/ui/toast'

/**
 * Datei-Download mit Session-Cookie und Nutzer-Feedback: Erfolg und
 * Fehler (z. B. 422, wenn der Server ohne `--features typst` läuft)
 * werden als Toast gemeldet statt still zu verschwinden.
 */
export async function downloadFile(
  path: string,
  fallbackName: string,
): Promise<void> {
  try {
    await api.download(path, fallbackName)
    notify('success', 'Export wurde geladen.')
  } catch (err) {
    notify(
      'error',
      err instanceof ApiError
        ? `Export fehlgeschlagen: ${err.message}`
        : 'Export fehlgeschlagen.',
    )
  }
}

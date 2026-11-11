/**
 * Kleiner Toast-Store (ohne Framework-Abhängigkeit): `notify()` legt eine
 * Meldung an, `<Toasts />` rendert den Stapel unten rechts. Bewusst in
 * einer eigenen Datei (kein Komponenten-Export gemischt mit Logik).
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let toasts: ToastItem[] = []
let nextId = 1
const listeners = new Set<(items: ToastItem[]) => void>()

function emit(): void {
  for (const listener of listeners) listener(toasts)
}

export function notify(
  kind: ToastKind,
  message: string,
  timeoutMs = 8000,
): void {
  const item: ToastItem = { id: nextId++, kind, message }
  toasts = [...toasts, item]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== item.id)
    emit()
  }, timeoutMs)
}

export function subscribeToasts(
  listener: (items: ToastItem[]) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

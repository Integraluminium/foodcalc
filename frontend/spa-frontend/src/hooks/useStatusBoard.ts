import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useEffect, useState} from 'react'
import {eventsApi, queryKeys, type ReorderStatus, type ReorderUrgency, type ServingAvailability,} from '../api'

export function useStatusBoard(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.statusBoard(eventId),
    queryFn: () => eventsApi.statusBoard(eventId),
    enabled: Number.isFinite(eventId) && eventId > 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 3000,
  })
}

export function useStatusBoardMutations(eventId: number) {
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: queryKeys.events.statusBoard(eventId) })

  const createReorder = useMutation({
    mutationFn: (input: {
      meal_id: number
      amount_label: string
      urgency: ReorderUrgency
      note?: string
    }) => eventsApi.createReorder(eventId, input),
    onSuccess: invalidate,
  })

  const advanceReorder = useMutation({
    mutationFn: (input: { reorderId: number; status: ReorderStatus }) =>
      eventsApi.advanceReorder(eventId, input.reorderId, input.status),
    onSuccess: invalidate,
  })

  const setMealAvailability = useMutation({
    mutationFn: (input: {
      mealId: number
      availability: ServingAvailability
      eta_minutes?: number | null
    }) =>
      eventsApi.setMealAvailability(
        eventId,
        input.mealId,
        input.availability,
        input.eta_minutes,
      ),
    onSuccess: invalidate,
  })

  return { createReorder, advanceReorder, setMealAvailability }
}

/** Keeps the screen awake and auto-cycles pages when items exceed `pageSize`. */
export function useKioskCycle<T>(items: T[], pageSize: number, intervalMs = 12000) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(0)
  }, [items.length, pageSize])

  useEffect(() => {
    if (totalPages <= 1) return
    const timer = window.setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [totalPages, intervalMs])

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          lock = sentinel
        })
        .catch(() => {})
    }
    return () => {
      void lock?.release()
    }
  }, [])

  const visible = items.slice(page * pageSize, (page + 1) * pageSize)
  return { visible, page, totalPages }
}
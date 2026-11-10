import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notify } from '../../components/ui/toast'
import { SkeletonCards } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import {
  useEventMutations,
  useEventPreps,
  useEventTours,
} from '../../hooks/queries/useEvents'
import { formatDayLabel, formatTime } from '../../lib/format'
import type { PlannerMeal } from '../../api/types'
import styles from './TimelineTab.module.css'

/**
 * React-Gantt (P9): Tage mit gemeinsamer Stundenachse, pro Kategorie
 * gepackte Lanes (gleicher Greedy-Algorithmus wie die alte maud-Timeline).
 * Mahlzeiten sind verschieb- und in der Endzeit ziehbar, Touren verschiebbar
 * — über die bestehenden REST-Mutations (`PUT …/meals/{id}`,
 * `PUT …/tours/{id}`). Vorkochen ist read-only, weil dem REST-API noch
 * Preps-CRUD fehlt; Helper-Schichten (Engelsystem) gibt es nur im alten UI.
 */

/** Der logische Tag beginnt um 04:00 (Catering läuft spät) — wie im alten UI. */
const DAY_START_HOUR = 4
/** Snap-Granularität in Minuten. */
const SLOT_MINUTES = 30
/** Nominalblock für Instanzen (Touren, Vorkochen) in Stunden. */
const NOMINAL_HOURS = 2
/** Mindestbreite einer Stunden-Spalte in rem; darunter scrollt der Track. */
const MIN_COL_REM = 2.75

interface TimelineItem {
  kind: 'meal' | 'tour' | 'prep'
  id: number
  label: string
  detail: string | null
  start: Date
  end: Date
  /** Lokaler Tag (YYYY-MM-DD) des logischen Tages (04:00-Anker). */
  dayKey: string
  startHour: number
  endHour: number
  durationMin: number
}

function localDayKey(date: Date): string {
  const d = new Date(date)
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Fraktionale Stunde seit 04:00, in [0, 24) — wie hour_pos im alten UI. */
function hourPos(date: Date): number {
  let pos =
    (date.getHours() as number) + (date.getMinutes() as number) / 60 - DAY_START_HOUR
  if (pos < 0) pos += 24
  return pos
}

/** Endposition: über Tagesgrenze (oder end<=start) → clamp auf 24. */
function endHour(item: { start: Date; end: Date }): number {
  if (item.end <= item.start || localDayKey(item.end) !== localDayKey(item.start)) {
    return 24
  }
  return hourPos(item.end)
}

/** Lokale Wanduhr aus logischem Tag + Minuten-since-04:00 → ISO. */
function toLocalIso(dayKey: string, minutes: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  let total = minutes + DAY_START_HOUR * 60
  let day = new Date(y, m - 1, d)
  if (total >= 24 * 60) {
    day = new Date(y, m - 1, d + 1)
    total -= 24 * 60
  }
  const hh = Math.min(Math.floor(total / 60), 23)
  const mm = total % 60
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm).toISOString()
}

/** Tag-Row unter dem Pointer (Hit-Test über Bounding-Boxen). */
function dayAtPoint(container: HTMLElement, x: number, y: number): string | null {
  const rows = container.querySelectorAll<HTMLElement>('[data-day]')
  for (const row of rows) {
    const r = row.getBoundingClientRect()
    if (y >= r.top && y <= r.bottom && x >= r.left && x <= r.right) {
      return row.dataset.day ?? null
    }
  }
  return null
}

/** Greedy-Lane-Packing (Startzeit-Ordnung ⇒ minimale Lanes). */
function packLanes(items: TimelineItem[]): TimelineItem[][] {
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.label.localeCompare(b.label),
  )
  const lanes: TimelineItem[][] = []
  const laneEnds: Date[] = []
  for (const item of sorted) {
    const slot = laneEnds.findIndex((end) => end <= item.start)
    if (slot >= 0) {
      laneEnds[slot] = item.end
      lanes[slot].push(item)
    } else {
      laneEnds.push(item.end)
      lanes.push([item])
    }
  }
  // Chronologische Lesart: Lanes nach ihrem frühesten Balken sortieren,
  // damit die Reihen von oben nach unten zeitlich aufsteigend sind.
  return lanes.sort(
    (a, b) => (a[0]?.start.getTime() ?? 0) - (b[0]?.start.getTime() ?? 0),
  )
}

interface DayRow {
  key: string
  bands: { kind: TimelineItem['kind']; lanes: TimelineItem[][] }[]
}

const BAND_ORDER: TimelineItem['kind'][] = ['tour', 'prep', 'meal']

/**
 * Zeitplan-Tab: liest Mahlzeiten (Kontext), Touren und Vorkochen und
 * gruppiert sie auf logische Tage.
 */
export function TimelineTab({ meals }: { meals: PlannerMeal[] }) {
  const eventId = meals[0]?.event_id ?? 0
  const preps = useEventPreps(eventId)
  const tours = useEventTours(eventId)
  const mutations = useEventMutations(eventId)
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  // Kategorien, die über die Legende ausgeblendet sind (Einkäufe/Vorkochen/Essen).
  const [hiddenKinds, setHiddenKinds] = useState<Set<TimelineItem['kind']>>(
    () => new Set(),
  )
  const toggleKind = (kind: TimelineItem['kind']) =>
    setHiddenKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = []
    for (const meal of meals) {
      const start = new Date(meal.start_time)
      const end = new Date(meal.end_time)
      list.push({
        kind: 'meal',
        id: meal.meal_id,
        label: meal.name,
        detail: `${meal.place} · ${meal.servings} Port.`,
        start,
        end,
        dayKey: localDayKey(start),
        startHour: hourPos(start),
        endHour: endHour({ start, end }),
        durationMin: Math.max(
          Math.round((end.getTime() - start.getTime()) / 60000),
          SLOT_MINUTES,
        ),
      })
    }
    for (const tour of tours.data ?? []) {
      const start = new Date(tour.tour_date)
      const end = new Date(start.getTime() + NOMINAL_HOURS * 3_600_000)
      list.push({
        kind: 'tour',
        id: tour.id,
        label: tour.store_name ?? `Tour #${tour.id}`,
        detail: null,
        start,
        end,
        dayKey: localDayKey(start),
        startHour: hourPos(start),
        endHour: endHour({ start, end }),
        durationMin: NOMINAL_HOURS * 60,
      })
    }
    for (const prep of preps.data ?? []) {
      const start = new Date(prep.prep_date)
      const end = new Date(start.getTime() + NOMINAL_HOURS * 3_600_000)
      list.push({
        kind: 'prep',
        id: prep.id,
        label: prep.recipe_name,
        detail: null,
        start,
        end,
        dayKey: localDayKey(start),
        startHour: hourPos(start),
        endHour: endHour({ start, end }),
        durationMin: NOMINAL_HOURS * 60,
      })
    }
    return list
  }, [meals, tours.data, preps.data])

  const bounds = useMemo(() => {
    if (items.length === 0) return { firstHour: 8, cols: 12 }
    const earliest = Math.min(...items.map((item) => item.startHour))
    const latest = Math.max(...items.map((item) => item.endHour))
    const firstHour = Math.max(Math.floor(earliest) - 1, 0)
    const lastHour = Math.min(Math.ceil(latest) + 1, 24)
    return { firstHour, cols: Math.max(lastHour - firstHour, 1) }
  }, [items])


  const days = useMemo<DayRow[]>(() => {
    const byDay = new Map<string, TimelineItem[]>()
    for (const item of items) {
      if (hiddenKinds.has(item.kind)) continue
      const bucket = byDay.get(item.dayKey)
      if (bucket) bucket.push(item)
      else byDay.set(item.dayKey, [item])
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dayItems]) => ({
        key,
        bands: BAND_ORDER.map((kind) => ({
          kind,
          lanes: packLanes(dayItems.filter((item) => item.kind === kind)),
        })).filter((band) => band.lanes.length > 0),
      }))
  }, [items, hiddenKinds])

  /** Commit einer Verschiebung/des Ziehens über die REST-Mutations. */
  const commit = (
    kind: 'meal' | 'tour',
    id: number,
    dayKey: string,
    startMin: number,
    durationMin: number,
  ) => {
    const startIso = toLocalIso(dayKey, startMin)
    const onError = () => {
      notify('error', t('timeline.moveFailed'))
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    }
    if (kind === 'meal') {
      mutations.updateMeal.mutate(
        {
          mealId: id,
          start_time: startIso,
          end_time: toLocalIso(dayKey, startMin + durationMin),
        },
        { onError },
      )
    } else {
      const tour = (tours.data ?? []).find((entry) => entry.id === id)
      if (!tour) return
      mutations.updateTour.mutate(
        { tourId: id, tour_date: startIso, store_id: tour.store_id },
        { onError },
      )
    }
  }

  // ── Drag & Resize (Pointer-Gesture über data-Attribute) ──
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const bar = target.closest<HTMLElement>('[data-drag]')
    if (!bar || !containerRef.current) return
    // Textauswahl/Autoscroll während des Ziehens unterbinden.
    event.preventDefault()
    const kind = bar.dataset.drag as 'meal' | 'tour'
    const id = Number(bar.dataset.id)
    const dayKey = bar.dataset.day ?? ''
    const durationMin = Number(bar.dataset.duration ?? SLOT_MINUTES)
    const resizing =
      target.closest('[data-handle]') !== null && bar.dataset.resizable === '1'
    const lane = bar.parentElement as HTMLElement
    const laneRect = lane.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    // `bounds` kommt aus dem Render-Closure (aktuell pro Gesture).
    const mpp = (bounds.cols * 60) / laneRect.width
    const toMin = (x: number) =>
      Math.round((x - laneRect.left) * mpp + bounds.firstHour * 60)
    const snap = (m: number) =>
      Math.max(0, Math.min(24 * 60, Math.round(m / SLOT_MINUTES) * SLOT_MINUTES))

    const gesture = {
      bar,
      kind,
      id,
      dayKey,
      durationMin,
      resizing,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetX: event.clientX - barRect.left,
      grabOffsetY: event.clientY - barRect.top,
      laneRect,
      origWidthPx: barRect.width,
      origStartMin: snap(toMin(barRect.left)),
      origEndMin: snap(toMin(barRect.right)),
      mpp,
      bounds,
      savedStyle: bar.getAttribute('style') ?? '',
      lifted: false,
      moved: false,
      container: containerRef.current,
    }

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== gesture.pointerId) return
      const dx = moveEvent.clientX - gesture.startX
      if (Math.abs(dx) > 3 || Math.abs(moveEvent.clientY - gesture.startY) > 3) {
        gesture.moved = true
      }
      if (!gesture.moved) return
      const slotPx = SLOT_MINUTES / gesture.mpp
      if (gesture.resizing) {
        let newWidth = gesture.origWidthPx + dx
        newWidth = Math.max(slotPx, Math.round(newWidth / slotPx) * slotPx)
        bar.style.width = `${newWidth}px`
        return
      }
      if (!gesture.lifted) {
        gesture.lifted = true
        bar.classList.add(styles.lifted)
        bar.style.position = 'fixed'
        bar.style.margin = '0'
        bar.style.width = `${barRect.width}px`
        bar.style.height = `${barRect.height}px`
        bar.style.pointerEvents = 'none'
      }
      bar.style.left = `${moveEvent.clientX - gesture.grabOffsetX}px`
      bar.style.top = `${moveEvent.clientY - gesture.grabOffsetY}px`
      const overDay =
        dayAtPoint(gesture.container, moveEvent.clientX, moveEvent.clientY) ??
        gesture.dayKey
      gesture.container
        .querySelectorAll<HTMLElement>('[data-day]')
        .forEach((row) =>
          row.classList.toggle(styles.dropTarget, row.dataset.day === overDay),
        )
    }

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== gesture.pointerId) return
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      bar.classList.remove(styles.lifted)
      bar.style.pointerEvents = ''
      gesture.container
        .querySelectorAll<HTMLElement>(`.${styles.dropTarget}`)
        .forEach((row) => row.classList.remove(styles.dropTarget))
      const barRectNow = bar.getBoundingClientRect()
      const restore = () => bar.setAttribute('style', gesture.savedStyle)
      if (!gesture.moved) {
        restore()
        return
      }
      if (gesture.resizing) {
        const endMin = snap(toMin(barRectNow.right))
        const duration = Math.max(endMin - gesture.origStartMin, SLOT_MINUTES)
        restore()
        if (duration !== gesture.durationMin) {
          commit('meal', gesture.id, gesture.dayKey, gesture.origStartMin, duration)
        }
        return
      }
      const dropDay =
        dayAtPoint(gesture.container, upEvent.clientX, upEvent.clientY) ??
        gesture.dayKey
      const track = gesture.container.querySelector<HTMLElement>(
        `[data-track="${dropDay}"]`,
      )
      const rect = (track ?? lane).getBoundingClientRect()
      const rawStart = Math.round(
        (barRectNow.left - rect.left) * gesture.mpp +
          gesture.bounds.firstHour * 60,
      )
      // Im Tagesfenster klemmen: Start so, dass Dauer + Snap innerhalb von
      // 24 h bleiben (0 == 04:00 des logischen Tages).
      const startMin = snap(
        Math.max(0, Math.min(rawStart, 24 * 60 - gesture.durationMin)),
      )
      restore()
      const changed =
        startMin !== gesture.origStartMin || dropDay !== gesture.dayKey
      if (changed) {
        commit(gesture.kind, gesture.id, dropDay, startMin, gesture.durationMin)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  // "Heute" einmalig beim Mount bestimmen (Date ist eine impure Funktion —
  // daher lazy Initializer statt Ableitung im Render).
  const [todayKey] = useState(() => localDayKey(new Date()))
  const pct = (hour: number) => ((hour - bounds.firstHour) / bounds.cols) * 100

  if (preps.isPending || tours.isPending) {
    return (
      <div className={styles.wrap}>
        <SkeletonCards count={2} />
      </div>
    )
  }
  if (preps.isError || tours.isError) {
    return (
      <div className={styles.wrap}>
        <p className="muted">
          {t('timeline.loadError', {
            error: String(preps.isError ? preps.error : tours.error),
          })}
        </p>
      </div>
    )
  }

  const kindClass: Record<TimelineItem['kind'], string> = {
    meal: styles.barMeal,
    tour: styles.barTour,
    prep: styles.barPrep,
  }
  const kindLabel: Record<TimelineItem['kind'], string> = {
    meal: t('timeline.kind.meal'),
    tour: t('timeline.kind.tour'),
    prep: t('timeline.kind.prep'),
  }

  return (
    <div
      ref={containerRef}
      className={styles.wrap}
      onPointerDown={onPointerDown}
    >
      <div className={styles.legend}>
        {BAND_ORDER.slice()
          .reverse()
          .map((kind) => (
            <button
              key={kind}
              type="button"
              className={styles.legendItem}
              onClick={() => toggleKind(kind)}
              aria-pressed={!hiddenKinds.has(kind)}
              title={
                hiddenKinds.has(kind)
                  ? `${kindLabel[kind]} einblenden`
                  : `${kindLabel[kind]} ausblenden`
              }
              style={
                hiddenKinds.has(kind)
                  ? { opacity: 0.4, textDecoration: 'line-through' }
                  : undefined
              }
            >
              <span className={`${styles.swatch} ${kindClass[kind]}`} />
              {kindLabel[kind]}
            </button>
          ))}
        <span className={`muted ${styles.hint}`}>{t('timeline.hint')}</span>
      </div>

      {days.length === 0 ? (
        <p className="muted">{t('timeline.empty')}</p>
      ) : (
        days.map((day) => (
          <div key={day.key} data-day={day.key} className={`card ${styles.dayCard}`}>
            <div className={styles.dayHeader}>
              <h3 className="section-subtitle">
                {formatDayLabel(`${day.key}T00:00:00`)}
              </h3>
              {day.key === todayKey && (
                <span className={styles.todayBadge}>{t('timeline.today')}</span>
              )}
            </div>
            <div
              className={styles.track}
              data-track={day.key}
              style={{ minWidth: `${bounds.cols * MIN_COL_REM}rem` }}
            >
              <div className={styles.axis}>
                {Array.from({ length: bounds.cols }, (_, index) => {
                  const clock = (bounds.firstHour + index + DAY_START_HOUR) % 24
                  return (
                    <span key={index} className={styles.axisCell}>
                      {String(clock).padStart(2, '0')}:00
                    </span>
                  )
                })}
              </div>
              {day.bands.map((band) =>
                band.lanes.map((lane, laneIndex) => (
                  <div key={`${band.kind}-${laneIndex}`} className={styles.lane}>
                    <div className={styles.gridlines}>
                      {Array.from({ length: bounds.cols }, (_, index) => (
                        <div key={index} />
                      ))}
                    </div>
                    {lane.map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className={`${styles.bar} ${kindClass[item.kind]} ${
                          item.kind !== 'prep' ? styles.draggable : ''
                        }`}
                        style={{
                          left: `${Math.max(pct(item.startHour), 0).toFixed(3)}%`,
                          width: `${Math.max(
                            pct(item.endHour) - pct(item.startHour),
                            1.5,
                          ).toFixed(3)}%`,
                        }}
                        title={`${item.label} (${formatTime(
                          item.start.toISOString(),
                        )}–${formatTime(item.end.toISOString())})`}
                        data-drag={item.kind !== 'prep' ? item.kind : undefined}
                        data-id={item.id}
                        data-day={item.dayKey}
                        data-duration={item.durationMin}
                        data-resizable={item.kind === 'meal' ? '1' : undefined}
                      >
                        {item.kind === 'meal' && (
                          <div className={styles.handle} data-handle="1" />
                        )}
                        <span className={styles.barLabel}>{item.label}</span>
                        {item.detail && (
                          <span className={styles.barDetail}>{item.detail}</span>
                        )}
                        <span className={styles.barTime}>
                          {formatTime(item.start.toISOString())}–
                          {formatTime(item.end.toISOString())}
                        </span>
                      </div>
                    ))}
                  </div>
                )),
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

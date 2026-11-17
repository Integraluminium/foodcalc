import {BellRing, ExternalLink, Plus, RefreshCw} from 'lucide-react'
import {useState} from 'react'
import {useParams} from 'react-router-dom'
import type {ReorderStatus, ReorderUrgency, ServingAvailability} from '../../../../api'
import {CardSection} from '../../../../components/patterns/card_section/CardSection.tsx'
import {Badge} from '../../../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../../../components/ui/spinner/Spinner.tsx'
import {notify} from '../../../../components/ui/toast/toast.ts'
import {useEvent} from "../../../../hooks/queries/useEvents.ts";
// import { useEventDetail } from '../../../../hooks/queries/useEvents.ts'
import {useStatusBoard, useStatusBoardMutations,} from '../../../../hooks/useStatusBoard.ts'

const NEXT_STATUS: Record<ReorderStatus, ReorderStatus | null> = {
  requested: 'preparing',
  preparing: 'en_route',
  en_route: 'delivered',
  delivered: null,
}

const NEXT_LABEL: Record<ReorderStatus, string> = {
  requested: 'In Zubereitung',
  preparing: 'Unterwegs melden',
  en_route: 'Als geliefert markieren',
  delivered: 'Erledigt',
}

export function LiveBoardTab() {
  const { eventId: rawId } = useParams()
  const eventId = Number(rawId)
  const board = useStatusBoard(eventId)
  const detail = useEvent(eventId)
  const { createReorder, advanceReorder, setMealAvailability } =
    useStatusBoardMutations(eventId)

  const meals = detail.data?.meals ?? []
  const [selectedMealId, setSelectedMealId] = useState<number>(0)
  const [amountLabel, setAmountLabel] = useState('1× GN 1/1')
  const [urgency, setUrgency] = useState<ReorderUrgency>('normal')
  const [note, setNote] = useState('')

  if (board.isPending && !board.data) return <Spinner />

  const activeMealId = selectedMealId || meals[0]?.meal_id || 0
  const reorders = board.data?.kitchen.reorders ?? []
  const currentDishes = board.data?.serving.current ?? []

  async function handleCreateReorder(e: React.FormEvent) {
    e.preventDefault()
    if (!activeMealId || !amountLabel.trim()) return
    await createReorder.mutateAsync({
      meal_id: activeMealId,
      amount_label: amountLabel.trim(),
      urgency,
      note: note.trim() || undefined,
    })
    setNote('')
    notify('success', 'Nachbestellung an Küche gesendet')
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Kiosk Display Links */}
      <CardSection title="Anzeigetafeln (Kiosk-Modus)">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href={`/status-board/${eventId}/kitchen`}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            <ExternalLink size={16} /> Küchen-Leitstand öffnen
          </a>
          <a
            href={`/status-board/${eventId}/serving`}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            <ExternalLink size={16} /> Ausgabe-Display öffnen
          </a>
        </div>
      </CardSection>

      {/* Ausgabe -> Küche: Trigger Reorder */}
      <CardSection title="Nachbestellung auslösen (Ausgabe → Küche)">
        <form
          onSubmit={handleCreateReorder}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}
        >
          <label>
            Speise
            <select
              value={activeMealId}
              onChange={(e) => setSelectedMealId(Number(e.target.value))}
            >
              {meals.map((m) => (
                <option key={m.meal_id} value={m.meal_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Menge
            <input
              value={amountLabel}
              onChange={(e) => setAmountLabel(e.target.value)}
              placeholder="z.B. 2× GN 1/1 oder 30 Portionen"
            />
          </label>

          <label>
            Dringlichkeit
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as ReorderUrgency)}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Dringend</option>
              <option value="critical">Kritisch (leer)</option>
            </select>
          </label>

          <label>
            Notiz (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. ohne Koriander"
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={!activeMealId || createReorder.isPending}
          >
            <Plus size={16} /> Nachbestellen
          </button>
        </form>
      </CardSection>

      {/* Active Reorder Queue */}
      <CardSection title={`Offene Nachbestellungen (${reorders.length})`}>
        {reorders.length === 0 ? (
          <p className="muted">Keine offenen Nachbestellungen.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {reorders.map((r) => {
              const next = NEXT_STATUS[r.status]
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <strong>{r.dish_name}</strong> · <span>{r.amount_label}</span>{' '}
                    <Badge variant={r.urgency === 'critical' ? 'warning' : 'neutral'}>
                      <BellRing size={12} /> {r.status}
                    </Badge>
                    {r.note && <div className="muted">{r.note}</div>}
                  </div>
                  {next && (
                    <button
                      type="button"
                      className="btn"
                      disabled={advanceReorder.isPending}
                      onClick={() =>
                        advanceReorder.mutate({ reorderId: r.id, status: next })
                      }
                    >
                      {NEXT_LABEL[r.status]}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardSection>

      {/* Serving Availability Toggles */}
      <CardSection title="Verfügbarkeit an der Ausgabe">
        {currentDishes.length === 0 ? (
          <p className="muted">Aktuell keine aktiven Speisen im Ausgabefenster.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {currentDishes.map((dish) => (
              <div
                key={dish.meal_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.6rem 0.8rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                <strong>{dish.dish_name}</strong>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(
                    [
                      ['available', 'Verfügbar', null],
                      ['low', 'Wenige', null],
                      ['replenishing', 'Nachschub (~5m)', 5],
                      ['sold_out', 'Ausverkauft', null],
                    ] as [ServingAvailability, string, number | null][]
                  ).map(([state, label, eta]) => (
                    <button
                      key={state}
                      type="button"
                      className={dish.availability === state ? 'btn primary' : 'btn'}
                      disabled={setMealAvailability.isPending}
                      onClick={() =>
                        setMealAvailability.mutate({
                          mealId: dish.meal_id,
                          availability: state,
                          eta_minutes: eta,
                        })
                      }
                    >
                      {state === 'replenishing' && <RefreshCw size={13} />} {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </div>
  )
}
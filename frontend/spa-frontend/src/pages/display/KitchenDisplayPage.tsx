import {AlertTriangle, BellRing, CheckCircle2, ChefHat, Clock, Truck, WifiOff,} from 'lucide-react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useParams} from 'react-router-dom'
import type {KitchenReorderItem} from '../../api'
import {Badge} from '../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useKioskCycle, useStatusBoard} from '../../hooks/useStatusBoard.ts'
import styles from './DisplayBoard.module.css'

export default function KitchenDisplayPage() {
  const { t } = useTranslation([])
  const { eventId: rawEventId } = useParams()
  const eventId = Number(rawEventId)

  const board = useStatusBoard(eventId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const reorders = board.data?.kitchen.reorders ?? []
  const outgoing = board.data?.kitchen.outgoing ?? []
  const prepTasks = board.data?.kitchen.prep_tasks ?? []

  const reorderPage = useKioskCycle(reorders, 5)
  const outgoingPage = useKioskCycle(outgoing, 6)
  const prepPage = useKioskCycle(prepTasks, 6)

  const isStale =
    board.isError ||
    (board.dataUpdatedAt > 0 && now.getTime() - board.dataUpdatedAt > 30_000)

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return (
      <div className={styles.screen}>
        <p className="muted">Ungültige Event-ID.</p>
      </div>
    )
  }

  if (board.isPending && !board.data) {
    return (
      <div className={styles.screen}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.boardTitle}>
            {t('display:kitchen.title', 'Küchen-Leitstand')}
          </h1>
          {board.data?.event_name && (
            <span className={styles.eventLabel}>{board.data.event_name}</span>
          )}
        </div>

        <div className={styles.statusCluster}>
          {isStale && (
            <span className={styles.staleBanner}>
              <WifiOff size={16} />
              {t('display:staleWarning', 'Verbindung prüfen — Daten evtl. veraltet')}
            </span>
          )}
          <span className={styles.clock}>
            {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      <div className={styles.kitchenGrid}>
        {/* 1. Live Reorders from Ausgabe */}
        <section className={`${styles.lane} ${styles.laneUrgent}`}>
          <div className={styles.laneHeader}>
            <h2 className={styles.laneTitle}>
              <BellRing size={20} />
              {t('display:kitchen.reorders', 'Nachbestellungen Ausgabe')}
            </h2>
            <Badge variant={reorders.length > 0 ? 'warning' : 'neutral'}>
              {reorders.length}
              {reorderPage.totalPages > 1 &&
                ` · ${reorderPage.page + 1}/${reorderPage.totalPages}`}
            </Badge>
          </div>

          {reorders.length === 0 ? (
            <p className="muted">
              {t('display:kitchen.noReorders', 'Keine offenen Nachbestellungen.')}
            </p>
          ) : (
            <div className={styles.cardStack}>
              {reorderPage.visible.map((item) => (
                <ReorderCard key={item.id} item={item} now={now} />
              ))}
            </div>
          )}
        </section>

        {/* 2. Upcoming Outgoing Batches to Serving */}
        <section className={styles.lane}>
          <div className={styles.laneHeader}>
            <h2 className={styles.laneTitle}>
              <Truck size={20} />
              {t('display:kitchen.outgoing', 'Demnächst zur Ausgabe')}
            </h2>
            {outgoingPage.totalPages > 1 && (
              <Badge variant="neutral">
                {outgoingPage.page + 1}/{outgoingPage.totalPages}
              </Badge>
            )}
          </div>

          {outgoing.length === 0 ? (
            <p className="muted">
              {t('display:kitchen.noOutgoing', 'Keine anstehenden Ausgaben.')}
            </p>
          ) : (
            <div className={styles.cardStack}>
              {outgoingPage.visible.map((batch) => (
                <div key={batch.meal_id} className={styles.taskCard}>
                  <div className={styles.cardTop}>
                    <span className={styles.dishHeading}>{batch.dish_name}</span>
                    <span className={styles.amountPill}>
                      {new Date(batch.serving_time).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{batch.portions} Portionen</span>
                    <Badge variant={batch.ready_for_dispatch ? 'success' : 'info'}>
                      {batch.ready_for_dispatch ? (
                        <>
                          <CheckCircle2 size={13} /> Bereit
                        </>
                      ) : (
                        'In Vorbereitung'
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Prep Queue */}
        <section className={styles.lane}>
          <div className={styles.laneHeader}>
            <h2 className={styles.laneTitle}>
              <ChefHat size={20} />
              {t('display:kitchen.prep', 'Vorbereitung')}
            </h2>
            {prepPage.totalPages > 1 && (
              <Badge variant="neutral">
                {prepPage.page + 1}/{prepPage.totalPages}
              </Badge>
            )}
          </div>

          {prepTasks.length === 0 ? (
            <p className="muted">
              {t('display:kitchen.noPrep', 'Alle Vorbereitungen erledigt.')}
            </p>
          ) : (
            <div className={styles.cardStack}>
              {prepPage.visible.map((task) => (
                <div key={task.id} className={styles.taskCard}>
                  <div className={styles.cardTop}>
                    <span className={styles.dishHeading}>{task.title}</span>
                    {task.quantity_label && (
                      <span className={styles.amountPill}>{task.quantity_label}</span>
                    )}
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{task.dish_name}</span>
                    <span>
                      <Clock size={13} /> bis{' '}
                      {new Date(task.target_time).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ReorderCard({ item, now }: { item: KitchenReorderItem; now: Date }) {
  const elapsedMin = Math.max(
    0,
    Math.floor((now.getTime() - new Date(item.requested_at).getTime()) / 60_000),
  )

  const urgencyClass =
    item.urgency === 'critical'
      ? styles.urgencyCritical
      : item.urgency === 'urgent'
        ? styles.urgencyUrgent
        : styles.urgencyNormal

  const statusLabel: Record<KitchenReorderItem['status'], string> = {
    requested: 'Angefordert',
    preparing: 'Wird zubereitet',
    en_route: 'Unterwegs',
    delivered: 'Geliefert',
  }

  return (
    <div className={`${styles.taskCard} ${urgencyClass}`}>
      <div className={styles.cardTop}>
        <span className={styles.dishHeading}>{item.dish_name}</span>
        <span className={styles.amountPill}>{item.amount_label}</span>
      </div>
      <div className={styles.cardMeta}>
        <span>
          {item.station} · vor {elapsedMin} Min.
        </span>
        <Badge
          variant={
            item.urgency === 'critical'
              ? 'danger'
              : item.status === 'en_route'
                ? 'success'
                : 'warning'
          }
        >
          {item.urgency === 'critical' && <AlertTriangle size={13} />}
          {statusLabel[item.status]}
        </Badge>
      </div>
      {item.note && <p className={styles.cardNote}>{item.note}</p>}
    </div>
  )
}
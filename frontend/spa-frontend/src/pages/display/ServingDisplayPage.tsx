import {Clock, RefreshCw, Utensils, WifiOff} from 'lucide-react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useParams} from 'react-router-dom'
import type {ServingDishItem} from '../../api'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useKioskCycle, useStatusBoard} from '../../hooks/useStatusBoard.ts'
import styles from './DisplayBoard.module.css'

export default function ServingDisplayPage() {
  const { t } = useTranslation([])
  const { eventId: rawEventId } = useParams()
  const eventId = Number(rawEventId)

  const board = useStatusBoard(eventId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const currentDishes = board.data?.serving.current ?? []
  const upcomingDishes = board.data?.serving.upcoming ?? []

  const currentPage = useKioskCycle(currentDishes, 4)
  const upcomingPage = useKioskCycle(upcomingDishes, 5)

  // Build legend for all allergens present on the board (coded or uncoded)
  const activeAllergens = Array.from(
    new Map(
      [...currentDishes, ...upcomingDishes]
        .flatMap((d) => d.properties)
        .filter((p) => p.is_allergen)
        .map((p) => [p.id, p]),
    ).values(),
  )

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
            {t('display:serving.title', 'Speiseplan · Ausgabe')}
          </h1>
          {board.data?.event_name && (
            <span className={styles.eventLabel}>{board.data.event_name}</span>
          )}
        </div>

        <div className={styles.statusCluster}>
          {isStale && (
            <span className={styles.staleBanner}>
              <WifiOff size={16} />
              {t('display:serving.updating', 'Aktualisierung läuft…')}
            </span>
          )}
          <span className={styles.clock}>
            {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      <div className={styles.servingGrid}>
        {/* Left: Currently Being Served */}
        <section className={styles.servingSection}>
          <h2 className={styles.sectionHeading}>
            <span>
              <Utensils size={22} />{' '}
              {t('display:serving.now', 'Jetzt an der Ausgabe')}
            </span>
            {currentPage.totalPages > 1 && (
              <span className="muted">
                {currentPage.page + 1} / {currentPage.totalPages}
              </span>
            )}
          </h2>

          {currentDishes.length === 0 ? (
            <p className="muted">
              {t(
                'display:serving.emptyNow',
                'Aktuell läuft keine Ausgabe — die nächsten Gerichte stehen rechts.',
              )}
            </p>
          ) : (
            <div className={styles.cardStack}>
              {currentPage.visible.map((dish) => (
                <ServingDishCard key={dish.meal_id} dish={dish} />
              ))}
            </div>
          )}
        </section>

        {/* Right: Upcoming Meals */}
        <section className={styles.servingSection}>
          <h2 className={styles.sectionHeading}>
            <span>
              <Clock size={22} /> {t('display:serving.upcoming', 'Demnächst')}
            </span>
            {upcomingPage.totalPages > 1 && (
              <span className="muted">
                {upcomingPage.page + 1} / {upcomingPage.totalPages}
              </span>
            )}
          </h2>

          {upcomingDishes.length === 0 ? (
            <p className="muted">
              {t('display:serving.emptyUpcoming', 'Keine weiteren Gerichte geplant.')}
            </p>
          ) : (
            <div className={styles.cardStack}>
              {upcomingPage.visible.map((dish) => (
                <div key={dish.meal_id} className={styles.dishCard}>
                  <div className={styles.dishHeader}>
                    <div>
                      <h3 className={styles.dishTitle}>{dish.dish_name}</h3>
                      {dish.dish_name_en && (
                        <p className={styles.dishSubTitle}>{dish.dish_name_en}</p>
                      )}
                    </div>
                    <span className={styles.amountPill}>
                      ab{' '}
                      {new Date(dish.serving_start).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <DishTags properties={dish.properties} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className={styles.legendFooter}>
        <div>
          {activeAllergens.length > 0 ? (
            <>
              <strong>Allergene: </strong>
              {activeAllergens
                .map((a) => (a.code ? `${a.code} = ${a.name}` : a.name))
                .join(' · ')}
            </>
          ) : (
            <span>Alle Angaben zu Allergenen & Zusatzstoffen ohne Gewähr.</span>
          )}
        </div>
        <span>
          Stand:{' '}
          {board.dataUpdatedAt
            ? new Date(board.dataUpdatedAt).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })
            : '–'}{' '}
          Uhr
        </span>
      </footer>
    </div>
  )
}

function ServingDishCard({ dish }: { dish: ServingDishItem }) {
  const soldOut = dish.availability === 'sold_out'

  return (
    <article
      className={`${styles.dishCard} ${soldOut ? styles.dishCardMuted : ''}`}
    >
      <div className={styles.dishHeader}>
        <div>
          <h3 className={styles.dishTitle}>{dish.dish_name}</h3>
          {dish.dish_name_en && (
            <p className={styles.dishSubTitle}>{dish.dish_name_en}</p>
          )}
          {dish.description && (
            <p className={styles.dishSubTitle}>{dish.description}</p>
          )}
        </div>

        <AvailabilityPill
          availability={dish.availability}
          etaMinutes={dish.eta_minutes}
        />
      </div>

      <DishTags properties={dish.properties} />
    </article>
  )
}

function AvailabilityPill({
                            availability,
                            etaMinutes,
                          }: {
  availability: ServingDishItem['availability']
  etaMinutes?: number | null
}) {
  if (availability === 'sold_out') {
    return (
      <span className={`${styles.statusPill} ${styles.statusSoldOut}`}>
        Ausverkauft
      </span>
    )
  }
  if (availability === 'replenishing') {
    return (
      <span className={`${styles.statusPill} ${styles.statusReplenishing}`}>
        <RefreshCw size={16} />
        {etaMinutes ? `Nachschub in ~${etaMinutes} Min.` : 'Nachschub unterwegs'}
      </span>
    )
  }
  if (availability === 'low') {
    return (
      <span className={`${styles.statusPill} ${styles.statusReplenishing}`}>
        Nur noch wenige Portionen
      </span>
    )
  }
  return (
    <span className={`${styles.statusPill} ${styles.statusAvailable}`}>
      Verfügbar
    </span>
  )
}

function DishTags({
                    properties,
                  }: {
  properties: ServingDishItem['properties']
}) {
  if (properties.length === 0) return null
  const dietary = properties.filter((p) => !p.is_allergen)
  const allergens = properties.filter((p) => p.is_allergen)

  return (
    <div className={styles.tagRow}>
      {dietary.map((prop) => (
        <span key={prop.id} className={styles.dietTag}>
          {prop.name}
        </span>
      ))}
      {allergens.map((prop) => (
        <span key={prop.id} className={styles.allergenTag}>
          {prop.code ? `${prop.code} (${prop.name})` : prop.name}
        </span>
      ))}
    </div>
  )
}
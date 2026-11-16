import {type FormEvent, useState} from "react";
import type {IngredientWithoutTour} from "../../../../api";
import {Drawer} from "../../../../components/patterns/drawer/Drawer.tsx";
import {Badge} from "../../../../components/ui/badge/Badge.tsx";
import {SegmentedControl} from "../../../../components/ui/segmented_control/SegmentedControl.tsx";
import {Spinner} from "../../../../components/ui/spinner/Spinner.tsx";
import {useEventMutations} from "../../../../hooks/queries/useEvents.ts";
import {useStores} from "../../../../hooks/queries/useMasterData.ts";
import {t} from "../../../../i18n";
import {dateInputToRfc3339, formatDecimal} from "../../../../lib/format.ts";
import styles from "../EventDetailPage.module.css";

export function AddTourDialog({
                                eventId,
                                prefillStoreId,
                                defaultDate,
                                uncovered,
                                onClose,
                              }: {
  eventId: number
  prefillStoreId: number | null
  defaultDate: string
  uncovered: IngredientWithoutTour[]
  onClose: () => void
}) {
  const stores = useStores()
  const mutations = useEventMutations(eventId)
  const [storeId, setStoreId] = useState(
    String(prefillStoreId ?? stores.data?.[0]?.id ?? ''),
  )
  const [date, setDate] = useState(defaultDate)
  const [preset, setPreset] = useState<'relevant' | 'none' | 'all'>('relevant')
  const [checked, setChecked] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    const initialStore = prefillStoreId ?? stores.data?.[0]?.id ?? null
    if (initialStore !== null) {
      for (const item of uncovered) {
        const match = stores.data?.find((s) => s.name === item.store_name)
        if (match && match.id === initialStore) initial.add(item.ingredient_id)
      }
    }
    return initial
  })

  const toggle = (ingredientId: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })

  const applyPreset = (mode: 'relevant' | 'none' | 'all') => {
    setPreset(mode)
    if (mode === 'none') {
      setChecked(new Set())
      return
    }
    const selectedStore = Number(storeId) || null
    const next = new Set<number>()
    for (const item of uncovered) {
      if (mode === 'all') next.add(item.ingredient_id)
      else if (selectedStore !== null) {
        const match = stores.data?.find((s) => s.name === item.store_name)
        if (match && match.id === selectedStore) next.add(item.ingredient_id)
      }
    }
    setChecked(next)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!storeId) return
    mutations.addTour.mutate(
      {tour_date: dateInputToRfc3339(date), store_id: Number(storeId)},
      {
        onSuccess: (created) => {
          for (const ingredientId of checked) {
            mutations.addTourItem.mutate({tourId: created.id, ingredientId})
          }
          onClose()
        },
      },
    )
  }

  const busy = mutations.addTour.isPending || mutations.addTourItem.isPending

  return (
    <Drawer
      title={t('shopping.tourForm.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('action.cancel')}
          </button>
          <button
            type="submit"
            form="tour-form"
            className="btn btn--primary"
            disabled={!storeId || busy}
          >
            {busy ? <Spinner size="sm"/> : t('shopping.tourForm.submit')}
          </button>
        </>
      }
    >
      <form id="tour-form" className="form-stack" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            {t('shopping.tourForm.store')}
            <select
              className="input"
              value={storeId}
              onChange={(e) => {
                setStoreId(e.target.value)
                if (preset === 'relevant') applyPreset('relevant')
              }}
              required
            >
              {(stores.data ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('shopping.tourForm.date')}
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <p className="muted">{t('shopping.tourForm.hint')}</p>

        <SegmentedControl
          options={[
            {value: 'relevant', label: t('shopping.preset.relevant')},
            {value: 'none', label: t('shopping.preset.none')},
            {value: 'all', label: t('shopping.preset.all')},
          ]}
          value={preset}
          onChange={applyPreset}
          ariaLabel={t('shopping.preset.aria')}
        />

        {uncovered.length === 0 ? (
          <p className="muted">{t('shopping.preset.noUncovered')}</p>
        ) : (
          <div className={styles.checkList}>
            {uncovered.map((item) => {
              const storeMatch = stores.data?.find((s) => s.name === item.store_name)
              const relevant =
                storeMatch !== undefined && storeMatch.id === Number(storeId)
              return (
                <label key={item.ingredient_id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checked.has(item.ingredient_id)}
                    onChange={() => toggle(item.ingredient_id)}
                  />
                  <span>{item.ingredient_name}</span>
                  <span className="muted">
                    {formatDecimal(item.weight ?? 0)} kg
                  </span>
                  <Badge variant={relevant ? 'info' : 'neutral'}>
                    {item.store_name}
                  </Badge>
                </label>
              )
            })}
          </div>
        )}
      </form>
    </Drawer>
  )
}
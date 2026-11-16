import {t} from "i18next";
import type {KeyboardEvent} from 'react'
import {useState} from 'react'
import {SearchBar} from "../../../components/patterns/searchbar/SearchBar.tsx";
import {SegmentedControl} from "../../../components/ui/segmented_control/SegmentedControl.tsx";
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useRecipes} from '../../../hooks/queries/useRecipes.ts'
import {useDebouncedValue} from '../../../hooks/useDebouncedValue.ts'
import styles from './pickers.module.css'

export interface SubRecipeSelection {
  recipeId: number
  weight: string
}

/**
 * Komponenten-Picker (Sub-Rezepte): Suche + Typ-Filter (Gericht/Komponente)
 * + Ergebnisliste. Gleiche Bedienung wie der Zutaten-Picker (Enter/Esc).
 */
export function RecipePicker({
  selfRecipeId,
  onAdd,
  onClose,
}: {
  selfRecipeId: number
  onAdd: (selection: SubRecipeSelection, keepOpen: boolean) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const [kind, setKind] = useState<'all' | 'meal' | 'component'>('all')
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null)
  const [weight, setWeight] = useState('1')

  const results = useRecipes({
    search: debounced || undefined,
    kind: kind === 'all' ? undefined : kind,
  })

  const add = (keepOpen: boolean) => {
    if (!selected) return
    onAdd({ recipeId: selected.id, weight }, keepOpen)
    if (!keepOpen) onClose()
  }

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose()
    if (event.key === 'Enter' && selected) {
      event.preventDefault()
      add(!event.shiftKey)
    }
  }

  const kindOptions = [
    { value: 'all' as const, label: t('recipes:pickers.filterAll') },
    { value: 'meal' as const, label: t('recipes:detail.kind.meal') },
    { value: 'component' as const, label: t('recipes:detail.kind.component') },
  ]

  return (
    <div className={styles.panel} onKeyDown={handleKey}>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('recipes:pickers.search')}
        autoFocus
      >
        <SegmentedControl
          options={kindOptions}
          value={kind}
          onChange={setKind}
          ariaLabel={t('recipes:list.filterKind')}
        />
      </SearchBar>

      <div className={styles.list}>
        {results.isPending ? (
          <Spinner size="sm" />
        ) : results.isError ? (
          <p className="secondary">{String(results.error)}</p>
        ) : (
          (results.data ?? [])
            .filter((recipe) => recipe.id !== selfRecipeId)
            .map((recipe) => (
              <button
                type="button"
                key={recipe.id}
                className={`${styles.row} ${selected?.id === recipe.id ? styles.rowSelected : ''}`}
                onClick={() => setSelected({ id: recipe.id, name: recipe.name })}
              >
                <span>{recipe.name}</span>
              </button>
            ))
        )}
        {results.data?.every((recipe) => recipe.id === selfRecipeId) && (
          <p className={`muted ${styles.emptyRow}`}>{t('recipes:pickers.empty')}</p>
        )}
      </div>

      {selected && (
        <div className={styles.addBar}>
          <strong>{selected.name}</strong>
          <input
            className={`input ${styles.kgInput}`}
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
          <span>kg</span>
        </div>
      )}

      <div className={styles.addBar}>
        <span className={styles.footerSpacer} />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!selected}
          onClick={() => add(true)}
        >
          {t('recipes:drawers.addKeepOpen')}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!selected}
          onClick={() => add(false)}
        >
          {t('recipes:drawers.add')}
        </button>
      </div>

      <p className={styles.hint}>{t('recipes:pickers.hint')}</p>
    </div>
  )
}

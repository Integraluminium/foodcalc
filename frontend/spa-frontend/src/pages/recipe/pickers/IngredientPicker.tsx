import {useQueryClient} from '@tanstack/react-query'
import {t} from "i18next";
import type {KeyboardEvent} from 'react'
import {useState} from 'react'
import {SearchBar} from "../../../components/patterns/searchbar/SearchBar.tsx";
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useCreateIngredient, useIngredients,} from '../../../hooks/queries/useIngredients.ts'
import {useUnits} from '../../../hooks/queries/useMasterData.ts'
import {useCurrentUser} from '../../../hooks/useAuth.ts'
import {useDebouncedValue} from '../../../hooks/useDebouncedValue.ts'
import {formatDecimal} from '../../../lib/format.ts'
import styles from './pickers.module.css'

export interface IngredientSelection {
  ingredientId: number
  amount: string
  unitId: number
}

/**
 * Zutaten-Picker: Suche + Property-Filter + Ergebnisliste (zeilenklickbar)
 * + Schnell-Anlegen noch während der Rezeptbearbeitung. Enter = hinzufügen
 * & weiter, Shift+Enter = hinzufügen & schließen, Esc = schließen.
 */
export function IngredientPicker({
  onAdd,
  onClose,
}: {
  onAdd: (selection: IngredientSelection, keepOpen: boolean) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const units = useUnits()
  const user = useCurrentUser()

  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search)
  const [propertyId] = useState(0)
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null)
  const [amount, setAmount] = useState('1')
  const [unitId, setUnitId] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEnergy, setNewEnergy] = useState('')
  const [newComment, setNewComment] = useState('')
  const create = useCreateIngredient()

  const results = useIngredients({
    search: debounced || undefined,
    property_id: propertyId || undefined,
  })

  const effectiveUnit = unitId || units.data?.[0]?.id || 0

  const add = (keepOpen: boolean) => {
    if (!selected || effectiveUnit === 0 || !amount.trim()) return
    onAdd({ ingredientId: selected.id, amount: amount.trim(), unitId: effectiveUnit }, keepOpen)
    if (!keepOpen) onClose()
  }

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose()
    if (event.key === 'Enter' && selected) {
      event.preventDefault()
      add(!event.shiftKey)
    }
  }

  const quickCreate = async () => {
    if (!newName.trim() || !newEnergy.trim()) return
    const targetGroup =
      user.data?.groups.find((group) => group.is_personal) ?? user.data?.groups[0]
    if (!targetGroup) return
    try {
      const created = await create.mutateAsync({
        name: newName.trim(),
        energy: newEnergy.trim().replace(',', '.'),
        comment: newComment.trim() || null,
        group_id: targetGroup.id,
      })
      await queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      setSelected({ id: created.id, name: created.name })
      setCreateOpen(false)
      setNewName('')
      setNewEnergy('')
      setNewComment('')
    } catch {
      // handled via create.isError
    }
  }

  return (
    <div className={styles.panel} onKeyDown={handleKey}>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('recipes:pickers.search')}
        autoFocus
      >
      </SearchBar>


      <div className={styles.list}>
        {results.isPending ? (
          <Spinner size="sm" />
        ) : results.isError ? (
          <p className="secondary">{String(results.error)}</p>
        ) : results.data.length === 0 ? (
          <p className={`muted ${styles.emptyRow}`}>{t('recipes:pickers.empty')}</p>
        ) : (
          results.data.map((ingredient) => (
            <button
              type="button"
              key={ingredient.id}
              className={`${styles.row} ${selected?.id === ingredient.id ? styles.rowSelected : ''}`}
              onClick={() => setSelected({ id: ingredient.id, name: ingredient.name })}
            >
              <span>{ingredient.name}</span>
              <span className={styles.rowMeta}>
                {formatDecimal(ingredient.energy)} kJ/g
              </span>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className={styles.addBar}>
          <strong>{selected.name}</strong>
          <input
            className={`input ${styles.amountInput}`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <select
            className={`input ${styles.unitSelect}`}
            value={effectiveUnit}
            onChange={(event) => setUnitId(Number(event.target.value))}
          >
            {units.data?.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {createOpen ? (
        <div className={styles.createForm}>
          <input
            className="input"
            placeholder={t('recipes:pickers.createName')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            className={`input ${styles.energyInput}`}
            inputMode="decimal"
            placeholder={t('recipes:pickers.createEnergy')}
            value={newEnergy}
            onChange={(event) => setNewEnergy(event.target.value)}
          />
          <input
            className="input"
            placeholder={t('recipes:pickers.createComment')}
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
          />
          <div className={styles.addBar}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCreateOpen(false)}
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={create.isPending || !newName.trim() || !newEnergy.trim()}
              onClick={() => void quickCreate()}
            >
              {create.isPending ? <Spinner size="sm" /> :t('recipes:pickers.createSubmit')}
            </button>
            {create.isError && <span className="secondary">{String(create.error)}</span>}
          </div>
        </div>
      ) : (
        <div className={styles.addBar}>
          <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(true)}>
            {t('recipes:pickers.create')}
          </button>
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
      )}

      <p className={styles.hint}>{t('recipes:pickers.hint')}</p>
    </div>
  )
}

import {useState} from 'react'
import type {IngredientDetail} from '../../../api/types.ts'
import {ConfirmDialog} from '../../../components/patterns/dialog/ConfirmDialog.tsx'
import {Drawer} from '../../../components/patterns/drawer/Drawer.tsx'
import {Spinner} from '../../../components/ui/spinner/Spinner.tsx'
import {useIngredient, useIngredientMutations,} from '../../../hooks/queries/useIngredients.ts'
import PlaceholderPage from "../../PlaceholderPage.tsx";


export function IngredientDrawer({
  id,
  onClose,
}: {
  id: number
  onClose: () => void
}) {
  const detail = useIngredient(id)
  const data = detail.data

  return (
    <Drawer title={data?.ingredient.name ?? 'Zutat'} onClose={onClose}>
      {detail.isPending ? (
        <Spinner />
      ) : detail.isError || !data ? (
        <p className="secondary">
          Zutat konnte nicht geladen werden: {String(detail.error)}
        </p>
      ) : (
        <IngredientEditor
          key={`${data.ingredient.id}:${data.ingredient.name}:${data.ingredient.energy}:${data.ingredient.group_id}:${data.ingredient.comment ?? ''}`}
          detail={data}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}

function IngredientEditor({
  detail,
  onClose,
}: {
  detail: IngredientDetail
  onClose: () => void
}) {
  const mutations = useIngredientMutations(detail.ingredient.id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <PlaceholderPage title="Basisdaten" phase="geraumer Zeit" />

      {confirmDelete && (
        <ConfirmDialog
          title="Zutat löschen"
          message={`„${detail.ingredient.name}" wirklich löschen?`}
          onConfirm={() =>
            mutations.remove.mutate(undefined, {
              onSuccess: onClose,
            })
          }
          onCancel={() => setConfirmDelete(false)}
          pending={mutations.remove.isPending}
        />
      )}
    </>
  )
}

import {t} from "i18next";
import type {FormEvent} from "react";
import {Drawer} from "../../../components/patterns/drawer/Drawer.tsx";
import {useCreateInventory} from "../../../hooks/queries/useInventories.ts";
import {useGroups} from "../../../hooks/queries/useMasterData.ts";
import {useCurrentUser} from "../../../hooks/useAuth.ts";

export function CreateInventoryDrawer({onClose}: { onClose: () => void }) {
  const {data: user} = useCurrentUser()
  const groups = useGroups()
  const create = useCreateInventory()

  const personalGroupId =
    user?.groups.find((g) => g.is_personal)?.id ?? user?.groups[0]?.id ?? 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate(
      {
        name: String(data.get('name') ?? '').trim(),
        group_id: Number(data.get('group_id') ?? personalGroupId) || personalGroupId,
      },
      {onSuccess: onClose},
    )
  }

  return (
    <Drawer
      title={t('inventories:titleNew')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </button>
          <button
            type="submit"
            form="create-inventory-form"
            className="btn btn--primary"
            disabled={create.isPending}
          >
            {create.isPending ? 'Anlegen…' :t('common:actions.create')}
          </button>
        </>
      }
    >
      <form id="create-inventory-form" onSubmit={handleSubmit}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <label className="field">
            Name
            <input className="input" name="name" required autoFocus/>
          </label>
          <label className="field">
            Owner-Gruppe
            <select
              className="input"
              name="group_id"
              defaultValue={personalGroupId || undefined}
            >
              {(groups.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {group.is_personal ? ' (persönlich)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Drawer>
  )
}
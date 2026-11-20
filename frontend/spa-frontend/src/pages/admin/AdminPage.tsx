import {t} from 'i18next'
import {KeyRound, ShieldCheck, Trash2} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {AdminUserWithGroups, RoleSlug} from '../../api'
import {CardSection} from "../../components/patterns/card_section/CardSection.tsx";
import {ConfirmDialog} from '../../components/patterns/dialog/ConfirmDialog.tsx'
import {RoleMultiSelect} from '../../components/patterns/roles/RoleMultiSelect.tsx'
import {DataTable} from "../../components/patterns/table/DataTable.tsx";
import {Badge} from "../../components/ui/badge/Badge.tsx";
import {SegmentedControl} from '../../components/ui/segmented_control/SegmentedControl.tsx'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useGroups} from '../../hooks/queries/useMasterData.ts'
import {
  useAdminSelfGrant,
  useMemberDefaults,
  useRoles,
  useSetMemberDefaults,
  useUserAdminMutations,
  useUsers,
} from '../../hooks/queries/useUsers.ts'
import {useGlobalPermission, useHasAnyGlobalPermission} from '../../hooks/usePermissions.ts'
import {ConnectedGroupsPanel} from '../settings/SettingsPage.tsx'
import styles from './AdminPage.module.css'
import AuditTab from './AuditTab.tsx'
import {UserAccessDrawer} from './UserAccessDrawer.tsx'

type Tab = 'users' | 'groups' | 'system' | 'protokoll'


export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  const hasManageUsers = useGlobalPermission('admin:manage_users')
  const hasViewAuditLog = useGlobalPermission('admin:view_audit_log')
  const hasManageSettings = useGlobalPermission('admin:manage_settings') || useGlobalPermission('admin:manage_master_data')

  const hasAnyAdminAccess = useHasAnyGlobalPermission()
  if (!hasAnyAdminAccess) {
    return (
      <p className="secondary">
        Diese Seite ist Administratoren vorbehalten.
      </p>
    )
  }


  const TAB_OPTIONS = [
    {value: 'users', label: 'Benutzer', disabled: !hasManageUsers},
    {value: 'groups', label: 'Gruppen', disabled: !hasManageUsers},
    {value: 'system', label: 'System', disabled: !hasManageSettings},
    {value: 'protokoll', label: 'Protokoll', disabled: !hasViewAuditLog},
  ] as const

  return (
    // <RequireGlobalPermission
    //   permission={'admin:manage_users'}
    //   // redirectTo={'/events'}
    // >
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="section-title">Verwaltung</h1>
        <SegmentedControl
          options={[...TAB_OPTIONS]}
          value={tab}
          onChange={setTab}
          ariaLabel="Verwaltungsbereich wählen"
        />
      </div>
      {tab === 'users' && <UsersPanel/>}
      {tab === 'groups' && <GroupsPanel/>}
      {tab === 'system' && <SystemPanel/>}
      {tab === 'protokoll' && <AuditTab/>}
    </div>
    // </RequireGlobalPermission>
  )
}

// ------------------------------------------------------------------- users

function handleChangePassword(row: AdminUserWithGroups, changePassword: any) {
  const next = window.prompt(`Neues Passwort für ${row.username}`)
  if (next) changePassword.mutate({id: row.id, new_password: next})
}

function UsersPanel() {
  const [search, setSearch] = useState('')
  const users = useUsers(search)
  const {update, remove, changePassword} = useUserAdminMutations()
  const [accessUser, setAccessUser] = useState<AdminUserWithGroups | null>(null)
  const [deleteUser, setDeleteUser] = useState<{
    id: number
    username: string
  } | null>(null)

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.toolbar}>
        <input
          className={`input ${styles.search}`}
          placeholder="Benutzer suchen (Name / E-Mail)…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="muted">
          {users.data ? `${users.data.length} Benutzer` : ''}
        </span>
      </div>

      {users.isPending ? (
        <Spinner/>
      ) : users.isError ? (
        <p className="secondary">
          Benutzer konnten nicht geladen werden: {String(users.error)}
        </p>
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'username',
                label: 'Benutzer',
                render: (row) => row.username
              },
              {
                key: 'email',
                label: 'E-Mail',
                render: (row) => row.email
              },
              {
                key: 'groups',
                label: 'Gruppen',
                render: (row) => row.groups
                  .filter((group) => !group.is_personal)
                  .map((group) => group.name)
                  .join(', ') || <span className="muted">—</span>
              },
              {
                key: 'quick_actions',
                label: 'Aktionen',
                render: (row) => (
                  <div className="row-actions">
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Passwort zurücksetzen"
                      onClick={() => {
                        handleChangePassword(row, changePassword)
                      }}
                    >
                      <KeyRound size={15}/>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Benutzer löschen"
                      onClick={() => {
                        setDeleteUser({id: row.id, username: row.username})
                      }}
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                )
              }
            ]}
            rows={users.data}
            getRowKey={(row) => row.id}
            emptyMessage={"Keine Benutzer gefunden."}
            withChevron={true}
            onRowClick={(row) => setAccessUser(row)}
            highlight={false}
          />


          {/*<div className={styles.tableWrap}>*/}
          {/*  <table className="table">*/}
          {/*    <thead>*/}
          {/*    <tr>*/}
          {/*      <th>Benutzer</th>*/}
          {/*      <th>E-Mail</th>*/}
          {/*      <th>Gruppen</th>*/}
          {/*      <th className="num">Admin</th>*/}
          {/*      <th/>*/}
          {/*    </tr>*/}
          {/*    </thead>*/}
          {/*    <tbody>*/}
          {/*    {users.data.map((row) => (*/}
          {/*      <tr key={row.id}>*/}
          {/*        <td>*/}
          {/*          {row.username}*/}
          {/*          {row.groups.some((group) => group.is_personal) && (*/}
          {/*            <span className="muted" title="persönliche Gruppe"> ·</span>*/}
          {/*          )}*/}
          {/*        </td>*/}
          {/*        <td>{row.email}</td>*/}
          {/*        <td>*/}
          {/*          {row.groups*/}
          {/*            .filter((group) => !group.is_personal)*/}
          {/*            .map((group) => group.name)*/}
          {/*            .join(', ') || <span className="muted">—</span>}*/}
          {/*        </td>*/}
          {/*        <td className="num">*/}
          {/*          <input*/}
          {/*            type="checkbox"*/}
          {/*            checked={row.is_admin}*/}
          {/*            onChange={(event) => update.mutate({id: row.id, is_admin: event.target.checked})}*/}
          {/*            title="Bootstrap-Flag; feingranulare Rechte siehe „Rechte“"*/}
          {/*          />*/}
          {/*        </td>*/}
          {/*        <td className="num">*/}
          {/*          <div className="row-actions">*/}
          {/*            <button*/}
          {/*              type="button"*/}
          {/*              className={styles.iconButton}*/}
          {/*              title="Rechte & Gruppen"*/}
          {/*              onClick={() => setAccessUser(row)}*/}
          {/*            >*/}
          {/*              <KeyRound size={15}/>*/}
          {/*            </button>*/}
          {/*            <button*/}
          {/*              type="button"*/}
          {/*              className={styles.iconButton}*/}
          {/*              title="Passwort zurücksetzen"*/}
          {/*              onClick={() => {*/}
          {/*                handleChangePassword(row, changePassword);*/}
          {/*              }}*/}
          {/*            >*/}
          {/*              🔑*/}
          {/*            </button>*/}
          {/*            <button*/}
          {/*              type="button"*/}
          {/*              className={styles.iconButton}*/}
          {/*              title="Benutzer löschen"*/}
          {/*              onClick={() =>*/}
          {/*                setDeleteUser({id: row.id, username: row.username})*/}
          {/*              }*/}
          {/*            >*/}
          {/*              🗑*/}
          {/*            </button>*/}
          {/*          </div>*/}
          {/*        </td>*/}
          {/*      </tr>*/}
          {/*    ))}*/}
          {/*    </tbody>*/}
          {/*  </table>*/}
          {/*</div>*/}
        </>
      )}

      {accessUser && (
        <UserAccessDrawer user={accessUser} onClose={() => setAccessUser(null)}/>
      )}

      {deleteUser && (
        <ConfirmDialog
          title="Benutzer löschen"
          message={`„${deleteUser.username}" inklusive persönlicher Gruppe löschen? Das ist nur möglich, wenn die persönliche Gruppe keine Rezepte/Zutaten/Inventare/Events mehr besitzt.`}
          onConfirm={() => {
            remove.mutate(deleteUser.id)
            setDeleteUser(null)
          }}
          onCancel={() => setDeleteUser(null)}
          pending={remove.isPending}
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------------ groups

function GroupsPanel() {
  return (
    <>
      <SelfGrantCard/>
      <ConnectedGroupsPanel/>
    </>
  )
}

// ------------------------------------------------------------------ system

/** Global configuration: default roles for new members of all groups. */
function SystemPanel() {
  const {t} = useTranslation(['admin', 'common'])
  const {data: roles} = useRoles()
  const defaults = useMemberDefaults()
  const setDefaults = useSetMemberDefaults()
  const [draft, setDraft] = useState<RoleSlug[] | null>(null)

  if (defaults.isPending) return <Spinner/>

  const rolesValue = draft ?? defaults.data?.roles ?? []

  return (
    <>
      <div className={`card ${styles.panel}`}>
        <div className={styles.drawerSection}>
          <h2 className="section-subtitle">
            <ShieldCheck size={16}/> {t('admin:system.memberDefaultsTitle')}
          </h2>
          <p className="muted">{t('admin:system.memberDefaultsHint')}</p>
          <RoleMultiSelect
            roles={roles}
            value={rolesValue}
            onChange={setDraft}
          />
          <p className="muted">
            {t('admin:system.groupsOverriding', {
              count: defaults.data?.groups_overriding ?? 0,
            })}
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={rolesValue.length === 0 || setDefaults.isPending}
            onClick={() => {
              void setDefaults.mutateAsync(rolesValue).then(() => setDraft(null))
            }}
          >
            {t('common:actions.save')}
          </button>
        </div>


      </div>
      <CardSection
        title={t('admin:system.memberDefaultsTitle')}
      >
        <Badge variant={"warning"}>TODO</Badge> allow changes in global permissions
      </CardSection>

    </>
  )
}

// ------------------------------------------------------- admin self-grant

/**
 * Admin-Selbstzuweisung (`PUT /api/admin/me/groups`): Admins halten sich an
 * die Gruppenrollen — sie treten einer Gruppe bei, statt sie global zu
 * übergehen, und handeln danach mit genau diesen Rollen.
 */
function SelfGrantCard() {
  const groups = useGroups()
  const {data: roles} = useRoles()
  const [groupId, setGroupId] = useState<number | ''>('')
  const [rolesValue, setRolesValue] = useState<RoleSlug[]>(['viewer'])
  const selfGrant = useAdminSelfGrant()

  const submit = () => {
    if (typeof groupId !== 'number' || rolesValue.length === 0) return
    selfGrant.mutate({groupId, roles: rolesValue})
  }

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className="section-subtitle">{t('admin:selfGrantTitle')}</h2>
      <p className="muted">{t('admin:selfGrantHint')}</p>
      <div className={styles.toolbar}>
        <select
          className="input"
          value={groupId}
          onChange={(event) =>
            setGroupId(event.target.value === '' ? '' : Number(event.target.value))
          }
        >
          <option value="">{t('common:transfer.chooseGroup')}</option>
          {(groups.data ?? []).map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
              {group.is_personal ? ' (persönlich)' : ''}
            </option>
          ))}
        </select>
        <RoleMultiSelect roles={roles} value={rolesValue} onChange={setRolesValue}/>
        <button
          type="button"
          className="btn btn--primary"
          disabled={typeof groupId !== 'number' || rolesValue.length === 0 || selfGrant.isPending}
          onClick={submit}
        >
          {t('admin:selfGrantButton')}
        </button>
      </div>
      {selfGrant.isSuccess && (
        <p className="muted">{t('admin:selfGrantDone')}</p>
      )}
    </div>
  )
}

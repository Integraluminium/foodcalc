import {Sliders, User, Users} from 'lucide-react'
import {type FormEvent, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {ApiError, type GroupRole} from "../../api";
import {CardSection} from '../../components/patterns/card_section/CardSection.tsx'
import {Badge} from '../../components/ui/badge/Badge.tsx'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useGroups} from "../../hooks/queries/useMasterData.ts";
import {useGroupAdminMutations, useGroupMembers, useUserAdminMutations} from "../../hooks/queries/useUsers.ts";
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {usePermissions} from "../../hooks/usePermissions.ts";
import {GroupMasterDetail} from './groups/GroupMasterDetail.tsx'
import {DataSettingsRenderer} from './settings/DataSettingsRenderer.tsx'
import {SettingsShell} from "./settings/settings_shell/SettingsShell.tsx";
import {getSectionsByScope, type SettingsContext,} from './settings/settingsRegistry.ts'
import styles from './SettingsPage.module.css'

type SettingsTab = 'account' | 'preferences' | 'groups'

const STORAGE_KEY = 'foodcalc:user-settings'

function useUserSettingsState() {
  const { i18n } = useTranslation()
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      return {
        language: i18n.resolvedLanguage?.startsWith('en') ? 'en_US' : 'de_DE',
        ...stored,
      }
    } catch {
      return { language: 'de_DE' }
    }
  })

  const updateSetting = (key: string, value: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })

    // Real side effects for settings that affect global runtime behavior
    if (key === 'language' && typeof value === 'string') {
      value = value.startsWith('en') ? 'en_US' : 'de_DE'
      console.log('Changing language to', value)
      void i18n.changeLanguage(value)
      document.documentElement.lang = value.slice(0, 2)
      localStorage.setItem('lang', value)
    }
  }

  return { values, updateSetting }
}

export default function SettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const { data: user } = useCurrentUser()
  const [tab, setTab] = useState<SettingsTab>('account')
  const { values, updateSetting } = useUserSettingsState()

  const ctx: SettingsContext = {
    isSystemAdmin: Boolean(user?.is_admin),
    canManageGroup: true, // TODO: implement proper group management check if needed
  }

  // Note: make sure the language field options in settingsRegistry.ts use 'de_DE' and 'en_US'
  const userSections = getSectionsByScope('user', ctx)
  // const userSections = getSectionsByScope('system', ctx)

  let navigationConfig = [
    {
      id: 'account',
      label: t('settings:tabs.account'),
      icon: User,
    },
    {
      id: 'preferences',
      label: t('settings:tabs.preferences'),
      icon: Sliders,
    },
    {
      id: 'groups',
      label: t('settings:tabs.groups'),
      icon: Users,
    },
  ];


  return (
    <SettingsShell
      title={t('settings:title')}
      activeId={tab}
      onSelect={(id) => setTab(id as SettingsTab)}
      items={navigationConfig}
    >
      {tab === 'account' && <AccountPanel />}

      {tab === 'preferences' && (
        <DataSettingsRenderer
          sections={userSections}
          values={values}
          onChange={updateSetting}
          context={ctx}
        />
      )}

      {tab === 'groups' && <ConnectedGroupsPanel />}
    </SettingsShell>
  )
}

/** Connects GroupMasterDetail to your real TanStack Query hooks (reusable in AdminPage too). */
export function ConnectedGroupsPanel() {
  const { isAdmin, canManageGroup } = usePermissions()
  const groups = useGroups()
  const { createGroup, removeGroup, addMember, removeMember, setMemberRole } =
    useGroupAdminMutations()

  const teamGroups = (groups.data ?? []).filter((g) => !g.is_personal)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const activeGroupId =
    teamGroups.find((g) => g.id === selectedGroupId)?.id ?? teamGroups[0]?.id ?? 0

  const members = useGroupMembers(activeGroupId)

  return (
    <GroupMasterDetail
      groups={teamGroups}
      groupsPending={groups.isPending}
      selectedGroupId={activeGroupId || null}
      onSelectGroup={setSelectedGroupId}
      members={members.data ?? []}
      membersPending={members.isPending}
      isSystemAdmin={isAdmin}
      canManageGroup={canManageGroup}
      onCreateGroup={async (name) => {
        const created = await createGroup.mutateAsync(name)
        setSelectedGroupId(created.id)
      }}
      onAddMember={async (groupId, identifier, role) => {
        const added = await addMember.mutateAsync({ groupId, user: identifier })
        if (added?.id && role !== added.role) {
          await setMemberRole.mutateAsync({ groupId, userId: added.id, role })
        }
      }}
      onChangeMemberRole={async (groupId, userId, role: GroupRole) => {
        await setMemberRole.mutateAsync({ groupId, userId, role })
      }}
      onRemoveMember={async (groupId, userId) => {
        await removeMember.mutateAsync({ groupId, userId })
      }}
      onDeleteGroup={async (groupId) => {
        await removeGroup.mutateAsync(groupId)
        setSelectedGroupId(null)
      }}
    />
  )
}

function AccountPanel() {
  const { t } = useTranslation(['settings', 'common'])
  const { data: user } = useCurrentUser()
  const [savedPassword, setSavedPassword] = useState(false)

  if (!user) {
    return <Spinner />
  }

  return (
    <>
      <CardSection
        title="Profil"
        actions={
          <>
            <Badge variant={user.is_admin ? 'info' : 'neutral'}>
              {user.is_admin ? 'Administrator' : 'Mitglied'}
            </Badge>
            <LanguageSwitcher />
          </>
        }
      >
        <div className={styles.meta}>
          <span className={styles.field}>
            Benutzername: <strong>{user.username}</strong>
          </span>
          <span className={styles.field}>
            E-Mail: <strong>{user.email}</strong>
          </span>
        </div>
      </CardSection>

      {/*<CardSection*/}
      {/*  title={t('settings:rights.myGroups')}*/}
      {/*  subtitle={t('settings:rights.myGroupsHint')}*/}
      {/*>*/}
      {/*  <ul className={styles.meta}>*/}
      {/*    {user.groups.map((group) => (*/}
      {/*      <li key={group.id} className={styles.field}>*/}
      {/*        <strong>{group.name}</strong>*/}
      {/*        {group.is_personal && (*/}
      {/*          <span className="muted">*/}
      {/*            {' '}*/}
      {/*            · {t('settings:rights.rolePersonal')}*/}
      {/*          </span>*/}
      {/*        )}*/}
      {/*        <Badge*/}
      {/*          variant={*/}
      {/*            group.role === 'manager'*/}
      {/*              ? 'success'*/}
      {/*              : group.role === 'editor'*/}
      {/*                ? 'info'*/}
      {/*                : 'neutral'*/}
      {/*          }*/}
      {/*        >*/}
      {/*          {t(`roles.${group.role ?? 'viewer'}`)}*/}
      {/*        </Badge>*/}
      {/*      </li>*/}
      {/*    ))}*/}
      {/*  </ul>*/}
      {/*  <p className="muted">{t('settings:rights.roleLegend')}</p>*/}
      {/*</CardSection>*/}

      <CardSection title={t('settings:password.title')}>
        <PasswordForm userId={user.id} onSaved={() => setSavedPassword(true)} />
        {savedPassword && (
          <p className={styles.success}>{t('settings:password.saved')}</p>
        )}
      </CardSection>
    </>
  )
}

function PasswordForm({
                        userId,
                        onSaved,
                      }: {
  userId: number
  onSaved: () => void
}) {
  const { t } = useTranslation(['settings', "common"])
  const { changePassword } = useUserAdminMutations()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const current = String(data.get('current') ?? '')
    const next = String(data.get('next') ?? '')
    const repeat = String(data.get('repeat') ?? '')
    if (next !== repeat) return
    changePassword.mutate(
      { id: userId, current_password: current, new_password: next },
      {
        onSuccess: () => {
          ;(event.target as HTMLFormElement).reset()
          onSaved()
        },
      },
    )
  }

  const error =
    changePassword.isError && changePassword.error instanceof ApiError
      ? changePassword.error.message
      : changePassword.isError
        ? t('settings:password.failed')
        : null

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className="field">
        {t('settings:password.current')}
        <input className="input" name="current" type="password" required />
      </label>
      <div className="form-row">
        <label className="field">
          {t('settings:password.new')}
          <input
            className="input"
            name="next"
            type="password"
            minLength={8}
            required
          />
        </label>
        <label className="field">
          {t('settings:password.repeat')}
          <input
            className="input"
            name="repeat"
            type="password"
            minLength={8}
            required
          />
        </label>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="submit"
        className="btn btn--primary"
        disabled={changePassword.isPending}
      >
        {changePassword.isPending ? <Spinner size="sm" /> : t('settings:password.submit')}
      </button>
    </form>
  )
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation([])
  const isGerman = i18n.resolvedLanguage?.startsWith('de')

  const toggleLanguage = () => {
    const next = isGerman ? 'en_US' : 'de_DE'
    void i18n.changeLanguage(next)
    document.documentElement.lang = next.slice(0, 2)
    localStorage.setItem('lang', next)
  }

  return (
    <button type="button" onClick={toggleLanguage}>
      {isGerman ? 'English' : 'Deutsch'}
    </button>
  )
}
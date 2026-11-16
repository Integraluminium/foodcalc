import i18n from "i18next";
import type {FormEvent} from 'react'
import {useState} from 'react'
import {useTranslation} from "react-i18next";
import {ApiError} from '../../api'
import {SegmentedControl} from '../../components/ui/segmented_control/SegmentedControl.tsx'
import {Spinner} from '../../components/ui/spinner/Spinner.tsx'
import {useUserAdminMutations} from '../../hooks/queries/useUsers.ts'
import {useCurrentUser} from '../../hooks/useAuth.ts'
import {GroupsSection} from './GroupsSection.tsx'
import styles from './SettingsPage.module.css'

type Tab = 'account' | 'groups'

const TAB_OPTIONS = [
  { value: 'account', label: i18n.t('settings:tabs.account') },
  { value: 'groups', label: i18n.t('settings:tabs.groups') },
] as const

/**
 * Settings hub: own account (profile, password, memberships) and group
 * management. Members can manage the member lists of their groups; admins
 * additionally create/delete groups.
 */
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')
  const { t } = useTranslation(['settings', "common"])

  return (
    <div className={styles.page}>
      <h1 className="section-title">{t('settings:title')}</h1>
      <SegmentedControl
        options={[...TAB_OPTIONS]}
        value={tab}
        onChange={setTab}
        ariaLabel={t('settings:tabs.label')}
      />
      {tab === 'account' ? <AccountPanel /> : <GroupsSection />}
    </div>
  )
}

function AccountPanel() {
  const { t } = useTranslation(['settings', "common"])
  const { data: user } = useCurrentUser()
  const [savedPassword, setSavedPassword] = useState(false)

  if (!user) {
    return (
      <div className={styles.page}>
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">Profil</h2>
        <div className={styles.meta}>
          <span className={styles.field}>
            Benutzername: <strong>{user.username}</strong>
          </span>
          <span className={styles.field}>
            E-Mail: <strong>{user.email}</strong>
          </span>
          <span className={styles.adminBadge}>
            {user.is_admin ? 'Administrator' : 'Mitglied'}
          </span>
        </div>
      </div>

      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">{t('settings:rights.myGroups')}</h2>
        <p className="muted">{t('settings:rights.myGroupsHint')}</p>
        <ul className={styles.meta}>
          {user.groups.map((group) => (
            <li key={group.id} className={styles.field}>
              <strong>{group.name}</strong>
              {group.is_personal && (
                <span className="muted"> · {t('settings:rights.rolePersonal')}</span>
              )}
              <span
                className={`badge ${
                  group.role === 'manager'
                    ? 'badge--success'
                    : group.role === 'editor'
                      ? 'badge--info'
                      : 'badge--neutral'
                }`}
              >
                {t(`roles.${group.role ?? 'viewer'}`)}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">{t('settings:rights.roleLegend')}</p>
      </div>

      <LanguageSwitcher />

      <div className={`card ${styles.card}`}>
        <h2 className="section-subtitle">{t('settings:password.title')}</h2>
        <PasswordForm userId={user.id} onSaved={() => setSavedPassword(true)} />
        {savedPassword && (
          <p className={styles.success}>{t('settings:password.saved')}</p>
        )}
      </div>

      {/*<GroupPanel />*/}
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
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Check, Copy, Trash2} from 'lucide-react'
import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {type APITokenInfo, type CreatedAPIToken, type CreateTokenPayload, usersApi,} from '../../api'
import {CardSection} from '../../components/patterns/card_section/CardSection.tsx'
import {DataTable, type DataTableColumn,} from '../../components/patterns/table/DataTable.tsx'
import {notify} from '../../components/ui/toast/toast.ts'

const API_TOKENS_KEY = ['settings', 'api-tokens'] as const

export function TokenManagement() {
  const { t } = useTranslation(['settings', 'common'])
  const qc = useQueryClient()
  const [tokenCreated, setTokenCreated] = useState<CreatedAPIToken | null>(null)
  const [copied, setCopied] = useState(false)

  const tokensQuery = useQuery({
    queryKey: API_TOKENS_KEY,
    queryFn: () => usersApi.getListOfAPIToken(),
  })

  let payload: CreateTokenPayload = { // TODO: Add a form to set the name and expiration date of the token
    name: `Token ${new Date().toLocaleString()}`
  };

  const createMutation = useMutation({
    mutationFn: () => usersApi.createNewAPIToken(payload),
    onSuccess: (created) => {
      setTokenCreated(created)
      setCopied(false)
      void qc.invalidateQueries({ queryKey: API_TOKENS_KEY })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteAPIToken(id),
    onSuccess: () => {
      notify('success', t('settings:apiTokens.deleted', 'Token widerrufen'))
      void qc.invalidateQueries({ queryKey: API_TOKENS_KEY })
    },
  })

  const handleCopy = async () => {
    if (!tokenCreated) return
    await navigator.clipboard.writeText(tokenCreated.token)
    setCopied(true)
  }

  const columns: DataTableColumn<APITokenInfo>[] = [
    {
      key: 'name',
      label: t('settings:apiTokens.name'),
      render: (row) => <strong>{row.name}</strong>,
    },
    {
      key: 'created',
      label: t('settings:apiTokens.created'),
      render: (row) => new Date(row.created_at).toLocaleDateString('de-DE'),
    },
    {
      key: 'expires',
      label: t('settings:apiTokens.expires'),
      render: (row) =>
        row.expires_at ? new Date(row.expires_at).toLocaleDateString('de-DE') : '–',
    },
    {
      key: 'actions',
      label: t('settings:apiTokens.actions'),
      align: 'num',
      render: (row) => (
        <button
          type="button"
          className="icon-btn"
          title={t('settings:apiTokens.revoke', 'Widerrufen')}
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate("" + row.id)}
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ]

  return (
    <CardSection
      title={t('settings:apiTokens.title')}
      actions={
        <button
          type="button"
          className="btn btn--primary"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {t('settings:apiTokens.create')}
        </button>
      }
    >
      <DataTable
        columns={columns}
        rows={tokensQuery.data}
        getRowKey={(row) => row.id}
        isPending={tokensQuery.isPending}
        isError={tokensQuery.isError}
        error={tokensQuery.error}
        errorNoun={t('settings:apiTokens.title')}
        emptyMessage={t('settings:apiTokens.empty')}
      />

      {tokenCreated && (
        <div style={{ marginTop: '1rem' }}>
          <p>
            {t(
              'settings:apiTokens.createdHint',
              'Neuer Token erstellt (wird nur einmal angezeigt):',
            )}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <code>{tokenCreated.token}</code>
            <button type="button" className="btn" onClick={() => void handleCopy()}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      )}
    </CardSection>
  )
}
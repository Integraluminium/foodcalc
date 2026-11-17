import {useTranslation} from 'react-i18next'
import {CardSection} from "../../../components/patterns/card_section/CardSection.tsx";
import styles from './DataSettingsRenderer.module.css'
import type {SettingFieldDef, SettingsContext, SettingsSectionDef,} from './settingsRegistry.ts'

export function DataSettingsRenderer({
                                       sections,
                                       values,
                                       onChange,
                                       context,
                                       search = '',
                                       readOnly = false,
                                     }: {
  sections: SettingsSectionDef[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  context: SettingsContext
  search?: string
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const query = search.trim().toLowerCase()

  const filteredSections = sections
    .filter((section) => !section.isVisible || section.isVisible(context))
    .map((section) => {
      if (!query) return section
      const titleMatch = t(section.titleKey, section.fallbackTitle)
        .toLowerCase()
        .includes(query)
      if (titleMatch) return section

      const matchingFields = section.fields.filter((f) => {
        const label = t(f.labelKey, f.fallbackLabel).toLowerCase()
        const hint =
          'hintKey' in f && f.hintKey
            ? t(f.hintKey, f.fallbackHint ?? '').toLowerCase()
            : ''
        return label.includes(query) || hint.includes(query)
      })
      return { ...section, fields: matchingFields }
    })
    .filter((section) => section.fields.length > 0)

  if (filteredSections.length === 0) {
    return (
      <CardSection>
        <p className="muted">
          {t('common:search.noResults', 'Keine passenden Einstellungen gefunden.')}
        </p>
      </CardSection>
    )
  }

  return (
    <div className={styles.stack}>
      {filteredSections.map((section) => (
        <CardSection
          key={section.id}
          title={t(section.titleKey, section.fallbackTitle)}
          subtitle={
            section.subtitleKey
              ? t(section.subtitleKey, section.fallbackSubtitle ?? '')
              : undefined
          }
        >
          <div className="form-stack">
            {section.fields.map((field) => (
              <SettingFieldRow
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(next) => onChange(field.key, next)}
                context={context}
                readOnly={readOnly}
              />
            ))}
          </div>
        </CardSection>
      ))}
    </div>
  )
}

function SettingFieldRow({
                           field,
                           value,
                           onChange,
                           context,
                           readOnly,
                         }: {
  field: SettingFieldDef
  value: unknown
  onChange: (value: unknown) => void
  context: SettingsContext
  readOnly: boolean
}) {
  const { t } = useTranslation()

  if (field.kind === 'custom') {
    return <>{field.render(context)}</>
  }

  if (field.kind === 'toggle') {
    const checked = typeof value === 'boolean' ? value : field.defaultValue
    return (
      <label className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleLabel}>
            {t(field.labelKey, field.fallbackLabel)}
          </span>
          {field.hintKey && (
            <span className="muted">
              {t(field.hintKey, field.fallbackHint ?? '')}
            </span>
          )}
        </div>
        <input
          type="checkbox"
          className={styles.switch}
          checked={checked}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    )
  }

  return (
    <label className="field">
      <span>{t(field.labelKey, field.fallbackLabel)}</span>
      {field.kind === 'select' && (
        <select
          className="input"
          value={String(value ?? field.defaultValue)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey, opt.fallbackLabel)}
            </option>
          ))}
        </select>
      )}
      {field.kind === 'number' && (
        <div className={styles.numberWrap}>
          <input
            type="number"
            className="input"
            value={Number(value ?? field.defaultValue)}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={readOnly}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {field.unit && <span className={styles.unitBadge}>{field.unit}</span>}
        </div>
      )}
      {field.kind === 'text' && (
        <input
          type="text"
          className="input"
          value={String(value ?? field.defaultValue)}
          placeholder={field.placeholder}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.hintKey && (
        <span className="muted">
          {t(field.hintKey, field.fallbackHint ?? '')}
        </span>
      )}
    </label>
  )
}
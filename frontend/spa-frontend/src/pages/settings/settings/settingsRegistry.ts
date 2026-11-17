import type {LucideIcon} from 'lucide-react'
import {Globe, Scale, Shield, Sliders} from 'lucide-react'
import type {ReactNode} from 'react'

export type SettingScope = 'user' | 'group' | 'system'

export interface SettingsContext {
  isSystemAdmin: boolean
  canManageGroup: boolean
  groupId?: number
}

export type SettingFieldDef =
  | {
  kind: 'toggle'
  key: string
  labelKey: string
  fallbackLabel: string
  hintKey?: string
  fallbackHint?: string
  defaultValue: boolean
}
  | {
  kind: 'select'
  key: string
  labelKey: string
  fallbackLabel: string
  hintKey?: string
  fallbackHint?: string
  options: { value: string; labelKey: string; fallbackLabel: string }[]
  defaultValue: string
}
  | {
  kind: 'number'
  key: string
  labelKey: string
  fallbackLabel: string
  hintKey?: string
  fallbackHint?: string
  unit?: string
  min?: number
  max?: number
  step?: number
  defaultValue: number
}
  | {
  kind: 'text'
  key: string
  labelKey: string
  fallbackLabel: string
  hintKey?: string
  fallbackHint?: string
  placeholder?: string
  defaultValue: string
}
  | {
  /** Escape hatch for custom interactive widgets */
  kind: 'custom'
  key: string
  labelKey: string
  fallbackLabel: string
  render: (ctx: SettingsContext) => ReactNode
}

export interface SettingsSectionDef {
  id: string
  scope: SettingScope
  titleKey: string
  fallbackTitle: string
  subtitleKey?: string
  fallbackSubtitle?: string
  icon: LucideIcon
  isVisible?: (ctx: SettingsContext) => boolean
  fields: SettingFieldDef[]
}

export const SETTINGS_REGISTRY: SettingsSectionDef[] = [
  // ── User Scope ──────────────────────────────────────────────
  {
    id: 'general',
    scope: 'user',
    titleKey: 'settings:sections.general',
    fallbackTitle: 'Allgemein & Darstellung',
    subtitleKey: 'settings:sections.generalHint',
    fallbackSubtitle: 'Sprache und persönliche Oberflächen-Optionen.',
    icon: Globe,
    fields: [
      {
        kind: 'select',
        key: 'language',
        labelKey: 'settings:fields.language',
        fallbackLabel: 'Sprache',
        defaultValue: 'de',
        options: [
          { value: 'de', labelKey: 'common:lang.de', fallbackLabel: 'Deutsch' },
          { value: 'en', labelKey: 'common:lang.en', fallbackLabel: 'English' },
        ],
      },
      {
        kind: 'toggle',
        key: 'compactTables',
        labelKey: 'settings:fields.compactTables',
        fallbackLabel: 'Kompakte Tabellenansicht',
        hintKey: 'settings:fields.compactTablesHint',
        fallbackHint: 'Reduziert Zeilenabstände in Rezept-, Zutaten- und Planungslisten.',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'planning',
    scope: 'user',
    titleKey: 'settings:sections.planning',
    fallbackTitle: 'Planung & Standardwerte',
    subtitleKey: 'settings:sections.planningHint',
    fallbackSubtitle: 'Voreinstellungen für neue Events und Mahlzeiten.',
    icon: Scale,
    fields: [
      {
        kind: 'number',
        key: 'defaultEnergyKj',
        labelKey: 'settings:fields.defaultEnergy',
        fallbackLabel: 'Standard-Tagesenergie pro Person',
        hintKey: 'settings:fields.defaultEnergyHint',
        fallbackHint: 'Wird beim Anlegen neuer Personengruppen vorausgefüllt.',
        unit: 'kJ',
        min: 1000,
        max: 25000,
        step: 100,
        defaultValue: 8500,
      },
      {
        kind: 'number',
        key: 'shoppingBufferPercent',
        labelKey: 'settings:fields.shoppingBuffer',
        fallbackLabel: 'Einkaufs-Puffer',
        hintKey: 'settings:fields.shoppingBufferHint',
        fallbackHint: 'Prozentualer Aufschlag auf berechnete Einkaufsmengen.',
        unit: '%',
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 5,
      },
    ],
  },

  // ── Group Scope (rendered inside GroupMasterDetail) ─────────
  {
    id: 'groupDefaults',
    scope: 'group',
    titleKey: 'groups:sections.defaults',
    fallbackTitle: 'Gruppen-Standardwerte',
    subtitleKey: 'groups:sections.defaultsHint',
    fallbackSubtitle: 'Gelten für alle Rezepte und Events dieser Gruppe.',
    icon: Sliders,
    fields: [
      {
        kind: 'toggle',
        key: 'shareRecipesWithAllUsers',
        labelKey: 'groups:fields.publicRecipes',
        fallbackLabel: 'Rezepte gruppenübergreifend lesbar',
        hintKey: 'groups:fields.publicRecipesHint',
        fallbackHint: 'Erlaubt anderen angemeldeten Nutzern, Rezepte dieser Gruppe einzusehen.',
        defaultValue: false,
      },
      {
        kind: 'number',
        key: 'groupEnergyKj',
        labelKey: 'groups:fields.defaultEnergy',
        fallbackLabel: 'Gruppen-Standardenergie',
        unit: 'kJ',
        min: 1000,
        max: 25000,
        step: 100,
        defaultValue: 8500,
      },
    ],
  },

  // ── System Scope (Admin) ────────────────────────────────────
  {
    id: 'systemSecurity',
    scope: 'system',
    titleKey: 'admin:sections.security',
    fallbackTitle: 'System & Registrierung',
    subtitleKey: 'admin:sections.securityHint',
    fallbackSubtitle: 'Globale Regeln für Gruppen und neue Benutzerkonten.',
    icon: Shield,
    isVisible: (ctx) => ctx.isSystemAdmin,
    fields: [
      {
        kind: 'toggle',
        key: 'allowSelfGroupCreation',
        labelKey: 'admin:fields.allowGroupCreation',
        fallbackLabel: 'Benutzer dürfen eigene Gruppen erstellen',
        hintKey: 'admin:fields.allowGroupCreationHint',
        fallbackHint: 'Wenn deaktiviert, können nur System-Admins neue Gruppen anlegen.',
        defaultValue: true,
      },
      {
        kind: 'select',
        key: 'defaultNewUserRole',
        labelKey: 'admin:fields.defaultRole',
        fallbackLabel: 'Standardrolle bei Gruppeneinladung',
        defaultValue: 'member',
        options: [
          { value: 'viewer', labelKey: 'roles:viewer', fallbackLabel: 'Leser (nur Ansicht)' },
          { value: 'member', labelKey: 'roles:member', fallbackLabel: 'Mitglied (Bearbeiten)' },
        ],
      },
    ],
  },
]

export function getSectionsByScope(
  scope: SettingScope,
  ctx: SettingsContext,
  sectionId?: string,
): SettingsSectionDef[] {
  return SETTINGS_REGISTRY.filter(
    (s) =>
      s.scope === scope &&
      (!sectionId || s.id === sectionId) &&
      (!s.isVisible || s.isVisible(ctx)),
  )
}
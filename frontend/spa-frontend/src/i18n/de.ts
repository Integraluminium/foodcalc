/**
 * Zentrale deutsche UI-Texte. Komponenten lesen Beschriftungen ausschließlich
 * über `t('key')` aus diesem Wörterbuch — das garantiert eine konsistente
 * Sprache und macht spätere i18n trivial (z. B. `en.ts` mit identischen
 * Keys + Locale-Umschalter), ohne eine einzige Komponente anzufassen.
 *
 * Konvention: Keys als `bereich.zweck` (z. B. `nav.recipes`, `state.loading`).
 * Interpolation mit `{name}`-Platzhaltern.
 */
export const STRINGS = {
  // Navigation / Shell
  'nav.ingredients': 'Zutaten',
  'nav.recipes': 'Rezepte',
  'nav.events': 'Events',
  'nav.inventories': 'Inventare',
  'shell.activeGroup': 'Aktive Gruppe',
  'shell.activeGroupHint': 'Steuert Besitz und Sichtbarkeit',
  'shell.userMenu': 'Benutzermenü',
  'shell.profileSettings': 'Profil & Einstellungen',
  'shell.admin': 'Verwaltung',
  'shell.logout': 'Abmelden',

  // Zustände (Hub-Listen)
  'state.loading': 'Wird geladen…',
  'state.error': 'Laden fehlgeschlagen',

  // Häufige Aktionen
  'action.close': 'Schließen',
  'action.cancel': 'Abbrechen',
  'action.save': 'Speichern',
  'action.create': 'Anlegen',
  'action.delete': 'Löschen',
  'action.edit': 'Bearbeiten',

  // Status-Vokabular der Event-Zutaten (By Meal / Combined / By Source)
  'status.available': 'Verfügbar',
  'status.planned': 'Geplant',
  'status.missing': 'Fehlt',
  'status.unknown': 'Unbekannt',
} as const

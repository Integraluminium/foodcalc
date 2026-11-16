import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

type NamespaceDict = Record<string, unknown>
type LocaleResources = Record<string, Record<string, NamespaceDict>>

const modules = import.meta.glob<{ default: NamespaceDict }>(
  '../public/locales/*/*.json',
  { eager: true },
)

export const resources: LocaleResources = {}

for (const [path, mod] of Object.entries(modules)) {
  // Matches "../public/locales/<locale>/<namespace>.json"
  const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const [, locale, namespace] = match
  resources[locale] ??= {}
  resources[locale][namespace] = mod.default
}

const stored = localStorage.getItem('lang')
const initialLang =
  stored === 'en' || stored === 'en_US' ? 'en_US' : 'de_DE'

void i18n.use(initReactI18next).init({
  lng: initialLang,
  fallbackLng: 'de_DE',
  defaultNS: 'common',
  fallbackNS: 'common',
  debug: import.meta.env.DEV,
  resources,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
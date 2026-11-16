import type admin from '../../public/locales/de_DE/admin.json'
import type auth from '../../public/locales/de_DE/auth.json'
import type common from '../../public/locales/de_DE/common.json'
import type documents from '../../public/locales/de_DE/documents.json'
import type events from '../../public/locales/de_DE/events.json'
import type ingredients from '../../public/locales/de_DE/ingredients.json'
import type inventories from '../../public/locales/de_DE/inventories.json'
import type nav from '../../public/locales/de_DE/nav.json'
import type recipes from '../../public/locales/de_DE/recipes.json'
import type settings from '../../public/locales/de_DE/settings.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    fallbackNS: 'common'
    resources: {
      admin: typeof admin
      auth: typeof auth
      common: typeof common
      documents: typeof documents
      events: typeof events
      ingredients: typeof ingredients
      inventories: typeof inventories
      nav: typeof nav
      recipes: typeof recipes
      settings: typeof settings
    }
  }
}
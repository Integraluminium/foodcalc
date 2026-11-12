/**
 * Zentrale deutsche UI-Texte. Komponenten lesen Beschriftungen ausschließlich
 * über `t('bereich.zweck')` aus diesem Wörterbuch.
 *
 * Struktur: verschachtelte Objekte, Zugriff per Pfad (z. B. `plan.col.time`).
 * Interpolation mit `{name}`-Platzhaltern.
 * Für i18n: `en.ts` mit identischer Struktur anlegen und `DE` über einen Locale-Umschalter ersetzen.
 */

export const DE = {
  nav: {
    ingredients: 'Zutaten',
    recipes: 'Rezepte',
    events: 'Events',
    inventories: 'Inventare',
    documents: 'allg. Dokumente',
  },

  shell: {
    activeGroup: 'Aktive Gruppe',
    activeGroupHint: 'Steuert Besitz und Sichtbarkeit',
    userMenu: 'Benutzermenü',
    profileSettings: 'Profil & Einstellungen',
    admin: 'Verwaltung',
    logout: 'Abmelden',
  },

  state: {
    loading: 'Wird geladen…',
    error: 'Laden fehlgeschlagen',
  },

  action: {
    close: 'Schließen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    create: 'Anlegen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
  },

  status: {
    available: 'Verfügbar',
    planned: 'Geplant',
    missing: 'Fehlt',
    unknown: 'Unbekannt',
  },

  event: {
    tab: {
      overview: 'Übersicht',
      plan: 'Speiseplan',
      shopping: 'Einkäufe & Logistik',
      calc: 'Kalkulation',
      timeline: 'Zeitplan',
    },
    areas: 'Event-Bereiche',
  },

  workspace: {
    invalidId: 'Ungültige Event-ID.',
    backToList: 'Zurück zur Liste',
    loadError: 'Event konnte nicht geladen werden: {error}',
    mealsBadge: '{count} Mahlzeiten',
  },

  overview: {
    frame: 'Rahmen',
    period: 'Zeitraum',
    meals: 'Mahlzeiten',
    portions: 'Portionen',
    cookingAmount: 'Kochmenge',
    cost: 'Kosten',
    comment: 'Kommentar',
    groupFallback: 'Gruppe {id}',
    linkedInventories: 'Gekoppelte Inventare',
    linkedInventoriesHint: 'Verwaltung im Tab „Einkäufe & Logistik“',
    noInventories: 'Keine — Bestände decken dann nichts ab.',
    actions: 'Aktionen',
    clone: 'Klonen (Vorlage für neues Event)',
    cloneHint: 'Kopiert Mahlzeiten, Touren und Overrides als Vorlage',
    exports: 'Exporte',
    exportsHint:
      'PDFs mit allen geplanten Mengen; Einzel-PDFs einer Mahlzeit im Speiseplan-Drawer, Touren-Listen im Einkäufe-Tab.',
    exportOverview: 'Event-Übersicht (PDF)',
    exportOverviewHint:
      'Management-Übersicht: Rahmen, Mahlzeiten, Touren, Vorkochen',
    exportRecipes: 'Rezepte-PDF (alle Mahlzeiten)',
    exportAllergens: 'Allergenliste',
    exportLabels: 'Gerichte-Labels (Zeltkarten)',
    deleteTitle: 'Event löschen',
    deleteMessage:
      '„{name}“ inklusive Mahlzeitenplanung und Einkaufstouren wirklich löschen?',
    budget: 'Budget (€)',
    name: 'Name',
  },

  plan: {
    addMeal: '+ Mahlzeit planen',
    summary: '{meals} Mahlzeiten · {cost} € eingekauft',
    empty: 'Noch keine Mahlzeiten geplant — oben rechts hinzufügen.',
    dayTotals: '{portions} Portionen · {weight} kg · {cost} €',
    col: {
      time: 'Zeit',
      dish: 'Gericht',
      place: 'Ort',
      servings: 'Portionen',
      kjPerPortion: 'kJ / Portion',
      weight: 'Gewicht',
      costPerPortion: '€ / Portion',
      cost: 'Kosten',
    },
    duplicate: 'Duplizieren',
    removeFromPlan: 'Aus dem Plan entfernen',
    notWeighedHint: 'Rezept ist nicht eingewogen — Mengen können abweichen',
  },

  mealDrawer: {
    edit: 'Mahlzeit bearbeiten',
    plan: 'Mahlzeit planen',
    save: 'Speichern',
    recipe: 'Rezept',
    chooseRecipe: 'Rezept wählen…',
    componentSuffix: ' (Komponente)',
    servings: 'Portionen',
    energyPerPortion: 'Energie / Portion (kJ)',
    time: 'Zeitpunkt',
    place: 'Ort',
    comment: 'Kommentar',
    optional: 'optional',
    calc: 'Kalkulation',
    energy: 'Energie',
    cookAmount: 'Kochmenge',
    density: 'Dichte',
    noDensity:
      'Keine Energie-Dichte berechenbar — Zutaten/Energiewerte im Rezept prüfen.',
    calcHint: 'Die Kochmenge wird über die Energie-Dichte des Rezepts skaliert.',
    recipeOverview: 'Rezept-Überblick',
    weighed: 'Eingewogen ✓',
    notWeighed: 'Nicht eingewogen ~',
    weighedHint: 'Alle Mengen wurden eingewogen',
    notWeighedHint: 'Nicht eingewogen — Mengen können abweichen',
    noIngredients: 'Noch keine Zutaten hinterlegt.',
    treeError: 'Baum konnte nicht geladen werden: {error}',
    export: 'Export',
    exportHint:
      'Kochanweisung, auf die geplante Menge skaliert. Basis-PDF: am Rezept · Sammel-Exporte: Übersicht-Tab.',
    exportMealPdf: 'Mahlzeit-PDF (skaliert)',
    exportMealPdfHint:
      'Kochanweisung, vom Server auf die geplante Menge skaliert',
  },

  shopping: {
    summary: '{tours} Touren · {uncovered} Zutaten ohne Tour',
    loading: 'Einkaufsliste wird geladen…',
    addTour: '+ Tour anlegen',
    empty:
      'Keine Einkäufe nötig (oder die Rezepte haben keine quellenbezogenen Zutaten).',
    loadError: 'Einkaufsliste konnte nicht geladen werden: {error}',
    toursHeading: 'Einkaufstouren',
    toursHint:
      'Pro Tour die Zutaten mit passendem „besorgen bis“-Zeitfenster; ⤓ lädt die Liste als Text.',
    withoutTour: 'Ohne Tour',
    withoutTourHint:
      'Zutaten, deren Händler-Store noch keine Tour im passenden Zeitfenster hat.',
    statusMissing: 'Fehlt',
    col: {
      ingredient: 'Zutat',
      amount: 'Menge',
      store: 'Store',
      category: 'Kategorie',
      price: 'Preis',
    },
    noItems: 'Keine Zutaten in diesem Zeitfenster.',
    removeTour: 'Tour entfernen',
    tourForm: {
      title: 'Einkaufstour anlegen',
      store: 'Händler / Store',
      date: 'Datum',
      hint:
        'Zutaten dieses Stores mit passendem „besorgen bis“-Zeitfenster landen automatisch auf der Tour.',
      submit: 'Anlegen',
    },
    downloadList: 'Liste als Text herunterladen',
    completed: 'Erledigt',
    completedHint:
      'Abgeschlossene Touren sind gesperrt (✓ markieren, 🔓 wieder öffnen). Zutaten lassen sich hier zuordnen oder entfernen.',
    markCompleted: 'Tour als erledigt markieren (sperrt sie)',
    reopen: 'Tour wieder öffnen',
    unassignItem: 'Zuordnung aufheben (fällt zurück auf automatisch)',
    addItem: 'Zutat hinzufügen…',
    addItemHint:
      'Zugeordnete Zutaten landen garantiert auf dieser Tour — auch ohne Händler-Fit (z. B. Privat, Genesis).',
    preset: {
      relevant: 'Passende vorauswählen',
      none: 'Keine',
      all: 'Alle',
      aria: 'Vorauswahl der Zutaten',
      noUncovered:
        'Alle Zutaten sind bereits zugeordnet — die Tour wird leer angelegt.',
      relevantHint: 'Store passt zu dieser Tour (automatisch zuordenbar)',
      manualHint:
        'Wird dieser Tour fest zugeordnet (manuell, unabhängig vom Store)',
    },
  },

  eventInventory: {
    heading: 'Inventare',
    hint:
      'Bestände, die für dieses Event eingeplant werden — die Tabelle zeigt pro Zutat, was abgedeckt ist und was noch gekauft werden muss.',
    unlink: 'Inventar vom Event abkoppeln',
    noneLinked: 'Noch keine Inventare gekoppelt.',
    link: 'Inventar koppeln…',
    coveragePending: 'Abdeckung wird berechnet…',
    coverageError: 'Abdeckung konnte nicht geladen werden: {error}',
    nothingToCover: 'Keine Zutaten im Speiseplan — es gibt nichts abzudecken.',
    col: {
      ingredient: 'Zutat',
      demand: 'Bedarf',
      covered: 'Abgedeckt',
      missing: 'Fehlt',
    },
  },

  overrides: {
    heading: 'Source-Overrides',
    hint:
      'Zutaten, die für dieses Event von einer bestimmten Quelle bezogen werden (z. B. privater Bestand, anderer Händler).',
    chooseIngredient: 'Zutat wählen…',
    chooseSource: 'Quelle überschreiben mit…',
    none:
      'Keine Overrides gesetzt — alle Zutaten laufen über ihre Standardquellen.',
    col: {
      ingredient: 'Zutat',
      source: 'Quelle (Store)',
    },
    remove: 'Override entfernen',
    storeFallback: 'Store {id}',
  },

  calc: {
    heading: 'Kennzahlen',
    hint: 'Abgeleitet aus Speiseplan, Touren und Inventar-Abdeckung.',
    costTotal: 'Kosten gesamt',
    costPerPerson: '€ / Person',
    energyPerPerson: 'Energie / Person',
    energyPerPersonHint:
      'Summe der kJ/Portion-Werte über alle Mahlzeiten (Richtwert 8.500–10.500 kJ/Tag).',
    costPerMeal: 'Kosten je Mahlzeit',
    costPerTour: 'Kosten je Tour',
    col: {
      meal: 'Mahlzeit',
      servings: 'Portionen',
      total: 'Summe',
      tour: 'Tour',
      positions: 'Positionen',
    },
    noShopping: 'Keine Einkäufe nötig.',
    tourSum: 'Summe Touren',
    coverage: 'Abdeckung durch Inventare',
    covered: 'Gedeckt',
    demand: 'Bedarf',
    fromStock: 'Aus Bestand',
    toBuy: 'Zu kaufen',
    noDemand:
      'Keine Bedarfspositionen (Inventare koppeln und Speiseplan füllen).',
    noPrices: 'keine Preise',
    unassigned: 'Nicht zugeordnet',
  },

  timeline: {
    kind: {
      meal: 'Essen',
      tour: 'Einkauf',
      prep: 'Vorkochen',
    },
    hint:
      'Kategorie in der Legende anklicken zum Ein-/Ausblenden. Mahlzeiten und Touren ziehen (30-Minuten-Raster, über Tagesgrenzen hinweg); Mahlzeiten an der rechten Kante in der Endzeit ziehen. Vorkochen ist read-only, bis das REST-API Preps-CRUD erhält.',
    empty: 'Noch keine Termine: Mahlzeiten, Touren oder Vorkochen anlegen.',
    loadError: 'Zeitplan konnte nicht geladen werden: {error}',
    today: 'Heute',
    moveFailed: 'Verschieben fehlgeschlagen — Zeitplan wird neu geladen.',
  },

  recipe: {
    kind: {
      meal: 'Gericht',
      component: 'Komponente',
    },
    pdf: 'Rezept-PDF',
    pdfHint: 'Kochanweisung als PDF (Basis-Mengen)',
    totalWeight: 'Gesamtgewicht',
    totalEnergy: 'Energie gesamt',
    energyDensity: 'Energie-Dichte',
    tree: 'Rezept-Baum',
    steps: 'Arbeitsschritte',
    noSteps: 'Keine Arbeitsschritte hinterlegt.',
    properties: 'Eigenschaften & Allergene',
    deleteTitle: 'Rezept löschen',
    clone: 'Klonen',
    deleteMessage: '„{name}“ und alle zugehörigen Rezeptdaten wirklich löschen?',
  },
} as const
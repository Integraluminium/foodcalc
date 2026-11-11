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
    'nav.documents': 'allg. Dokumente',
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

  // Event-Workspace
  'event.tab.overview': 'Übersicht',
  'event.tab.plan': 'Speiseplan',
  'event.tab.shopping': 'Einkäufe & Logistik',
  'event.tab.calc': 'Kalkulation',
  'event.tab.timeline': 'Zeitplan',
  'event.areas': 'Event-Bereiche',
  'workspace.invalidId': 'Ungültige Event-ID.',
  'workspace.backToList': 'Zurück zur Liste',
  'workspace.loadError': 'Event konnte nicht geladen werden: {error}',
  'workspace.mealsBadge': '{count} Mahlzeiten',

  // Übersicht-Tab
  'overview.frame': 'Rahmen',
  'overview.period': 'Zeitraum',
  'overview.meals': 'Mahlzeiten',
  'overview.portions': 'Portionen',
  'overview.cookingAmount': 'Kochmenge',
  'overview.cost': 'Kosten',
  'overview.comment': 'Kommentar',
  'overview.groupFallback': 'Gruppe {id}',
  'overview.linkedInventories': 'Gekoppelte Inventare',
  'overview.linkedInventoriesHint': 'Verwaltung im Tab „Einkäufe & Logistik“',
  'overview.noInventories': 'Keine — Bestände decken dann nichts ab.',
  'overview.actions': 'Aktionen',
  'overview.clone': 'Klonen (Vorlage für neues Event)',
  'overview.cloneHint': 'Kopiert Mahlzeiten, Touren und Overrides als Vorlage',
  'overview.exports': 'Exporte',
  'overview.exportsHint':
    'PDFs mit allen geplanten Mengen; Einzel-PDFs einer Mahlzeit im Speiseplan-Drawer, Touren-Listen im Einkäufe-Tab.',
  'overview.exportOverview': 'Event-Übersicht (PDF)',
  'overview.exportOverviewHint':
    'Management-Übersicht: Rahmen, Mahlzeiten, Touren, Vorkochen',
  'overview.exportRecipes': 'Rezepte-PDF (alle Mahlzeiten)',
  'overview.exportAllergens': 'Allergenliste',
  'overview.exportLabels': 'Gerichte-Labels (Zeltkarten)',
  'overview.deleteTitle': 'Event löschen',
  'overview.deleteMessage':
    '„{name}“ inklusive Mahlzeitenplanung und Einkaufstouren wirklich löschen?',
  'overview.budget': 'Budget (€)',
  'overview.name': 'Name',

  // Speiseplan
  'plan.addMeal': '+ Mahlzeit planen',
  'plan.summary': '{meals} Mahlzeiten · {cost} € eingekauft',
  'plan.empty': 'Noch keine Mahlzeiten geplant — oben rechts hinzufügen.',
  'plan.dayTotals': '{portions} Portionen · {weight} kg · {cost} €',
  'plan.col.time': 'Zeit',
  'plan.col.dish': 'Gericht',
  'plan.col.place': 'Ort',
  'plan.col.servings': 'Portionen',
  'plan.col.kjPerPortion': 'kJ / Portion',
  'plan.col.weight': 'Gewicht',
  'plan.col.costPerPortion': '€ / Portion',
  'plan.col.cost': 'Kosten',
  'plan.duplicate': 'Duplizieren',
  'plan.removeFromPlan': 'Aus dem Plan entfernen',
  'plan.notWeighedHint': 'Rezept ist nicht eingewogen — Mengen können abweichen',

  // Mahlzeiten-Drawer
  'mealDrawer.edit': 'Mahlzeit bearbeiten',
  'mealDrawer.plan': 'Mahlzeit planen',
  'mealDrawer.save': 'Speichern',
  'mealDrawer.recipe': 'Rezept',
  'mealDrawer.chooseRecipe': 'Rezept wählen…',
  'mealDrawer.componentSuffix': ' (Komponente)',
  'mealDrawer.servings': 'Portionen',
  'mealDrawer.energyPerPortion': 'Energie / Portion (kJ)',
  'mealDrawer.time': 'Zeitpunkt',
  'mealDrawer.place': 'Ort',
  'mealDrawer.comment': 'Kommentar',
  'mealDrawer.optional': 'optional',
  'mealDrawer.calc': 'Kalkulation',
  'mealDrawer.energy': 'Energie',
  'mealDrawer.cookAmount': 'Kochmenge',
  'mealDrawer.density': 'Dichte',
  'mealDrawer.noDensity':
    'Keine Energie-Dichte berechenbar — Zutaten/Energiewerte im Rezept prüfen.',
  'mealDrawer.calcHint':
    'Die Kochmenge wird über die Energie-Dichte des Rezepts skaliert.',
  'mealDrawer.recipeOverview': 'Rezept-Überblick',
  'mealDrawer.weighed': 'Eingewogen ✓',
  'mealDrawer.notWeighed': 'Nicht eingewogen ~',
  'mealDrawer.weighedHint': 'Alle Mengen wurden eingewogen',
  'mealDrawer.notWeighedHint': 'Nicht eingewogen — Mengen können abweichen',
  'mealDrawer.noIngredients': 'Noch keine Zutaten hinterlegt.',
  'mealDrawer.treeError': 'Baum konnte nicht geladen werden: {error}',
  'mealDrawer.export': 'Export',
  'mealDrawer.exportHint':
    'Kochanweisung, auf die geplante Menge skaliert. Basis-PDF: am Rezept · Sammel-Exporte: Übersicht-Tab.',
  'mealDrawer.exportMealPdf': 'Mahlzeit-PDF (skaliert)',
  'mealDrawer.exportMealPdfHint':
    'Kochanweisung, vom Server auf die geplante Menge skaliert',

  // Einkäufe & Logistik
  'shopping.summary': '{tours} Touren · {uncovered} Zutaten ohne Tour',
  'shopping.loading': 'Einkaufsliste wird geladen…',
  'shopping.addTour': '+ Tour anlegen',
  'shopping.empty':
    'Keine Einkäufe nötig (oder die Rezepte haben keine quellenbezogenen Zutaten).',
  'shopping.loadError': 'Einkaufsliste konnte nicht geladen werden: {error}',
  'shopping.toursHeading': 'Einkaufstouren',
  'shopping.toursHint':
    'Pro Tour die Zutaten mit passendem „besorgen bis“-Zeitfenster; ⤓ lädt die Liste als Text.',
  'shopping.withoutTour': 'Ohne Tour',
  'shopping.statusMissing': 'Fehlt',
  'shopping.withoutTourHint':
    'Zutaten, deren Händler-Store noch keine Tour im passenden Zeitfenster hat.',
  'shopping.col.ingredient': 'Zutat',
  'shopping.col.amount': 'Menge',
  'shopping.col.store': 'Store',
  'shopping.col.category': 'Kategorie',
  'shopping.col.price': 'Preis',
  'shopping.noItems': 'Keine Zutaten in diesem Zeitfenster.',
  'shopping.removeTour': 'Tour entfernen',
  'shopping.tourForm.title': 'Einkaufstour anlegen',
  'shopping.tourForm.store': 'Händler / Store',
  'shopping.tourForm.date': 'Datum',
  'shopping.tourForm.hint':
    'Zutaten dieses Stores mit passendem „besorgen bis“-Zeitfenster landen automatisch auf der Tour.',
  'shopping.tourForm.submit': 'Anlegen',
  'shopping.downloadList': 'Liste als Text herunterladen',

  // Inventare-Sektion (Event)
  'eventInventory.heading': 'Inventare',
  'eventInventory.hint':
    'Bestände, die für dieses Event eingeplant werden — die Tabelle zeigt pro Zutat, was abgedeckt ist und was noch gekauft werden muss.',
  'eventInventory.unlink': 'Inventar vom Event abkoppeln',
  'eventInventory.noneLinked': 'Noch keine Inventare gekoppelt.',
  'eventInventory.link': 'Inventar koppeln…',
  'eventInventory.coveragePending': 'Abdeckung wird berechnet…',
  'eventInventory.coverageError': 'Abdeckung konnte nicht geladen werden: {error}',
  'eventInventory.nothingToCover':
    'Keine Zutaten im Speiseplan — es gibt nichts abzudecken.',
  'eventInventory.col.ingredient': 'Zutat',
  'eventInventory.col.demand': 'Bedarf',
  'eventInventory.col.covered': 'Abgedeckt',
  'eventInventory.col.missing': 'Fehlt',

  // Source-Overrides
  'overrides.heading': 'Source-Overrides',
  'overrides.hint':
    'Zutaten, die für dieses Event von einer bestimmten Quelle bezogen werden (z. B. privater Bestand, anderer Händler).',
  'overrides.chooseIngredient': 'Zutat wählen…',
  'overrides.chooseSource': 'Quelle überschreiben mit…',
  'overrides.none':
    'Keine Overrides gesetzt — alle Zutaten laufen über ihre Standardquellen.',
  'overrides.col.ingredient': 'Zutat',
  'overrides.col.source': 'Quelle (Store)',
  'overrides.remove': 'Override entfernen',
  'overrides.storeFallback': 'Store {id}',

  // Kalkulation
  'calc.heading': 'Kennzahlen',
  'calc.hint': 'Abgeleitet aus Speiseplan, Touren und Inventar-Abdeckung.',
  'calc.costTotal': 'Kosten gesamt',
  'calc.costPerPerson': '€ / Person',
  'calc.energyPerPerson': 'Energie / Person',
  'calc.energyPerPersonHint':
    'Summe der kJ/Portion-Werte über alle Mahlzeiten (Richtwert 8.500–10.500 kJ/Tag).',
  'calc.costPerMeal': 'Kosten je Mahlzeit',
  'calc.col.meal': 'Mahlzeit',
  'calc.col.servings': 'Portionen',
  'calc.col.total': 'Summe',
  'calc.costPerTour': 'Kosten je Tour',
  'calc.col.tour': 'Tour',
  'calc.col.positions': 'Positionen',
  'calc.noShopping': 'Keine Einkäufe nötig.',
  'calc.tourSum': 'Summe Touren',
  'calc.coverage': 'Abdeckung durch Inventare',
  'calc.covered': 'Gedeckt',
  'calc.demand': 'Bedarf',
  'calc.fromStock': 'Aus Bestand',
  'calc.toBuy': 'Zu kaufen',
  'calc.noDemand':
    'Keine Bedarfspositionen (Inventare koppeln und Speiseplan füllen).',
  'calc.noPrices': 'keine Preise',
  'calc.unassigned': 'Nicht zugeordnet',

  // Zeitplan
  'timeline.kind.meal': 'Essen',
  'timeline.kind.tour': 'Einkauf',
  'timeline.kind.prep': 'Vorkochen',
  'timeline.hint':
    'Kategorie in der Legende anklicken zum Ein-/Ausblenden. Mahlzeiten und Touren ziehen (30-Minuten-Raster, über Tagesgrenzen hinweg); Mahlzeiten an der rechten Kante in der Endzeit ziehen. Vorkochen ist read-only, bis das REST-API Preps-CRUD erhält.',
  'timeline.empty': 'Noch keine Termine: Mahlzeiten, Touren oder Vorkochen anlegen.',
  'timeline.loadError': 'Zeitplan konnte nicht geladen werden: {error}',
  'timeline.today': 'Heute',
  'timeline.moveFailed': 'Verschieben fehlgeschlagen — Zeitplan wird neu geladen.',

  // Rezept-Ansicht (Drawer + Seite)
  'recipe.kind.meal': 'Gericht',
  'recipe.kind.component': 'Komponente',
  'recipe.pdf': 'Rezept-PDF',
  'recipe.pdfHint': 'Kochanweisung als PDF (Basis-Mengen)',
  'recipe.totalWeight': 'Gesamtgewicht',
  'recipe.totalEnergy': 'Energie gesamt',
  'recipe.energyDensity': 'Energie-Dichte',
  'recipe.tree': 'Rezept-Baum',
  'recipe.steps': 'Arbeitsschritte',
  'recipe.noSteps': 'Keine Arbeitsschritte hinterlegt.',
  'recipe.properties': 'Eigenschaften & Allergene',
  'recipe.deleteTitle': 'Rezept löschen',
  'recipe.clone': 'Klonen',
  'recipe.deleteMessage':
    '„{name}“ und alle zugehörigen Rezeptdaten wirklich löschen?',

  // Shopping-Tour-Lifecycle & manuelle Items
  'shopping.completed': 'Erledigt',
  'shopping.completedHint':
    'Abgeschlossene Touren sind gesperrt (✓ markieren, 🔓 wieder öffnen). Zutaten lassen sich hier zuordnen oder entfernen.',
  'shopping.markCompleted': 'Tour als erledigt markieren (sperrt sie)',
  'shopping.reopen': 'Tour wieder öffnen',
  'shopping.unassignItem': 'Zuordnung aufheben (fällt zurück auf automatisch)',
  'shopping.addItem': 'Zutat hinzufügen…',
  'shopping.addItemHint':
    'Zugeordnete Zutaten landen garantiert auf dieser Tour — auch ohne Händler-Fit (z. B. Privat, Genesis).',
  'shopping.preset.relevant': 'Passende vorauswählen',
  'shopping.preset.none': 'Keine',
  'shopping.preset.all': 'Alle',
  'shopping.preset.aria': 'Vorauswahl der Zutaten',
  'shopping.preset.noUncovered':
    'Alle Zutaten sind bereits zugeordnet — die Tour wird leer angelegt.',
  'shopping.preset.relevantHint':
    'Store passt zu dieser Tour (automatisch zuordenbar)',
  'shopping.preset.manualHint':
    'Wird dieser Tour fest zugeordnet (manuell, unabhängig vom Store)',
} as const

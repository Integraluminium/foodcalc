import {DE} from './de'

/**
 * Englische UI-Texte — Skeleton mit identischer Struktur zu `DE`
 * (`de`/`en` sind übersetzbar, sobald ein Locale-Umschalter `t()` auf ein
 * Wörterbuch anderes als `DE` zeigt; siehe `i18n/index.ts`).
 *
 * Kern-Namespaces sind übersetzt; der Rest erbt vorläufig die deutschen
 * Texte (TODO(translate)) und bleibt dadurch strukturell synchron.
 */
export const EN = {
    ...DE,

    nav: {
        ingredients: 'Ingredients',
        recipes: 'Recipes',
        events: 'Events',
        inventories: 'Inventories',
        documents: 'Documents',
    },

    shell: {
        userMenu: 'User menu',
        profileSettings: 'Profile & settings',
        admin: 'Administration',
        logout: 'Log out',
    },

    state: {
        loading: 'Loading…',
        error: 'Loading failed',
    },

    action: {
        close: 'Close',
        cancel: 'Cancel',
        save: 'Save',
        create: 'Create',
        delete: 'Delete',
        edit: 'Edit',
    },

    status: {
        available: 'Available',
        planned: 'Planned',
        missing: 'Missing',
        unknown: 'Unknown',
    },

    filter: {
        allGroups: 'All groups',
        byOwner: 'Filter by owner group',
    },

    roles: {
        viewer: 'Viewer',
        editor: 'Editor',
        manager: 'Manager',
    },

    transfer: {
        open: 'Transfer ownership',
        button: 'Transfer ownership',
        title: 'Transfer ownership',
        warning:
            'After the transfer you only keep the rights of your membership in the target group — managers of the target group hand the membership on.',
        target: 'New owner group',
        chooseGroup: 'Choose group…',
        currentOwner: 'current',
        confirm: 'Transfer',
        newRoleHint: 'Your role in the target group: {role}',
    },

    rights: {
        myGroups: 'My groups & rights',
        myGroupsHint: 'You act in every group with your respective role.',
        rolePersonal: 'your owner group',
        roleLegend: 'Viewer: see · Editor: edit · Manager: manage members and roles',
        createPlaceholder: 'New group name…',
        createButton: '+ Create group',
        deleteGroup: 'Delete group',
        deleteGroupConfirm:
            'Delete group „{name}“? Only possible if it owns no resources.',
        loadError: 'Groups could not be loaded: {error}',
        membersLoadError: 'Members could not be loaded: {error}',
        noMembers: 'No members yet.',
        addMemberPlaceholder: 'Username or email…',
        addMemberButton: '+ Add',
        removeMember: 'Remove from group',
        roleLabel: 'Role',
        legendTitle: 'Roles',
        legendViewer: "Viewer — can see the group's resources",
        legendEditor: "Editor — may edit the group's resources",
        legendManager: 'Manager — additionally manages members and their roles',
        personalNote:
            'Personal groups always belong to exactly one user and are managed with the account.',
    },

    admin: {        selfGrantTitle: 'Own memberships (admin)',
        selfGrantHint:
            'Admins abide by group roles: join a group to see or edit its resources.',
        selfGrantGroup: 'Group',
        selfGrantRole: 'Role',
        selfGrantButton: 'Add membership',
        selfGrantDone: 'Membership added.',
    },

    event: {
        ...DE.event,
        areas: 'Event areas',
        tab: {
            overview: 'Overview',
            plan: 'Menu plan',
            shopping: 'Shopping & logistics',
            calc: 'Calculation',
            timeline: 'Schedule',
        },
    },

    workspace: {
        ...DE.workspace,
        invalidId: 'Invalid event ID.',
        backToList: 'Back to the list',
        loadError: 'Event could not be loaded: {error}',
        mealsBadge: '{count} meals',
    },

    ingredient: {
        fullView: 'Open full view →',
        loadError: 'Ingredient could not be loaded: {error}',
        triggerData: 'Data',
        triggerSources: 'Sources',
        dataTitle: 'Edit ingredient',
        createTitle: 'New ingredient',
        name: 'Name',
        energy: 'Energy (kJ/g)',
        energyHint: 'Energy density — the basis of energy-based scaling in events.',
        sourcesTitle: 'Sources',
        sourcesDrawerTitle: 'Sources',
        sourcesEmpty: 'No sources recorded.',
        addSourceTitle: 'Add source',
        colStore: 'Store',
        colPackage: 'Package size',
        colUnit: 'Unit',
        colPrice: 'Price (€)',
        colUrl: 'URL',
        openUrl: 'Shop',
        propertiesTitle: 'Properties',
        propertiesEmpty: 'No properties.',
        addProperty: '+ Add property…',
        weightsTitle: 'Weight per unit',
        weightsEmpty: 'No unit weights recorded.',
        colWeightKg: 'Weight (kg)',
        weightsHint:
            'Amount conversion: 1 unit = X kg — the recipe editor converts amounts into kg (and kJ) automatically.',
        done: 'Done',
        addSourceButton: '+ Add source',
        sourceAdded: 'Source added.',
        sourceSaved: 'Source saved.',
        noStores:
            'No stores exist yet — sources need at least one store (master data).',
        pickUnit: 'Pick a unit…',
        usagesTitle: 'Used in recipes',
        usagesEmpty: 'Not used in any recipe.',
        deleteTitle: 'Delete ingredient',
        deleteConfirm: 'Really delete ingredient “{name}”?',
        deleteUsagesWarning:
            'Ingredient “{name}” is used in {count} recipe(s) — their ingredient rows will break on deletion. Really delete?',
    },

    editor: {
        drawer: {
            metaTitle: 'Recipe data',
            ingredientsTitle: 'Ingredients & components',
            stepsTitle: 'Preparation steps',
            triggerMeta: 'Data',
            triggerIngredients: 'Ingredients',
            triggerSteps: 'Steps',
            name: 'Name',
            kind: 'Type',
            kindMeal: 'Meal',
            kindComponent: 'Component',
            comment: 'Comment',
            weighedIn: 'Weighed in',
            owner: 'Owner',
            ownerHint: "Change the owner via 'Transfer ownership', not here.",
            personal: 'personal',
            create: 'Create',
            deleteTitle: 'Delete recipe',
            deleteConfirm: 'Really delete recipe “{name}”?',
            colComponent: 'Component',
            colWeight: 'Weight (kg)',
            colStep: 'Step',
            colDescription: 'Description',
            colFixed: 'Fixed (min)',
            colPerKg: 'Per kg (min)',
            ingredientsEmpty: 'No ingredients yet.',
            subsEmpty: 'No components yet.',
            stepsEmpty: 'No preparation steps yet.',
            addIngredient: '+ Add ingredient',
            addSub: '+ Add component',
            addStep: '+ Step',
            add: 'Add',
            addKeepOpen: 'Add & keep open',
            selfRef: 'this recipe',
            moveUp: 'Move up',
            moveDown: 'Move down',
            pickerSearch: 'Search…',
            pickerEmpty: 'No matches.',
            pickerCreate: '+ Create new',
            pickerCreateName: 'Ingredient name',
            pickerCreateEnergy: 'Energy (kJ/g)',
            pickerCreateComment: 'Comment (optional)',
            pickerCreateSubmit: 'Create & select',
            filterAll: 'All',
            stepDescPlaceholder: 'Description…',
            pickerHint:
                'Enter: add & keep open · Shift+Enter: add & close · Esc: close',
        },
        titleNew: 'New recipe',
        titleEdit: 'Edit recipe: {name}',
        backToRecipe: 'Back to the recipe',
        backToList: 'Back to the list',
        section: {
            basis: 'Basics',
            parts: 'Ingredients & components',
            steps: 'Steps',
            aria: 'Switch recipe area',
        },
        ownerGroup: 'Owner group',
        ownerGroupHint: 'Change ownership via “Transfer ownership”, not here',
        optional: 'optional',
        basis: {
            namePlaceholder: 'e.g. Chili sin Carne',
            weighedIn: 'Weighed (amounts verified gram-accurate)',
        },
        parts: {
            ingredientsEmpty: 'No ingredients yet — add them below.',
            colIngredient: 'Ingredient',
            colAmount: 'Amount',
            colConversion: 'Conversion',
            noConversion: 'no conversion',
            chooseIngredient: 'Choose ingredient…',
            add: '+ Add',
            removeRow: 'Remove row',
            subsHint:
                'Meals and components combine freely (e.g. a component as a side, a meal as a side of another meal).',
            chooseRecipe: 'Choose recipe…',
            thisRecipe: ' (this recipe)',
            unitKg: 'kg',
        },
        steps: {
            hint: 'Times: fixed (e.g. 10 min sautéing) or per kg (e.g. 25 min/kg boiling). Used by the event timeline.',
            empty: 'No steps yet — add them below.',
            namePlaceholder: 'e.g. sauté the onions',
            descriptionPlaceholder: 'Description (optional)',
            minutesFixed: 'fixed (min)',
            minutesPerKg: 'per kg (min)',
            moveUp: 'Move up',
            moveDown: 'Move down',
            remove: 'Remove step',
            add: '+ Step',
        },
        calcHint: 'The density scales the cooking amount later: portions × kJ target per portion.',
        dirty: 'Unsaved changes',
        discardTitle: 'Unsaved changes',
        discard: 'Discard',
        discardConfirm: 'Discard unsaved changes?',
        loadError: 'Recipe could not be loaded: {error}',
        saveError: 'Saving failed.',
        fallbackIngredient: 'Ingredient #{id}',
        fallbackRecipe: 'Recipe #{id}',
    },

    // TODO(translate): alle nicht explizit überschriebenen Namespaces erben
    // vorläufig die deutschen Texte (Spread oben) — bei der Übersetzung
    // Namespace für Namespace nachziehen.
} as const

/**
 * Compile-Zeit-Parity-Guard: Jeder Top-Level-Namespace von `DE` muss auch in
 * `EN` existieren — so fällt ein vergessener Namespace beim Übersetzen sofort
 * beim Bauen auf, nicht erst zur Laufzeit.
 */
export const _EN_PARITY: Record<keyof typeof DE, unknown> = EN

# Avoid AIFoodcalc: Semantic UX/UI Architecture & User Flows

This document describes the semantic structure, interaction paradigms, and primary user flows of the Foodcalc application. It abstracts away specific visual implementations to focus on the purpose, behavior, and state transitions of the interface.

## 1. Core Interaction Paradigms

The application is built on three fundamental UX paradigms to handle the complexity of large-scale catering:

1. **Context Preservation (Master-Detail):** Users must frequently cross-reference data. Navigating away from a list to view an item breaks cognitive flow. The UI must utilize contextual overlays (e.g., drawers or side-panels) to view, edit, and create entities while maintaining the background context of the master list.

2. **Energy-Based Scaling Strategy:** The core calculation logic assumes that food scales by nutritional energy (kJ), not arbitrary weights, to ensure event attendees are adequately fed. The UI must semantically differentiate between configuring a standard meal (scaled by kJ) and discrete items like beverages (scaled by absolute volume/units).

3. **Progressive Disclosure in Planning:** Event planning is overwhelming. The UI must guide the user sequentially: from selecting what to cook, to resolving where ingredients come from, to scheduling the preparation, and finally exporting physical documents.

## 2. Primary User Flows

### Flow A: The Event Planning Lifecycle

This is the core loop of the application, taking an event from conception to execution.

1. **Initiation:** User navigates to the Event Hub, views the global list of events, and creates or selects an event.

2. **Workspace Entry:** User enters the isolated "Event Workspace." The global navigation context recedes, focusing the user entirely on the selected event.

3. **Menu Definition (Meals):** User adds recipes to the event. The system intercepts this action with a configuration step: requesting the target audience size (portions) and the semantic purpose of the dish (Main dish, Side dish, Custom energy target).

4. **Sourcing & Logistics:** The system aggregates all required ingredients. The user defines "Shopping Tours" (temporal and spatial events for purchasing). The user resolves conflicts by explicitly overriding ingredient sources (e.g., routing a specific spice to a private inventory instead of the bulk supplier).

5. **Temporal Scheduling:** User switches to a temporal view (Timeline/Gantt). The system represents shopping, preparation, and serving as draggable temporal blocks. The user resolves chronological conflicts (e.g., ensuring shopping occurs before preparation).

6. **Artifact Generation:** User generates static outputs (PDFs, labels, allergen warnings) based on the finalized state.

### Flow B: Recipe Composition & Modularity

Recipes in Foodcalc are highly modular and recursive.

1. **Discovery:** User searches the Recipe Hub, filtering specifically by semantic type: "End Meals" (standalone dishes) vs. "Components" (building blocks like sauces or rice).

2. **Recursive Inspection:** Upon selecting a recipe, the user is presented with a hierarchical tree structure. This visually communicates that a recipe may consist of raw ingredients OR nested sub-recipes.

3. **Contextual Editing:** When editing, the system must clearly distinguish between mutating a global recipe (affecting all future events) versus creating a "Copy-on-write" instance (modifying a recipe specifically for one event).

## 3. Semantic Screen Definitions

### 3.1 Global Shell & Navigation

* **Purpose:** Provides global state context and cross-domain navigation.

* **Elements:**

    * **Global Navigation:** Persistent access to primary domains: Ingredients, Recipes, Events, and Inventories.

    * **User/Identity Context:** Displays the current acting user and their active permission group (crucial for ownership rights).

### 3.2 The Master List Interfaces (Hubs)

* **Purpose:** Aggregation, discovery, and entry points for entities (Recipes, Events).

* **Elements:**

    * **Filter/Search Controller:** Allows narrowing down the dataset based on text matching and semantic state (e.g., filtering recipes by type).

    * **Data Grid:** A scannable list prioritizing identifying information (Name, Owner) and key metrics (Total Budget, Energy Density).

    * **Contextual Overlay Trigger:** Selecting an item transitions the UI state to reveal the item's details without routing away from the list.

### 3.3 The Recipe Context Overlay

* **Purpose:** Deep-dive inspection and mutation of a specific recipe's structural composition.

* **Elements:**

    * **Identity Header:** Name, type classification, and ownership metadata.

    * **Diagnostic Metrics:** Real-time calculation outputs showing total mass and total energy. Must include semantic warnings if precision flags (e.g., "Not weighed accurately") are triggered.

    * **Composition Tree:** A hierarchical representation of the recipe. Interaction must allow expanding/collapsing nested components to understand dependencies without overwhelming the user.

    * **Sequential Steps:** Ordered instructions for preparation.

### 3.4 The Event Workspace

* **Purpose:** An isolated, multi-faceted environment dedicated to a single event. It bypasses the Master-Detail overlay paradigm to utilize the entire viewport due to data density.

* **Structure:** Divided into four semantic phases, navigable via internal routing/tabs.

#### Phase 1: Meals & Menus

* **Purpose:** Defining *what* will be consumed and *how much* energy is required.

* **Behavior:** Users view a chronological list of planned meals. Adding a meal invokes a "Configuration Wizard" that strictly requires the user to define the energy goal (kJ per person) to calculate required mass.

* **State Handling:** Must visually flag items that are "Event-specific overrides" versus "Global standard recipes."

#### Phase 2: Logistics & Sourcing

* **Purpose:** Resolving the supply chain for the event's required mass.

* **Behaviors:**

    * **Tour Definition:** Creating discrete procurement events (Store + Timestamp).

    * **Exception Handling (Overrides):** A dedicated interface allowing the user to intercept the default supply chain. If 100kg of onions are needed, the user must be able to route 20kg from a local pantry and 80kg from a bulk supplier.

#### Phase 3: Timeline & Execution

* **Purpose:** Orchestrating the chronological sequence of human effort.

* **Behaviors:**

    * Maps previously defined entities (Shopping Tours, Meal Preparations, Meal Servings) onto a continuous temporal axis.

    * Must allow visual manipulation (adjusting start/end times) and provide visual feedback for semantic impossibilities (e.g., cooking before shopping).

#### Phase 4: Output & Artifacts

* **Purpose:** Freezing the current digital state into physical, shareable documents for real-world execution.

* **Behaviors:** Triggers for generating aggregate lists (Kitchen Prep), compliance documents (Allergen Matrices), and localized signage (Buffet Labels).

## 4. Crucial Edge Cases & UI Logic

* **The "Non-Scalable" Exception:** When a user attempts to add a Beverage or Piece Good (e.g., bottles of soda) to an Event, the UI must intelligently bypass the "Energy Target" calculation phase. The semantic meaning changes from "Feed X people Y energy" to "Procure exactly Z units."

* **Inventory Reconciliation:** When viewing an Inventory entity, the UI must support a "Reconciliation Mode" (Inventory Correction). This allows users to easily align the system's expected stock with the physical reality via rapid increment/decrement controls, acknowledging that physical stock tracking is imperfect.
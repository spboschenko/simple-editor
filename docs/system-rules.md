# System Rules — Mini Editor Architecture Lab

## Purpose

This document defines the meta-rules of the project.

It exists to prevent architectural drift, accidental coupling, contradictory documentation, and uncontrolled feature growth.

This file is the **governing layer above all implementation-specific documents**.

---

## 1. Project philosophy

This project must evolve as a **small, explicit, scalable editor system**, not as a collection of local fixes.

The goal is not just to add features.
The goal is to preserve:

- architectural clarity
- consistent behavior
- predictable UI
- clean state ownership
- renderer independence
- documentation integrity

---

## 2. Rule hierarchy

When documents or implementation decisions conflict, use this hierarchy:

1. **Architecture**
2. **State Model**
3. **Interaction Model**
4. **Rendering Model**
5. **UI Composition**
6. **Design System**
7. **Responsive Strategy**
8. **Implementation details**

### Interpretation

- Lower layers may adapt to higher layers
- Higher layers must not be silently broken by lower-layer changes
- Visual or responsive improvements must never violate state, interaction, or rendering rules

---

## 3. Scope of each governing document

### architecture.md
Defines:
- system boundaries
- source of truth
- renderer separation
- action/command flow

### state-model.md
Defines:
- document/core state
- editor UI state
- transient interaction state
- derived state rules

### interaction-model.md
Defines:
- select
- preview
- commit
- cancel
- undo/redo semantics

### rendering-model.md
Defines:
- document layer
- overlay layer
- screen-space vs document-space rendering rules

### ui-composition.md
Defines:
- UI regions
- role of each panel
- panel responsibilities
- communication through shared store

### design-system.md
Defines:
- typography
- spacing
- rhythm
- sizes
- token usage
- icon rules

### responsive-strategy.md
Defines:
- layout modes
- breakpoint strategy
- capability differences by device size
- panel transformation rules

---

## 4. Non-negotiable invariants

These rules must never be broken without explicitly updating the governing docs first.

### 4.1 Source of truth
The renderer does not own truth.
Document truth lives in core/editor state.

### 4.2 One action path
Canvas, inspector, and panels must modify state through the same action/command system.

### 4.3 Preview is not commit
Drag and resize must use preview/transient state.
Base document state must not be rewritten on every pointer move.

### 4.4 Overlay is not document
Selection outlines, handles, labels, and similar editor visuals are overlays, not document geometry.

### 4.5 Tokens only
UI values must come from tokens.
No arbitrary spacing, font sizes, colors, or radii.

### 4.6 Responsive adaptation is not feature mutation
Responsive mode may reduce available features or change presentation,
but must not silently redefine core interaction semantics.

### 4.7 Panels have single responsibility
Structure panel is navigation.
Specification panel is derived read-only info.
Inspector is selected-object editing.
Toolbar is tools/actions, not property editing.

---

## 5. Change classification

Every change must be classified before implementation.

### Type A — Architectural
Examples:
- changing ownership of state
- changing action flow
- changing renderer responsibilities

Requires:
- doc review before implementation
- updates to architecture.md and possibly related docs

### Type B — Interaction
Examples:
- changing drag semantics
- changing commit timing
- changing selection behavior

Requires:
- updates to interaction-model.md
- regression check against rendering and responsive docs

### Type C — Rendering/UI separation
Examples:
- changing overlay behavior
- changing screen-space logic
- changing canvas layering

Requires:
- updates to rendering-model.md
- validation against interaction rules

### Type D — UI composition
Examples:
- changing panel content
- moving controls between toolbar/panels
- changing shell layout

Requires:
- updates to ui-composition.md
- validation against responsive strategy

### Type E — Design system
Examples:
- changing font sizes
- adding spacing tokens
- adjusting button dimensions

Requires:
- updates to design-system.md
- updates to design integration docs if implementation changes

### Type F — Responsive
Examples:
- moving inspector into drawer
- changing mobile capability set
- changing breakpoint behavior

Requires:
- updates to responsive-strategy.md
- must not violate interaction or architecture rules

---

## 6. Conflict resolution rules

When a change conflicts with another project rule, resolve conflicts in this order:

### Case 1 — Design vs Rendering
Rendering wins.
Design must adapt to document/overlay rules.

### Case 2 — Responsive vs Interaction
Interaction wins.
Responsive may reduce access to an interaction, but must not redefine its meaning.

### Case 3 — UI Composition vs State Model
State model wins.
Panels may change presentation, but not ownership of state.

### Case 4 — Implementation convenience vs Architecture
Architecture wins.
Do not bypass rules for speed.

---

## 7. Required change checklist

Before implementing any feature or refactor, answer:

- [ ] Which layer does this change belong to?
- [ ] Does it affect a higher-priority layer?
- [ ] Which governing documents must be updated?
- [ ] Does it introduce a contradiction with existing docs?
- [ ] Does it add new state ownership?
- [ ] Does it bypass the command/action path?
- [ ] Does it violate design tokens?
- [ ] Does it create a desktop-only assumption?
- [ ] Does it require new tests or smoke checks?

If these questions cannot be answered clearly, the change is too vague and must be decomposed.

---

## 8. Documentation synchronization rules

Documentation must reflect implemented reality.

### Required behavior
- If implementation changes semantics, update docs in the same change
- If something is not implemented yet, mark it as future work explicitly
- Do not describe aspirational architecture as if it already exists

### Forbidden behavior
- outdated docs left “for later”
- code contradicting docs
- docs contradicting each other
- silent scope expansion

---

## 9. Rules for adding new features

New features must be added by **extension**, not by breaking existing layers.

### Allowed pattern
- add a new object type
- extend the same action/store pathway
- add renderer support for that object
- update docs accordingly

### Forbidden pattern
- feature-specific state hidden inside UI component tree
- duplicate action logic in panel and canvas
- one-off rendering exceptions that violate model rules
- feature-specific styling outside token system

---

## 10. Rules for scaling complexity

As the project grows, complexity must be added in this order:

1. extend document model
2. extend action layer
3. extend rendering model
4. extend UI composition
5. extend design tokens if necessary
6. extend responsive capabilities if necessary

Never start by patching the UI without defining the model implications first.

---

## 11. Responsibility boundaries

### Core / State layer owns:
- document truth
- editor state
- interaction state
- history

### Renderer owns:
- visual output only
- hit mapping to actions
- no truth ownership

### Panels own:
- presentation
- input collection
- no independent document logic

### Design system owns:
- visual tokens
- not behavior

### Responsive strategy owns:
- layout transformation
- capability presentation
- not data model
- not interaction semantics

---

## 12. Anti-drift rules

The following are red flags and must trigger review:

- the same feature logic appears in two different places
- a panel mutates state differently than canvas does
- a responsive change changes behavior instead of access
- visual fixes require breaking rendering rules
- new spacing or font values appear outside tokens
- docs stop matching implementation
- local fixes introduce global coupling

---

## 13. Definition of a healthy project state

The project is considered healthy when:

- architecture docs and code match
- state ownership is obvious
- interactions are predictable
- overlays remain separate from document geometry
- UI regions keep their single responsibility
- design tokens govern all visual values
- responsive behavior changes layout/capability, not system truth
- new features can be added without rewriting foundations

---

## 14. Golden rule

The system must evolve by extending layers, not by violating them.
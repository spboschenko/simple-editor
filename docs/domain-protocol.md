<!-- entities: DomainContract, DomainModule, ToolbarTool, ExportTemplate, TypedDocumentState, DomainUIProvider, useDomainUI, ResolvedToolbarTool, registerDomain, getDomain, listDomains, nullDomain, domains/index.ts, domain-contract.ts, domain-ui-context.tsx -->

# Domain Protocol

Specification of the Host-Plugin integration contract between the editor shell and subject-matter domain modules.

Source files: `src/core/domain-contract.ts`, `src/core/domain-ui-context.tsx`, `src/domains/index.ts`.

---

## Overview

A **domain** is a plain TypeScript object (no class instances, no store imports, no React dependencies in core logic) that encodes the subject-matter knowledge for one document type. Domains are stateless — they export functions and component types, nothing more.

Every document carries a `domainType` string. When a store action mutates the document, the event bridge calls `getDomain(doc.domainType)` and re-runs `process()`. All domain contributions to the UI are injected by `DomainUIProvider` without any if/switch on domain type in the host shell.

---

## DomainContract\<TData, TComputed\>

The base integration contract. Defined in `src/core/domain-contract.ts`.

### Required fields

| Field | Type | Rules |
|---|---|---|
| `type` | `string` | Unique across the entire registry. Stored in `DocumentState.domainType`. Must be a stable slug (never change once projects exist). |
| `defaults` | `TData` | Initial value for `DocumentState.data` when a new document is created via `createFromDomain()`. Must be fully initialised — no undefined fields. |
| `process` | `(geometry: Rect, data: TData) => TComputed` | **Pure function.** Same inputs must always produce the same output. No side effects, no imports from React, store, or localStorage. Called by the store event bridge after every geometry mutation and after `updateDomainData`. |

### Optional fields

| Field | Type | Provided by | Rules |
|---|---|---|---|
| `label` | `string` | `domain-contract.ts` | Human-readable name shown in Dashboard cards, Change Type dialog, and Inspector header. |
| `defaultGeometry` | `Partial<Rect>` | `project-storage.ts` | Overrides the standard `240×160` initial geometry for new documents of this type. Only `width` and `height` are meaningful — `x`, `y`, `id`, `fill`, `locked`, `visible` are set by the factory. |
| `renderOverlay` | `(geometry, computed, scale) => ReactElement \| null` | `DomainLayer` (canvas) | Renders domain-specific Konva decorations. Must use react-konva primitives only. Must call `worldToKonvaY()` for y-coordinates. Screen-constant sizes must divide by `scale`. Must not render selection or affordance handles — those belong to OverlayLayer. |
| `specRows` | `(computed: TComputed) => Array<{ label: string; value: string }>` | `SpecPanel` | Returns read-only derived metrics shown below geometry in the Spec panel. Pure data — no React. |
| `InspectorSection` | `React.ComponentType<{ data, onUpdateData, isLocked }>` | `Inspector.tsx` | Stable React component type rendered below geometry fields in the right Inspector panel. Must use `useNumericField` + `<InspectorField>` for numeric inputs. Anonymous component expressions are forbidden (hooks must work correctly). |
| `getChildren` | `(computed, data) => Array<{ id, name, locked }>` | `StructurePanel` | Returns child entries for the tree view below the base rect. Must be stable across renders when data/computed are unchanged. |
| `isGeometryLocked` | `(data: TData) => boolean` | Store event bridge | Returns `true` when any child is locked. When `true`, the store rejects `commitMove`, `commitResize`, `updateProps`, and `scrubProps` on the base rect. |
| `toggleChildLock` | `(childId: string, data: TData) => TData` | Store action `toggleChildLock` | Pure function — returns a new `TData` with the child's lock state toggled. Must not mutate `data`. |

---

## DomainModule\<TData, TComputed\>

Extends `DomainContract` with Host-Plugin UI injection hooks. Every `DomainContract` is structurally assignable to `DomainModule` (extra fields are optional). **Prefer `DomainModule` for all new domains.**

### Additional optional fields

| Field | Type | Injected by | Rules |
|---|---|---|---|
| `toolbarTools` | `ReadonlyArray<ToolbarTool>` | `DomainUIProvider` → `GlobalToolbar` | Rendered as a `.toolbar-tool-btn` strip after the menu bar. Each `id` must be unique across all registered domains. |
| `exportTemplates` | `ReadonlyArray<ExportTemplate<TData, TComputed>>` | `DomainUIProvider` (future File menu) | Shown in File › Export submenu. Each template's `serialize()` must be pure. |
| `onToolActivate` | `(toolId, data, onUpdateData) => void` | `DomainUIProvider` (onClick closure) | Called when a `toolbarTools` button is clicked. The domain receives current `data` and a pre-bound `onUpdateData(newData)` callback. **Must not import or call `dispatch` directly** — use `onUpdateData` instead. |

---

## ToolbarTool

```ts
interface ToolbarTool {
  readonly id: string        // unique across all domains
  readonly label: string     // tooltip text
  readonly icon: React.ReactNode  // currentColor SVG, 16×16 viewBox
  readonly shortcut?: string // display string only, e.g. 'G' (not wired to KeyboardEvent)
}
```

---

## ExportTemplate

```ts
interface ExportTemplate<TData, TComputed> {
  readonly id: string
  readonly label: string          // shown in File › Export menu
  readonly mimeType: string       // e.g. 'application/json'
  readonly fileExtension: string  // e.g. 'json'
  serialize(geometry: Rect, data: TData, computed: TComputed): string
}
```

`serialize()` must be pure and synchronous. It must not reference the store, window, or any browser API.

---

## TypedDocumentState utility

```ts
type TypedDocumentState<D extends DomainContract<any, any>> =
  D extends DomainContract<infer TData, infer TComputed>
    ? DocumentState<TData, TComputed>
    : never
```

Infers the typed `DocumentState` from the domain object, so domain files can declare fully-typed documents without repeating type parameters:

```ts
type GridDocument = TypedDocumentState<typeof gridLayoutDomain>
// resolves to: DocumentState<GridPayload, GridResults>
```

---

## Registry

The global registry is a `Map<string, DomainModule<any, any>>` in module scope inside `domain-contract.ts`.

```ts
registerDomain(domain: DomainModule<any, any>): void
getDomain(type: string): DomainModule<any, any> | undefined
listDomains(): ReadonlyArray<DomainModule<any, any>>
```

**Registration rules:**
- `registerDomain` must be called before the React tree mounts (i.e. called synchronously before `createRoot`).
- The canonical registration point is `src/domains/index.ts`. It is imported in `main.tsx` before `App` renders.
- Calling `registerDomain` with a `type` that is already registered silently overwrites. This is intentional for hot-reload scenarios only.

---

## DomainUIProvider

`src/core/domain-ui-context.tsx`

Reads `document.domainType` from the store, resolves the domain, pre-binds each `toolbarTools` entry with an `onClick` closure, and exposes the result via `useDomainUI()`. Must be mounted **inside** `EditorProvider`.

```tsx
<EditorProvider payload={payload}>
  <DomainUIProvider>        {/* ← must be inside EditorProvider */}
    <AppShell />
  </DomainUIProvider>
</EditorProvider>
```

**Closure stability:** `onClick` closures read `document.data` from a `useRef` that is updated synchronously on every render. This ensures the closure always operates on the latest data without recreating the array on every keystroke.

---

## Null domain

The built-in `nullDomain` (`type: 'null'`, `label: 'Empty Drawing'`) is the default for all new projects. Its `data` and `computed` are empty objects `{}`. It is automatically registered at module load time and must never be removed from the registry.

---

## Validation rules

| Rule | Rationale |
|---|---|
| `process()` must be pure | The store calls it after every action without debouncing. Side effects would violate the single command path. |
| `process()` must not import React | It runs in the store reducer, which is a non-React context. |
| `defaults` must be fully initialised | `process()` receives the defaults directly; undefined fields cause crashes when domain logic accesses them. |
| `InspectorSection` must be a stable component reference | Passed to JSX as `<domain.InspectorSection />`. An anonymous function would re-mount + destroy hooks on every parent render. |
| `InspectorSection` must use `useNumericField` + `<InspectorField>` | Enforces arithmetic expression support and uniform keyboard semantics. See `docs/input-rules.md`. |
| `onToolActivate` must use `onUpdateData`, never `dispatch` | Keeps the domain free of store coupling. Testable without a store context. |
| `type` must be immutable after first use | Projects serialise `domainType` to localStorage. Changing the string orphans existing projects. |

---

## Adding a new domain — checklist

1. Create `src/domains/<name>.tsx` that exports `const <name>Domain: DomainModule<TData, TComputed>`.
2. Add `registerDomain(<name>Domain)` to `src/domains/index.ts`.
3. No other files need to change.
4. Verify: `listDomains()` returns the new domain; Dashboard shows a card; "Change Type…" includes it.

---

## Design decisions

**Why plain objects instead of classes?**  
Classes encourage mutable instance state and lifecycle coupling. Plain objects are trivially serialisable, mockable, and tree-shakeable.

**Why is `onToolActivate` domain-side instead of a Redux-style action creator?**  
Domains should not know which action types exist in the store. Providing `onUpdateData` as a callback injects the minimal required capability without creating a dependency on the store's internal `Action` union.

**Why does `DomainUIProvider` pre-bind `onClick` with a `useRef`?**  
Recreating the `toolbarTools` array on every render would force all toolbar tool buttons to re-render on every keystroke. The ref captures the latest `data` without changing the memoised array reference.

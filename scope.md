Scope Definition: Mini Editor Architecture Lab
Общий принцип

Это минимальный, но целостный editor shell, который должен показать все базовые кирпичики интерфейса редактора, даже если доменная модель пока предельно простая.

Единственный объект документа
Rectangle #1
Главная цель

Построить архитектурно правильный мини-редактор, а не фичастую демку.

1. Общая компоновка интерфейса
┌──────────────────────────────────────────────────────────────┐
│ Global Toolbar                                              │
├───────────────────────┬────────────────────────┬─────────────┤
│ Left Panel            │ Canvas Area            │ Right Panel │
│                       │                        │             │
│ Structure             │ Canvas Toolbar         │ Inspector   │
│                       │                        │             │
│ Specification         │ Document + Overlay     │             │
└───────────────────────┴────────────────────────┴─────────────┘
2. Global Toolbar (верхняя панель)
Назначение

Глобальные инструменты и действия редактора.

Содержимое
Group A — Tools
Select Tool
Rectangle Tool (stub / future-ready)
Group B — Global Actions
Undo
Redo
Reset Selection
Group C — View
Reset View (can be stub if camera is minimal)
Ограничения
не больше 5–6 кнопок
одна библиотека иконок
один активный tool
toolbar не должен содержать object properties
3. Left Panel

Левая панель теперь состоит из двух секций.

3.1 Structure Section
Назначение

Показывает структуру документа.

Содержимое
Document
 └── Rectangle #1
Поведение
click on Rectangle row → selects rectangle
selected row highlighted
никаких inline actions
никаких property editors
3.2 Specification Section
Назначение

Показывает derived information по документу.

MVP содержимое
Rectangle Area

Например:

Specification
- Area: 120000 px²

или, если хотите без px:

Specification
- Area: width × height = N
Поведение
вычисляется из document state
read-only
обновляется автоматически после move/resize/inspector edits
Ограничения
не редактируемая
без сложных таблиц
только 1 derived metric: площадь прямоугольника
4. Canvas Area

Canvas area теперь состоит из:

4.1 Canvas Toolbar

Небольшой локальный toolbar поверх canvas.

Назначение

Быстрые действия, относящиеся именно к canvas/view, а не ко всему приложению.

Содержимое
Zoom In (optional if camera implemented)
Zoom Out (optional)
Fit / Reset View
Toggle Overlay Debug (optional but useful)

Если zoom/camera в MVP минимальны, можно оставить:

Reset View
Toggle Overlay Debug
Ограничения
это именно canvas-local controls
не дублировать global toolbar tool selection
не класть туда object properties
4.2 Document Layer
отрисовка прямоугольника
4.3 Overlay Layer
selection outline
4 resize handles
5. Right Panel (Inspector)
Назначение

Точное редактирование выбранного объекта.

Содержимое
Geometry
X
Y
Width
Height
Appearance
Fill
Поведение
изменения идут через commands/actions
Enter commits
Escape cancels field editing
canvas and inspector must stay synchronized
6. Domain / Functional Scope
Единственный объект

Rectangle with:

id
x
y
width
height
fill
Ограничения
только один объект
всегда существует
нельзя удалить
нельзя создавать дополнительные объекты
7. Interaction Scenarios (обязательные)
Scenario 1 — Select
click rectangle on canvas → select
click rectangle in structure panel → select
selection syncs everywhere
Scenario 2 — Move via Canvas
drag rectangle body → preview
mouseup → commit
Scenario 3 — Resize via Canvas
drag handle → preview
mouseup → commit
Scenario 4 — Edit via Inspector
edit X/Y/Width/Height/Fill → commit through actions
Scenario 5 — Derived Spec Update
resize rectangle → area in specification updates automatically
Scenario 6 — Undo / Redo
works for move / resize / inspector edits
8. Mandatory State Layers
A. Document State

Rectangle geometry + appearance.

B. Editor UI State
selectedId
activeTool
camera state (if used)
C. Interaction State
drag session
resize session
preview geometry
D. Derived State
rectangle area

Важно:
derived state не должен храниться вручную как независимая истина, если его можно вычислить из document state.

9. Commands / Actions

Обязательные actions:

selectRect
moveRectPreview
commitMoveRect
resizeRectPreview
commitResizeRect
updateRectProps
undo
redo
resetSelection
resetView

Если preview actions не хочется оформлять как полноценные commands, это допустимо, но commit actions должны быть выделены явно.

10. Error Isolation
Требование

Canvas zone must be wrapped in Error Boundary.

При падении canvas:

Global toolbar survives
Left panel survives
Right inspector survives
Canvas area shows fallback

Canvas toolbar может входить в ту же boundary, если он относится к canvas zone.

11. Documentation Requirements

Copilot должен задокументировать не только код, но и все кирпичики интерфейса.

Обязательно описать:

In README
overall layout
what each panel is for
what is global vs local UI
what is document vs overlay
In docs/architecture.md
shell layout
state layers
command flow
renderer separation
why specification is derived read-only UI
In docs/ui-composition.md
Global Toolbar
Left Structure Panel
Left Specification Panel
Canvas Toolbar
Canvas Document Layer
Canvas Overlay Layer
Right Inspector

Нужно объяснить:

зачем существует каждый блок
что в нём можно делать
чего в нём делать нельзя
12. Updated UI Boundaries
Global Toolbar

Global app-level controls only.

Left Structure Panel

Document navigation only.

Left Specification Panel

Derived read-only info only.

Canvas Toolbar

Canvas/view-related controls only.

Canvas Document Layer

Document object rendering only.

Canvas Overlay Layer

Selection/UI overlays only.

Right Inspector

Selected object property editing only.

Это очень важно: каждый кирпичик должен иметь свою смысловую роль.

13. What is strictly out of scope

Не добавлять:

multi-select
multiple rectangles
snapping
grid
context menu
export
domain-specific facade logic
profiles / brackets / joints
advanced styling
responsive mobile layout

Даже если “можно быстро”, не делать.

14. Acceptance Criteria

Проект считается успешным, если:

UI completeness

Есть все основные зоны:

global toolbar
left structure
left specification
canvas toolbar
canvas document layer
canvas overlay layer
right inspector
Architectural correctness
document state separated
UI/editor state separated
transient interaction state separated
derived spec separated logically
renderer does not own truth
Functional correctness
rectangle selectable
rectangle movable
rectangle resizable
inspector editable
specification updates automatically
undo/redo works
canvas failure does not kill shell
Documentation completeness
docs explain all interface blocks
docs explain why the UI is divided this way
docs explain which blocks are editable vs read-only vs transient
15. Final instruction for Copilot

Do not expand beyond this interface skeleton.

This project must cover all essential editor UI building blocks, but only in their minimal form:

one document object,
one derived metric,
one inspector,
one structure tree,
one global toolbar,
one canvas toolbar,
one overlay layer.

The value of the project is not feature count.
The value is a clean, well-explained, scalable editor architecture.
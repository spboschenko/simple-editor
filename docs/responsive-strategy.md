Responsive Strategy — Mini Editor Architecture Lab
🎯 Purpose

This document defines how the editor behaves across different screen sizes and device types.

The goal is not to replicate the full desktop editor everywhere, but to provide:

a complete experience on desktop
a compact but usable experience on tablet
a viewer-first experience on mobile
🧠 Core Principle

Responsive behavior is not only about layout —
it is about capabilities and interaction models.

Different screen sizes may support different features.

📐 1. Supported Modes

The application must support three logical modes:

🖥️ Desktop Mode

Full editor experience.

Includes:
Global Toolbar
Left Structure Panel
Left Specification Panel
Canvas Area
Canvas Toolbar
Right Inspector
Capabilities:
Full object editing
Drag move
Resize via handles
Inspector editing
Undo / Redo
Full navigation
💻 Compact Mode (Tablet / Narrow Desktop)

Reduced layout, but still interactive.

Layout:
Canvas remains central
Side panels collapse into:
drawers
overlay panels
slide-in panels
Capabilities:
Object selection
Inspector access (via toggle)
Structure access (via toggle)
Basic editing still available
📱 Mobile Mode

Viewer-first experience.

Layout:
Canvas occupies most of the screen
Panels are replaced with:
bottom sheets
modal panels
toggle views
Capabilities:
Feature	Mobile
View canvas	✓
Select object	✓
View properties	✓
View specification	✓
Edit via fields	limited
Drag move	optional
Resize via handles	❌
Full editing workflow	❌
📊 2. Breakpoints

Define breakpoints as:

desktop: >= 1200px
tablet: 768px – 1199px
mobile: < 768px
🧩 3. Capability Matrix
Feature	Desktop	Tablet	Mobile
View canvas	✓	✓	✓
Select object	✓	✓	✓
Inspector	sidebar	drawer	sheet
Structure panel	sidebar	drawer	sheet
Specification panel	sidebar	drawer	sheet
Move object (drag)	✓	✓ (optional)	❌
Resize handles	✓	limited	❌
Undo / Redo	✓	✓	limited
Canvas toolbar	✓	simplified	minimal
🧱 4. Layout Transformation Rules
Desktop → Tablet
Left panel → collapses into drawer
Right inspector → collapses into drawer
Canvas expands to center
Toolbar remains
Tablet → Mobile
Panels → bottom sheets or modals
Canvas → primary screen
Toolbar → simplified top bar
Canvas toolbar → minimal floating controls
🧭 5. UI Region Behavior

Each UI block must be implemented as a reusable content unit, not tied to a fixed layout.

Regions
Region	Desktop	Tablet	Mobile
Structure	sidebar	drawer	sheet
Specification	sidebar	drawer	sheet
Inspector	sidebar	drawer	sheet
Canvas	center	center	full
Canvas Toolbar	inline	floating	minimal
🧠 6. Architectural Requirements
1. Panels must be decoupled from layout

Structure, Specification, and Inspector must be:

independent components
reusable in different containers
not hardcoded as “left” or “right” UI
2. Canvas must be layout-independent

Canvas must:

function without side panels
support full-screen mode
not rely on inspector visibility
3. Feature vs Presentation separation

Separate:

Feature

What the user can do

Presentation

Where and how it is shown

Example:

Inspector = feature
Sidebar / Drawer / Sheet = presentation
4. No desktop-only assumptions

Do not assume:

side panels always visible
wide horizontal layout always available
pointer precision always high
📱 7. Mobile UX Rules
Must support
tap to select object
view object properties
view specification
reset view
basic navigation (scroll / zoom if available)
Must NOT require
drag precision
small click targets
hover interactions
complex multi-step workflows
🚫 8. Anti-Patterns

❌ Forcing full desktop editor into mobile layout
❌ Shrinking UI without changing interaction model
❌ Hiding features without explanation
❌ Mixing layout logic inside component logic
❌ Creating separate mobile codebase

📘 9. Documentation Requirements

The project must explain:

how layout changes across breakpoints
how capabilities change across devices
why mobile mode is intentionally limited
how panels are reused across layouts
🔮 10. Future Extension

This architecture must support:

full mobile editor (future)
gesture-based interactions
multi-object editing
advanced inspector modes
responsive panel docking
✅ Final Rule

The editor must degrade gracefully.

On smaller screens:

less functionality is acceptable
broken UX is not

## Rulers in Responsive Context

Rulers are part of the canvas chrome (see `docs/ui-composition.md`). They are not interactive and add minimal visual weight, but they do increase the rendered area by `RULER_SIZE` (24px) in each dimension.

Responsive behavior for rulers:

- **Desktop**: rulers visible by default (controlled by `ui.showRulers`)
- **Compact/tablet**: rulers may be hidden by default or toggled via View menu / Shift+R
- **Mobile**: rulers are hidden; the canvas fills the full viewport and rulers would consume disproportionate space

Future compact/mobile layouts should initialize `showRulers: false` or allow the layout to override the flag. The `showRulers` flag lives in UI state and controls rendering only — it does not affect document coordinates or interaction semantics.

🚀 Теперь промпт для Copilot

Вот что ему дать после создания файла 👇

Prompt: Apply Responsive Strategy

You have a responsive strategy defined in:

docs/responsive-strategy.md
🎯 Your task

Analyze this document and apply its principles to the project architecture.

🧠 Step 1 — Understand the modes

Extract:

Desktop mode behavior
Compact mode behavior
Mobile mode behavior

Understand that:

different screen sizes have different capabilities, not just different layouts

🧱 Step 2 — Refactor layout structure

Ensure that:

layout is not hardcoded to desktop
panels are not permanently fixed to left/right
UI regions are defined as reusable slots
🧩 Step 3 — Decouple panels

Refactor:

Structure Panel
Specification Panel
Inspector

So they can be rendered in:

sidebar
drawer
sheet
🎨 Step 4 — Prepare adaptive layout

Implement:

responsive layout structure
basic breakpoint detection
conditional rendering of panels

Do NOT implement full mobile UX yet.
Just ensure architecture supports it.

📱 Step 5 — Mobile-safe baseline

Ensure that on small screens:

canvas remains usable
UI does not overflow or break
panels can be hidden or collapsed
no desktop-only layout assumptions remain
📘 Step 6 — Documentation

Update or create:

docs/responsive-integration.md

Explain:

how responsive behavior is implemented
how layout changes across breakpoints
how panels are reused
what is intentionally not implemented yet
⚠️ Constraints

Do NOT:

implement full mobile editor
add complex gestures
duplicate UI for mobile
expand feature scope
🎯 Final goal

After this step:

the project must still work as a desktop editor
but must be architecturally ready for responsive behavior
layout must be flexible
panels must be reusable
mobile must not feel broken
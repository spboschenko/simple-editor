Design System — Mini Editor Architecture Lab
🎯 Purpose

This document defines the design foundation for the editor UI:

typography
spacing
layout rhythm
component sizing
icon usage

The goal is to ensure:

visual consistency
scalability
predictability
alignment with modern UI standards (Figma / Linear / Notion)
🧱 1. Core Principle

All UI must be built using design tokens, not arbitrary values.

❌ Forbidden
margin: 13px;
font-size: 15px;
padding: 7px;
✅ Required
spacing-2;
font-size-sm;
radius-md;
📐 2. Spacing System (4px Grid)
Base scale
spacing = {
  0: 0,
  1: 4px,
  2: 8px,
  3: 12px,
  4: 16px,
  5: 20px,
  6: 24px,
  8: 32px,
  10: 40px,
  12: 48px
}
Usage rules
Context	Values
Micro spacing	4 / 8
Standard UI	8 / 12 / 16
Blocks	16 / 24
Sections	24 / 32+
🚫 Never use arbitrary values like:
10px
14px
18px
🔤 3. Typography
Font

Primary:

Inter, system-ui, sans-serif
Font sizes
fontSize = {
  xs: 11px,
  sm: 12px,
  base: 13px,
  md: 14px,
  lg: 16px
}
Key rule

Primary UI size = 12–13px (NOT 15px)

Line height
lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6
}
Usage
Element	Size
Toolbar	12px
Panels	12–13px
Inspector labels	11–12px
Input values	13–14px
Section titles	13–14px
📏 4. Layout Rhythm
Vertical rhythm
[ padding 16 ]
  title
  gap 8
  item
  gap 8
  item
[ padding 16 ]
Horizontal rhythm
Left padding: 12–16
Icon → text: 8
Columns gap: 12–16
📦 5. Component Sizes
Toolbar
height: 40px
padding: 0 12px
gap: 8px
Panels
padding: 12–16px
section gap: 16px
Buttons
height: 28px
padding: 0 8px
border-radius: 6px
Inputs
height: 28px
padding: 0 8px
font-size: 13px
🔲 6. Border Radius
radius = {
  sm: 4px,
  md: 6px,
  lg: 8px
}
Usage
Element	Radius
Buttons	6px
Inputs	6px
Panels	8px
🎨 7. Color System (Minimal)
colors = {
  background: #1e1e1e,
  panel: #252526,
  border: #3c3c3c,
  textPrimary: #ffffff,
  textSecondary: #a0a0a0,
  accent: #4a90e2
}
Rules
Max 2–3 neutral shades
No random colors
Accent used sparingly
🧭 8. Icons

Use ONE library only:

Lucide OR Material Icons (outline)
Rules
size: 16px
consistent stroke
no mixing styles
🖱️ 9. Cursor System
default → pointer / default
move → move
resize → nwse-resize / nesw-resize
draw → crosshair
pan → grab
🎛️ 10. Overlay Rules

Overlay elements must:

NOT scale with zoom
use fixed screen-space size
handleSize = 8px
strokeWidth = 1px
🧱 11. Canvas Layout
inner padding: 16–24px
neutral background
clear visual focus area
🚫 12. Anti-Patterns (Strictly Forbidden)
Mixed font sizes in one panel
Arbitrary spacing values
Different button heights
Mixing 12px and 15px typography
Inline styles instead of tokens
Magic numbers in layout
🧠 13. Design Philosophy

This UI system is designed to be:

minimal
predictable
scalable
system-driven (not ad-hoc)
📌 14. Implementation Requirement

All UI must use tokens from:

src/shared/tokens/design-tokens.ts

No direct hardcoded values allowed.

🧪 15. Validation Rule

If a UI element contains:

margin: 10px;

👉 This is a design system violation

🚀 Future Extension

This system must support:

additional panels
more object types
multiple tools
theming (light/dark)
responsive layouts
✅ Final Rule

If a new UI element cannot be built using existing tokens,
the tokens must be extended — not bypassed.
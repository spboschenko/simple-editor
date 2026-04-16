Additional instructions for Copilot
General working mode

Treat this task as an architecture-first educational project, not as a quick prototype.

Your goal is not only to make the demo work, but to make the project useful as a reference implementation for a future larger editor.

Every design and code decision must favor:

clarity,
separation of concerns,
explainability,
extensibility,
predictable behavior.

Do not optimize for speed of coding at the expense of architecture.

Core implementation principles
1. Preserve strict layer boundaries

Do not mix:

document/core model,
editor UI state,
transient interaction state,
rendering logic,
UI controls,
documentation.

If a piece of logic belongs to one layer, keep it there.

2. Renderer must not own the truth

Konva/react-konva is only a rendering mechanism.

Do not let Konva nodes become the source of truth for:

geometry,
selection,
interaction semantics,
object identity.

All truth must live in the editor/core state.

3. Model-first, renderer-second

Implement the editor as if the renderer could be replaced later.

Always ask:

“Would this still work if we replaced Konva with another renderer?”

If the answer is no, the design is too renderer-coupled.

4. Interaction preview is not final state

During drag/resize:

do not commit base document state on every pointer move,
compute preview from base state + transient interaction state,
commit only on interaction end.

Make this explicit in code and documentation.

5. Separate document visuals from editor overlays

Document objects and UI overlays must be different rendering concerns.

Examples:

rectangle = document object
selection outline = overlay
resize handles = overlay
hover markers = overlay

Do not implement overlays as if they were part of the document model.

6. One action path for all updates

Canvas interactions and inspector edits must use the same action/command system.

Avoid duplicated mutation logic in multiple places.

If the rectangle can be resized from both:

canvas handle
inspector field

then both must flow through the same update pathway.

Code quality instructions
7. Prefer small explicit modules

Avoid large files that mix unrelated responsibilities.

Prefer:

focused files,
strongly typed interfaces,
explicit names,
simple predictable flow.

Do not create a “god component”.

8. Prefer boring code over clever code

This project is educational and architectural.

Do not use:

overly clever abstractions,
hidden magic,
unnecessary generic patterns,
premature optimization,
complicated state frameworks unless clearly justified.

Code should be understandable by a human reading it to learn architecture.

9. Make state ownership obvious

For every piece of state, it should be obvious:

who owns it,
who reads it,
who is allowed to change it,
whether it is persistent or transient.

If ownership is ambiguous, refactor.

10. Minimize accidental coupling

Canvas should not directly call inspector internals.
Inspector should not directly manipulate Konva nodes.
Toolbar should not directly mutate shape geometry.

All communication should happen through shared state + actions.

Documentation instructions
11. Document the “why”, not only the “what”

For each architectural decision, explain:

what was done,
why it was done this way,
what alternative was rejected,
how this supports future scaling.

This project should teach architecture, not only present code.

12. Keep docs synchronized with implementation

Do not write aspirational docs that describe features not actually implemented.

If something is planned but not built, mark it clearly as:

future work,
extension point,
optional next step.

The documentation must reflect reality.

13. Write docs as if onboarding another engineer

Assume another developer will open this repo and ask:

where is the truth?
where does drag preview live?
where is commit logic?
how can I add a second object type?
how can I swap the renderer?

The docs must answer these questions.

Error handling and resilience
14. Isolate risky UI zones

Wrap the canvas zone in an Error Boundary.

A rendering failure must not destroy the entire app shell.

Explain in docs:

what errors are isolated by the boundary,
what still requires local try/catch in event handlers,
how the app recovers.
15. Keep shell usable during canvas failure

If canvas fails:

toolbar should remain visible,
inspector should remain visible,
fallback UI should explain the failure clearly.

Do not allow one render crash to blank the whole app.

Extensibility instructions
16. Design for the next 3 obvious future steps

Even though the MVP is tiny, structure it so that it can later support:

multiple rectangles,
multiple object types,
tree panel,
second renderer,
camera/zoom system.

Do not implement all of these now.
Just avoid choices that would make them painful later.

17. Create clear extension points

Where appropriate, expose simple extension seams for:

adding a new object type,
adding a new tool,
adding a second renderer,
adding domain rules.

These can be documented even if not fully implemented.

UX/interaction discipline
18. Keep interaction semantics explicit

Be precise about:

select,
drag,
resize,
preview,
commit,
cancel,
keyboard behavior.

Do not leave interaction semantics implicit inside event handlers.

19. Use stable and predictable behavior

The project should feel like a tiny editor, not a random demo.

Selection, drag, resize, inspector sync, and error fallback should all feel deliberate and consistent.

20. Do not fake architecture

Do not simply split files while keeping the same mixed logic.

The structure must reflect actual responsibility boundaries, not cosmetic organization.

Final rule

At the end, review the project against this question:

“Is this a small working demo, or is this a small but architecturally correct editor laboratory?”

The result must be the second.
<!-- entities: DomainModule, DomainContract, domains/index.ts, registerDomain, ToolbarTool, ExportTemplate, DocumentState, AnyDocumentState -->

# Future Scaling

This lab is intentionally minimal but structured to show where to extend:

- Multiple objects: extend `DocumentState` to an array of objects and adjust selection to support ids or ranges.
- Second renderer: extract a renderer adapter interface and implement a `KonvaRenderer` now; add `CanvasRenderer` contract to swap later.
- Domain plugin system: **already implemented.** Adding a new subject-matter domain requires creating `src/domains/<name>.tsx` implementing `DomainModule<TData, TComputed>` and one `registerDomain()` call in `src/domains/index.ts`. The domain's toolbar tools (`toolbarTools`), inspector block (`InspectorSection`), canvas overlay (`renderOverlay`), and export templates (`exportTemplates`) are automatically wired by `DomainUIProvider` and the store event bridge with no changes to the host shell.
- Additional toolbar tools that mutate `activeTool` (select, rectangle, etc.) remain separate from domain-injected `ToolbarTool` buttons. Future multi-tool domains should register a dedicated `activeTool` value and extend the `Action` union in `store.tsx`.

Each extension should keep the separation of concerns shown here.

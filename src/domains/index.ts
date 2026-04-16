/**
 * domains/index.ts — Single registration point for all domain modules.
 *
 * Adding a new domain requires exactly two steps:
 *   1. Create src/domains/<name>.tsx implementing DomainModule<TData, TComputed>
 *   2. Import it here and call registerDomain()
 *
 * No other file needs to change. The domain becomes available in the Dashboard,
 * the Change Type dialog, and all DomainUIProvider consumers automatically.
 *
 * This file is imported once in main.tsx, before the React tree mounts.
 */
import { registerDomain } from '../core/domain-contract'
import { gridLayoutDomain } from './grid-layout'

registerDomain(gridLayoutDomain)

// ── Future domains ────────────────────────────────────────────────────────────
// import { facadesDomain } from './facades'
// registerDomain(facadesDomain)
//
// import { structuralDomain } from './structural'
// registerDomain(structuralDomain)

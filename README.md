# DWH

Canonical relational content model for AIGM.fi.

DWH is the canonical authority for website entities, explicit relations, ordering, symbols and deterministic projections.

WebEngine consumes DWH symbols. It does not know DWH storage, SQL schema, PHP internals or relation-table layout.

## Runtime model

```text
DWH canonical entities + relations
        ↓
symbolic projection
        ↓
#SITE
        ↓
WebEngine SiteTree consumer
        ↓
navigation / breadcrumbs / sitemap / routing / composition
```

`#SITE` replaces `site.json` as the SiteTree runtime identity. JSON may be used as a transport serialization, but a JSON file is not the authority.

## Initial website scope

```text
Entity
Relation
Ordering
Symbol
Projection
```

DWH does not own authentication, authorization policy, presentation rendering, browser navigation state or domain business behavior.

## Canonical rules

- One canonical authority per concern.
- Relations are explicit and never inferred from names, values or structural proximity.
- DWH symbols identify semantic projections, not files.
- Projection output is derived and rebuildable.
- WebEngine consumes projection contracts, not storage layout.
- PHP implements the contracts; PHP code is not the semantic authority.
- Consumer serialization must not become a second source of truth.

## Initial symbol

```text
#SITE
```

`#SITE` resolves to the canonical SiteTree projection shape consumed by WebEngine:

```text
id
label
path
children
```

The same DWH relation model may later expose additional symbols without creating duplicate truth.

See `Contracts/`.

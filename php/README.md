# DWH PHP runtime

PHP implementation of DWH contracts, initially serving the AIGM.fi website and MetaModule demo/catalog profiles.

The PHP runtime implements canonical DWH contracts. PHP class structure, SQL schema and persistence backend are implementation details and must not redefine DWH semantics.

## Responsibility

```text
DWH contracts
      ↓
PHP runtime
      ↓
entity/relation persistence
symbol + projection resolution
      ↓
WebEngine consumer boundary
```

The initial implementation must support the generic relational/projection model plus the website and MetaModule profiles:

```text
site hierarchy
content identity and relations
projector declarations/bindings
renderer bindings
route declarations
composition graph
action declarations
ordering
symbols/projections
```

## Initial runtime components

```text
EntityRepository
RelationRepository
SymbolRegistry
ProjectionRegistry
RelationResolver
ProjectionEngine
SiteProjector (#SITE)
MetaModuleCatalogProjector (#METAMODULE:CATALOG)
consumer/API binding
```

Names above describe implementation roles, not locked PHP class names.

## Boundary

WebEngine requests semantic projections. It must not query DWH tables directly.

```text
WebEngine -> project(symbol, context) -> DWH PHP -> projection envelope
```

DWH PHP does not authenticate users, own AccessCore policy, execute renderer modules, build DOM, run S3D scenes or execute domain business behavior.

Resolution does not imply authorization.

## Implementation rule

Build code from the contracts, not contracts from the database schema.

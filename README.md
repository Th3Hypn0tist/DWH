# DWH

Canonical relational website model for AIGM.fi.

DWH answers **where** a canonical website resource, relation or projection resolves. It owns declarative website structure. It does not execute browser behavior.

## Canonical responsibility split

```text
IAM        = who
AccessCore = authority / may
DWH        = where / what relates to what
WebEngine  = execute the declared web structure
WebGUI     = generic UI primitives
S3D        = spatial / 3D primitives
```

These responsibilities are intentionally non-overlapping.

## DWH responsibility

DWH is the canonical authority for declarative website structure:

```text
entities
relations
ordering
symbols
projections
site hierarchy
content identity and content relations
projector bindings
renderer bindings
route declarations
composition graph
action declarations
```

DWH does **not** own authentication, authorization policy, browser runtime execution, renderer lifecycle, DOM construction, 3D runtime, domain business execution or visual styling.

IAM establishes identity. AccessCore decides authority. WebEngine executes DWH projections. WebGUI and S3D provide rendering primitives downstream of WebEngine.

## Authority model

```text
DWH canonical entities + relations
              ↓
        named symbol
              ↓
     deterministic projection
              ↓
          WebEngine
              ↓
      runtime execution
         /          \
     WebGUI          S3D
```

DWH symbols are semantic identities. They are not filenames, URLs, SQL tables or PHP classes. A physical backend may change without changing canonical DWH identity.

## Initial website symbol

```text
#SITE
```

`#SITE` resolves the canonical public site hierarchy as a deterministic projection.

Current SiteTree projection node shape:

```text
id
label
path
children
```

The authority chain is:

```text
DWH entities + relations
        ↓
      #SITE
        ↓
WebEngine SiteTree runtime snapshot
        ↓
navigation / breadcrumbs / sitemap / current section / routing context
```

`site.json` is not canonical authority. JSON may be used as a transport serialization, cache or debug artifact, but the semantic identity remains `#SITE`.

## Declarative website model

DWH owns declarations and relationships between pages, sections, content, projectors, renderers, routes and actions. Relation names are canonical only when defined by contracts; they must not be inferred from prose or storage layout.

Ordering is relational projection data. Changing ordering changes a deterministic projection without changing entity identity.

## WebEngine boundary

```text
WebEngine
    ↓ project(symbol, context)
DWH projection interface
    ↓
canonical DWH entities + relations
```

WebEngine must not query DWH SQL tables directly, know PHP class structure, infer relations from physical storage, duplicate DWH relations as browser authority, or silently fall back to a second website structure.

DWH must not execute renderer code, build DOM, run S3D scenes, own WebEngine lifecycle state, or grant authorization because a resource can be resolved.

## IAM and AccessCore boundary

Resolution is not permission.

```text
IAM        -> who is the subject?
AccessCore -> may the subject do this?
DWH        -> where/how does the canonical resource resolve?
WebEngine  -> execute the resolved declaration
```

A resolvable DWH symbol never implies authorization.

## Relation model

Initial Entity shape:

```text
id
type
data?
```

Initial Relation shape:

```text
source
relation
target
order?
data?
```

Relations are explicit, directed and deterministic. They are never inferred from names, equal values, filenames, directory placement or physical proximity. Missing or ambiguous required relations fail visibly.

## Symbol and projection model

A symbol names a projection contract. Examples may include `#SITE`, `#CONTENT:HOME` or `#PAGE:LMTS`, but only explicitly contracted symbols are canonical.

A projection is derived and rebuildable. Projection output does not become a second editable source of truth. Equivalent canonical input plus the same projection definition must produce semantically equivalent output.

## PHP implementation

This repository contains the PHP implementation of the website DWH profile.

Canonical direction:

```text
Contracts
   ↓
PHP runtime
   ↓
storage adapters
```

not:

```text
database schema
   ↓
reverse-engineered semantics
```

PHP, MariaDB/MySQL, files or another backend are implementation details. They do not define DWH semantic identity.

The first PHP implementation is expected to provide entity storage, relation storage, a symbol registry, projection registry, relation resolver, `#SITE` projector and a consumer/API binding. Storage details remain private behind that interface.

## Repository layout

```text
DWH/
├── Contracts/
│   ├── 00-engine-contract.json
│   ├── 01-relation-model-contract.json
│   ├── 02-symbol-projection-contract.json
│   ├── 03-site-symbol-profile.json
│   ├── 04-website-declaration-profile.json
│   └── manifest.json
├── php/
└── README.md
```

## Architectural invariants

1. One canonical authority per concern.
2. DWH owns declarative website relations; WebEngine owns their browser execution.
3. IAM owns identity; DWH must not become IAM.
4. AccessCore owns authority decisions; DWH must not become AccessCore.
5. WebEngine consumes DWH symbols rather than DWH storage internals.
6. WebGUI remains a generic UI primitive layer.
7. S3D remains a generic spatial/3D primitive layer.
8. Projection does not create a second editable authority.
9. Serialization format does not define semantic identity.
10. Physical storage placement does not define semantic identity.
11. Relations are explicit and never guessed.
12. Runtime implementation follows contracts; implementation structure does not redefine them.

This repository starts deliberately with the website profile. The broader historical AIGMos DWH model can be added later without changing these responsibility boundaries.


## MetaModule model

DWH models MetaModules as canonical semantic compositions rather than application-specific runtimes.

```text
MetaModule
├── stable identity
├── explicit relations
├── consumed Universals
├── composition-specific schema/rules/operations where applicable
├── ports
└── optional Expose bindings
```

Placement such as Universal, Business, Strategy, Everyday, Studio or Administration does not create a new base type. The kind remains MetaModule.

## Expose

Expose is the binding surface for canonical ports.

Examples include REST, WebSocket, HTTP, OSC, MCP, CLI, filesystem and local runtime. PHP, Python and JavaScript are implementation languages, not Expose types.

A symbol may bind directly to a physical target. For example:

```text
#SITE
  ↓
filesystem Expose
  ↓
/home/www
```

The same semantic source may have multiple Expose bindings without creating duplicate authority.

## Final coverage audit

MetaModule completeness is reviewed in two separate gates.

```text
STRUCTURE COVERAGE
  identity
  relations
  composition
  ports
  Expose bindings

EVENT COVERAGE
  reviewed separately
  evidence-backed only
  missing Event -> EVENT_REVIEW_REQUIRED
```

Missing Event evidence does not block structural modeling. Events are reviewed MetaModule by MetaModule and must not be invented merely to satisfy coverage.


## MMDemo

`/mmdemo/` is a browsing/demo projection over canonical MetaModule definitions and isolated synthetic company data.

All synthetic demo-created identities use the `mmdemo.*` namespace. Canonical MetaModule and Universal identities retain their canonical names.

The initial synthetic company is **MMDemo Industries Oy**, a fictional Finnish B2B industrial sensor/automation company with sales, procurement, inventory, light assembly, project delivery, field service, finance, HR and strategy activity for 2026-07-01 through 2026-09-30.

The seed dataset is stored at:

```text
demo/mmdemo-industries-q3-2026.seed.json
```

The demo is designed so that strategy measurements and decisions can trace back to the same synthetic operational records used by Business MetaModules. Event coverage remains a separate review dimension.

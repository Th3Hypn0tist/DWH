# MMDemo

Browser/demo projection for the AIGMos MetaModule model.

Deployment:

```text
logical surface: /mmdemo/
test deploy:     /test/mmdemo/
production:      /mmdemo/ after explicit cutover
```

## Runtime chain

MMDemo is now a DWH-declared WebEngine surface:

```text
index.html
  ↓
WebEngine
  ↓
#SITE
  ↓
#WEB { path: /mmdemo/ }
  ↓
placement: MMDemo:browser
  ↓
#PROJECTOR:MMDemo:browser
  ↓
/app/mmdemo/renderers/browser.js
  ↓
#METAMODULE:CATALOG + mmdemo.* company data
```

Under the test instance root the physical files resolve as:

```text
/test/mmdemo/
/test/app/dwh/
/test/app/mmdemo/
/test/lib/webengine/
```

The logical nanoCMS Page path remains `/mmdemo/`; `/test/` never becomes canonical Page identity.

## Data

```text
data/company-q3-2026.json
data/relation-graph-q3-2026.json
```

The relation graph currently contains 840 synthetic entities and 1300 explicit directed relations. CI reconciles the graph back to the monthly Q3 summary, including sales, COGS, gross margin, purchases, cash, payroll, employee hours and inventory valuation.

The browser exposes an entity-type coverage view plus an incoming/outgoing relation explorer so records can be traversed directly. All 32 Business Universal semantic types are now exercised by exact `entity.type` evidence in the Q3 graph.

All synthetic record identities use `mmdemo.*`.

Canonical MetaModule/Universal identities retain canonical identity. Display names with unresolved current 1.5 member IDs stay unresolved and must not be promoted by the demo.

## Authority

MMDemo is not semantic authority.

- `#WEB` is the canonical Expose.nanoCMS web-structure projection.
- `#SITE` is derived from the same nanoCMSStructure source.
- `#PROJECTOR:MMDemo:browser` declares the demo browser renderer binding.
- `#METAMODULE:CATALOG` supplies the MetaModule browse/coverage projection.
- `mmdemo.*` data is synthetic demo instance data only.

BusinessSuite, Strategy and Everyday are grouping abstractions and are not Event owners. Actual member Composition MetaModules own Event review.


## Event audit

Event completeness is tracked separately from structural/demo coverage.

Current audited state:

```text
Business Universals   32 EVENT_REVIEW_REQUIRED
Platform Universals    8 EVENT_REVIEW_REQUIRED
GUI Universals         3 EVENT_REVIEW_REQUIRED
Editor                  1 EVENT_REVIEW_REQUIRED

BusinessSuite           NOT_EVENT_OWNER
Strategy                NOT_EVENT_OWNER
Everyday                NOT_EVENT_OWNER

ERP / CRM / HRM /
WMS / Projects          EVENT_REVIEW_REQUIRED
                        current 1.5 identity axis unresolved
```

The Universal canonical source contracts currently expose explicit empty `behavior.events` arrays. This does **not** mean “no Events are needed”; it means Event coverage is not yet proven.

Strategy and Everyday retain provenance links to older unlocked Composition contracts, but the newer 1.5 grouping model remains authoritative for current Event ownership.

Audit snapshot:

```text
data/metamodule-event-audit.json
```

CI validates that missing Events are not silently promoted to `EVENTS_PROVEN`.


## Strategy coverage

Strategy coverage is composition-derived from Business Universals.

```text
known Strategy labels   27 EXERCISED
unresolved C-suite       1 UNRESOLVED_ID
```

No Strategy-specific duplicate data engine is introduced. Each known Strategy method/capability/C-suite view carries a Business Universal requirement list sourced from the Strategy contract, and the coverage builder marks it `EXERCISED` only when every required Business Universal is exercised in the current demo graph.

Current composition evidence:

```text
data/strategy-business-universal-composition.json
```

Event review remains separate; structural/demo coverage does not imply `EVENTS_PROVEN`.

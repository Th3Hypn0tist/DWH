# MMDemo

Browser/demo projection for the AIGMos MetaModule model.

Deployment:

```text
logical surface: /mmdemo/
test deploy:     /test/mmdemo/
production:      /mmdemo/ after explicit cutover
```

The surface imports WebEngine relatively:

```text
../lib/webengine/webengine.js
```

so the same files work under both root and `/test/` instance roots.

## Data

```text
data/metamodule-catalog.json
data/company-q3-2026.json
```

All synthetic record identities use `mmdemo.*`.

Canonical MetaModule/Universal identities retain canonical identity. Display names with unresolved current 1.5 member IDs stay unresolved and must not be promoted by the demo.

## Authority

MMDemo is not semantic authority.

The catalog file is a non-authoritative projection fixture used until the same `#METAMODULE:CATALOG` shape is served by the PHP DWH projector. WebEngine consumes it through the normal DWH adapter boundary so replacing the fixture with a live projector does not change the browser consumer contract.

BusinessSuite, Strategy and Everyday are grouping abstractions and are not Event owners. Actual member Composition MetaModules own Event review.

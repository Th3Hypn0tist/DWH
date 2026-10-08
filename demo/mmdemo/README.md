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
data/company-q3-2026.json
```

All synthetic record identities use `mmdemo.*`.

Canonical MetaModule/Universal identities retain canonical identity. Display names with unresolved current 1.5 member IDs stay unresolved and must not be promoted by the demo.

## Authority

MMDemo is not semantic authority.

The MetaModule catalog is resolved live through the PHP DWH projection API at `../app/dwh/api/project.php`. MMDemo does not carry a duplicate catalog fixture. WebEngine consumes the `#METAMODULE:CATALOG` envelope through the normal DWH adapter boundary.

BusinessSuite, Strategy and Everyday are grouping abstractions and are not Event owners. Actual member Composition MetaModules own Event review.

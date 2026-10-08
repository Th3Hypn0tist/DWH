# PHP runtime

The PHP runtime implements the DWH website contracts.

Initial boundary:

```text
canonical entity/relation storage
        ↓
relation resolver
        ↓
symbol projection registry
        ↓
#SITE projector
        ↓
consumer adapter / serialized response
```

The PHP class layout, persistence backend and HTTP binding are implementation details. They must implement the symbol/projection contracts without exposing storage layout as public semantics.

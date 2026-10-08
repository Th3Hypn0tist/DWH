<?php
declare(strict_types=1);

use AIGM\DWH\JsonDocumentSource;
use AIGM\DWH\MetaModuleCatalogProjector;
use AIGM\DWH\ProjectionEngine;
use AIGM\DWH\ProjectionException;
use AIGM\DWH\ProjectionNotFoundException;

require_once __DIR__ . '/../src/ProjectionException.php';
require_once __DIR__ . '/../src/ProjectionNotFoundException.php';
require_once __DIR__ . '/../src/JsonDocumentSource.php';
require_once __DIR__ . '/../src/ProjectionEngine.php';
require_once __DIR__ . '/../src/MetaModuleCatalogProjector.php';

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$fixture = __DIR__ . '/../data/metamodule-catalog.json';

$source = new JsonDocumentSource($fixture);
$projector = new MetaModuleCatalogProjector($source);
$engine = new ProjectionEngine();

$engine->register(
    MetaModuleCatalogProjector::SYMBOL,
    static fn(array $context): array => $projector->project($context)
);

$resolved = $engine->project('#METAMODULE:CATALOG', ['surface' => 'test']);

expect($resolved['symbol'] === '#METAMODULE:CATALOG', 'symbol mismatch');
expect(isset($resolved['revision']) && strlen($resolved['revision']) === 64, 'revision must be sha256');
expect(is_array($resolved['data']['families']), 'families missing');
expect(is_array($resolved['data']['groups']), 'groups missing');
expect(is_array($resolved['data']['members']), 'members missing');
expect(is_array($resolved['data']['gaps']), 'gaps missing');

foreach ($resolved['data']['groups'] as $group) {
    expect(($group['event_status'] ?? null) === 'NOT_EVENT_OWNER', 'group claimed Event ownership');
}

try {
    $engine->project('#DOES:NOT:EXIST');
    throw new RuntimeException('missing projection did not fail');
} catch (ProjectionNotFoundException) {
}

try {
    $engine->register('#METAMODULE:CATALOG', static fn(): array => ['data' => []]);
    throw new RuntimeException('duplicate symbol registration did not fail');
} catch (ProjectionException) {
}

try {
    $engine->project('METAMODULE:CATALOG');
    throw new RuntimeException('invalid symbol did not fail');
} catch (ProjectionException) {
}

echo "OK\n";

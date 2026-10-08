<?php
declare(strict_types=1);

use AIGM\DWH\JsonDocumentSource;
use AIGM\DWH\MetaModuleCatalogProjector;
use AIGM\DWH\ProjectionEngine;
use AIGM\DWH\ProjectionException;
use AIGM\DWH\ProjectionNotFoundException;
use AIGM\DWH\SiteProjector;

require_once __DIR__ . '/../src/ProjectionException.php';
require_once __DIR__ . '/../src/ProjectionNotFoundException.php';
require_once __DIR__ . '/../src/JsonDocumentSource.php';
require_once __DIR__ . '/../src/ProjectionEngine.php';
require_once __DIR__ . '/../src/MetaModuleCatalogProjector.php';
require_once __DIR__ . '/../src/SiteProjector.php';

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

$siteProjector = new SiteProjector(
    new JsonDocumentSource(__DIR__ . '/../data/site-tree.json')
);

$engine->register(
    SiteProjector::SYMBOL,
    static fn(array $context): array => $siteProjector->project($context)
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

$site = $engine->project('#SITE', ['surface' => 'site']);
expect($site['symbol'] === '#SITE', '#SITE symbol mismatch');
expect(($site['data']['id'] ?? null) === 'aigm', '#SITE root mismatch');
expect(($site['data']['path'] ?? null) === '/', '#SITE root path mismatch');

$sitePaths = [];
$walk = static function(array $node) use (&$walk, &$sitePaths): void {
    if (isset($node['path'])) {
        $sitePaths[] = $node['path'];
    }
    foreach ($node['children'] ?? [] as $child) {
        $walk($child);
    }
};
$walk($site['data']);

expect(in_array('/iam/', $sitePaths, true), '#SITE missing /iam/');
expect(in_array('/lmts/', $sitePaths, true), '#SITE missing /lmts/');
expect(in_array('/mmdemo/', $sitePaths, true), '#SITE missing /mmdemo/');

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

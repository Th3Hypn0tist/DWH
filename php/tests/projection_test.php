<?php
declare(strict_types=1);

use AIGM\DWH\JsonDocumentSource;
use AIGM\DWH\MetaModuleCatalogProjector;
use AIGM\DWH\ProjectionEngine;
use AIGM\DWH\ProjectionException;
use AIGM\DWH\ProjectionNotFoundException;
use AIGM\DWH\SiteProjector;
use AIGM\DWH\ContentProjector;
use AIGM\DWH\ActionProjector;
use AIGM\DWH\ProjectorProjector;
use AIGM\DWH\NanoCmsStructureSource;
use AIGM\DWH\WebProjector;

require_once __DIR__ . '/../src/ProjectionException.php';
require_once __DIR__ . '/../src/ProjectionNotFoundException.php';
require_once __DIR__ . '/../src/JsonDocumentSource.php';
require_once __DIR__ . '/../src/ProjectionEngine.php';
require_once __DIR__ . '/../src/MetaModuleCatalogProjector.php';
require_once __DIR__ . '/../src/SiteProjector.php';
require_once __DIR__ . '/../src/ContentProjector.php';
require_once __DIR__ . '/../src/ActionProjector.php';
require_once __DIR__ . '/../src/ProjectorProjector.php';
require_once __DIR__ . '/../src/NanoCmsStructureSource.php';
require_once __DIR__ . '/../src/WebProjector.php';

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

$nanoCms = new NanoCmsStructureSource(
    new JsonDocumentSource(__DIR__ . '/../data/web-structure.json')
);

$siteProjector = new SiteProjector($nanoCms);

$engine->register(
    SiteProjector::SYMBOL,
    static fn(array $context): array => $siteProjector->project($context)
);

$webProjector = new WebProjector($nanoCms);

$engine->register(
    WebProjector::SYMBOL,
    static fn(array $context): array => $webProjector->project($context)
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

$web = $engine->project('#WEB', ['path' => '/mmdemo/']);
expect($web['symbol'] === '#WEB', '#WEB symbol mismatch');
expect(($web['data']['page']['id'] ?? null) === 'mmdemo', '#WEB Page mismatch');
expect(($web['data']['placements'][0]['ref'] ?? null) === 'MMDemo:browser', '#WEB placement mismatch');
expect(($web['data']['placements'][0]['order'] ?? null) === 10, '#WEB placement order mismatch');

try {
    $engine->project('#WEB', ['path' => '/missing/']);
    throw new RuntimeException('missing #WEB Page did not fail');
} catch (ProjectionNotFoundException) {
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


$contentFixture = tempnam(sys_get_temp_dir(), 'dwh-content-');
$actionFixture = tempnam(sys_get_temp_dir(), 'dwh-action-');

if ($contentFixture === false || $actionFixture === false) {
    throw new RuntimeException('failed to create temporary projection fixtures');
}

file_put_contents($contentFixture, json_encode([
    '#CONTENT:mmdemo:overview' => [
        'id' => 'overview',
        'domain' => 'mmdemo',
        'type' => 'text',
        'provider' => 'inline',
        'content' => 'MMDemo overview',
    ],
], JSON_THROW_ON_ERROR));

file_put_contents($actionFixture, json_encode([
    '#ACTION:mmdemo:refresh' => [
        'id' => 'refresh',
        'label' => 'Refresh',
        'action' => 'mmdemo:refresh',
    ],
], JSON_THROW_ON_ERROR));

$dynamicEngine = new ProjectionEngine();

$contentProjector = new ContentProjector(new JsonDocumentSource($contentFixture));
$dynamicEngine->registerPattern(
    ContentProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $contentProjector->project($symbol, $matches, $context)
);

$actionProjector = new ActionProjector(new JsonDocumentSource($actionFixture));
$dynamicEngine->registerPattern(
    ActionProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $actionProjector->project($symbol, $matches, $context)
);

$content = $dynamicEngine->project('#CONTENT:mmdemo:overview');
expect(($content['data']['content'] ?? null) === 'MMDemo overview', 'dynamic Content projection failed');

$action = $dynamicEngine->project('#ACTION:mmdemo:refresh');
expect(($action['data']['action'] ?? null) === 'mmdemo:refresh', 'dynamic Action projection failed');

try {
    $dynamicEngine->project('#CONTENT:mmdemo:missing');
    throw new RuntimeException('missing dynamic Content projection did not fail');
} catch (ProjectionNotFoundException) {
}

try {
    $dynamicEngine->registerPattern(
        ContentProjector::SYMBOL_PATTERN,
        static fn(): array => ['data' => []]
    );
    throw new RuntimeException('duplicate pattern registration did not fail');
} catch (ProjectionException) {
}

@unlink($contentFixture);
@unlink($actionFixture);


$projectorFixture = tempnam(sys_get_temp_dir(), 'dwh-projector-');
if ($projectorFixture === false) {
    throw new RuntimeException('failed to create temporary Projector fixture');
}

file_put_contents($projectorFixture, json_encode([
    '#PROJECTOR:MMDemo:overview:compact' => [
        'renderer' => '/app/mmdemo/renderers/overview.js',
        'projection' => [
            'title' => 'MMDemo overview',
            'compact' => true,
        ],
    ],
], JSON_THROW_ON_ERROR));

$projectorEngine = new ProjectionEngine();
$projectorProjector = new ProjectorProjector(new JsonDocumentSource($projectorFixture));
$projectorEngine->registerPattern(
    ProjectorProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $projectorProjector->project($symbol, $matches, $context)
);

$projected = $projectorEngine->project('#PROJECTOR:MMDemo:overview:compact');
expect(($projected['data']['renderer'] ?? null) === '/app/mmdemo/renderers/overview.js', 'dynamic Projector renderer mismatch');
expect(($projected['data']['projection']['compact'] ?? null) === true, 'dynamic Projector projection mismatch');

try {
    $projectorEngine->project('#PROJECTOR:MMDemo:missing');
    throw new RuntimeException('missing dynamic Projector projection did not fail');
} catch (ProjectionNotFoundException) {
}

@unlink($projectorFixture);

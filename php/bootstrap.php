<?php
declare(strict_types=1);

use AIGM\DWH\JsonDocumentSource;
use AIGM\DWH\MetaModuleCatalogProjector;
use AIGM\DWH\ProjectionEngine;

require_once __DIR__ . '/src/ProjectionException.php';
require_once __DIR__ . '/src/ProjectionNotFoundException.php';
require_once __DIR__ . '/src/JsonDocumentSource.php';
require_once __DIR__ . '/src/ProjectionEngine.php';
require_once __DIR__ . '/src/MetaModuleCatalogProjector.php';

$catalogPath = getenv('DWH_METAMODULE_CATALOG_PATH');
if (!is_string($catalogPath) || $catalogPath === '') {
    $catalogPath = __DIR__ . '/data/metamodule-catalog.json';
}

$engine = new ProjectionEngine();
$catalogProjector = new MetaModuleCatalogProjector(
    new JsonDocumentSource($catalogPath)
);

$engine->register(
    MetaModuleCatalogProjector::SYMBOL,
    static fn(array $context): array => $catalogProjector->project($context)
);

return $engine;

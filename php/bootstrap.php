<?php
declare(strict_types=1);

use AIGM\DWH\JsonDocumentSource;
use AIGM\DWH\MetaModuleCatalogProjector;
use AIGM\DWH\ProjectionEngine;
use AIGM\DWH\SiteProjector;
use AIGM\DWH\ContentProjector;
use AIGM\DWH\ActionProjector;
use AIGM\DWH\ProjectorProjector;

require_once __DIR__ . '/src/ProjectionException.php';
require_once __DIR__ . '/src/ProjectionNotFoundException.php';
require_once __DIR__ . '/src/JsonDocumentSource.php';
require_once __DIR__ . '/src/ProjectionEngine.php';
require_once __DIR__ . '/src/MetaModuleCatalogProjector.php';
require_once __DIR__ . '/src/SiteProjector.php';
require_once __DIR__ . '/src/ContentProjector.php';
require_once __DIR__ . '/src/ActionProjector.php';
require_once __DIR__ . '/src/ProjectorProjector.php';

$catalogPath = getenv('DWH_METAMODULE_CATALOG_PATH');
if (!is_string($catalogPath) || $catalogPath === '') {
    $catalogPath = __DIR__ . '/data/metamodule-catalog.json';
}

$sitePath = getenv('DWH_SITE_TREE_PATH');
if (!is_string($sitePath) || $sitePath === '') {
    $sitePath = __DIR__ . '/data/site-tree.json';
}

$engine = new ProjectionEngine();
$catalogProjector = new MetaModuleCatalogProjector(
    new JsonDocumentSource($catalogPath)
);

$engine->register(
    MetaModuleCatalogProjector::SYMBOL,
    static fn(array $context): array => $catalogProjector->project($context)
);

$siteProjector = new SiteProjector(
    new JsonDocumentSource($sitePath)
);

$engine->register(
    SiteProjector::SYMBOL,
    static fn(array $context): array => $siteProjector->project($context)
);

$contentPath = getenv('DWH_CONTENT_PATH');
if (!is_string($contentPath) || $contentPath === '') {
    $contentPath = __DIR__ . '/data/content.json';
}

$contentProjector = new ContentProjector(
    new JsonDocumentSource($contentPath)
);

$engine->registerPattern(
    ContentProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $contentProjector->project($symbol, $matches, $context)
);

$actionPath = getenv('DWH_ACTION_PATH');
if (!is_string($actionPath) || $actionPath === '') {
    $actionPath = __DIR__ . '/data/actions.json';
}

$actionProjector = new ActionProjector(
    new JsonDocumentSource($actionPath)
);

$engine->registerPattern(
    ActionProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $actionProjector->project($symbol, $matches, $context)
);

$projectorPath = getenv('DWH_PROJECTOR_PATH');
if (!is_string($projectorPath) || $projectorPath === '') {
    $projectorPath = __DIR__ . '/data/projectors.json';
}

$projectorProjector = new ProjectorProjector(
    new JsonDocumentSource($projectorPath)
);

$engine->registerPattern(
    ProjectorProjector::SYMBOL_PATTERN,
    static fn(string $symbol, array $matches, array $context): array
        => $projectorProjector->project($symbol, $matches, $context)
);

return $engine;

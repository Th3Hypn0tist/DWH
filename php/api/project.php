<?php
declare(strict_types=1);

use AIGM\DWH\ProjectionException;
use AIGM\DWH\ProjectionNotFoundException;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$symbol = null;
$context = [];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $symbol = $_GET['symbol'] ?? null;
} else {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        respond(400, ['ok' => false, 'error' => 'invalid_request']);
    }

    try {
        $request = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        respond(400, ['ok' => false, 'error' => 'invalid_json']);
    }

    if (!is_array($request)) {
        respond(400, ['ok' => false, 'error' => 'invalid_request']);
    }

    $symbol = $request['symbol'] ?? null;
    $context = isset($request['context']) && is_array($request['context'])
        ? $request['context']
        : [];
}

if (!is_string($symbol) || $symbol === '') {
    respond(400, ['ok' => false, 'error' => 'symbol_required']);
}

try {
    /** @var AIGM\DWH\ProjectionEngine $engine */
    $engine = require __DIR__ . '/../bootstrap.php';
    respond(200, $engine->project($symbol, $context));
} catch (ProjectionNotFoundException) {
    respond(404, ['ok' => false, 'error' => 'projection_not_found']);
} catch (ProjectionException) {
    respond(400, ['ok' => false, 'error' => 'projection_invalid']);
} catch (Throwable) {
    respond(500, ['ok' => false, 'error' => 'server_error']);
}

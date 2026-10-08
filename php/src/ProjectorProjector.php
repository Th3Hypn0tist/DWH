<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class ProjectorProjector
{
    public const SYMBOL_PATTERN = '/^#PROJECTOR:([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)(?::[A-Za-z0-9][A-Za-z0-9_-]*)*$/';

    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function project(string $symbol, array $matches, array $context = []): array
    {
        $document = $this->source->load();
        $records = $document['data'];

        if (!array_key_exists($symbol, $records) || !is_array($records[$symbol])) {
            throw new ProjectionNotFoundException('Projector projection not found.');
        }

        $record = $records[$symbol];
        $this->validate($record, $matches[1]);

        return [
            'data' => $record,
            'revision' => $document['revision'],
        ];
    }

    private function validate(array $record, string $domain): void
    {
        $keys = array_keys($record);
        sort($keys);
        $expected = ['projection', 'renderer'];
        sort($expected);

        if ($keys !== $expected) {
            throw new ProjectionException('Invalid Projector projection fields.');
        }

        $renderer = $record['renderer'] ?? null;
        $logicalPrefix = '/app/' . strtolower($domain) . '/renderers/';

        if (!is_string($renderer)
            || !str_starts_with($renderer, $logicalPrefix)
            || str_contains($renderer, '?')
            || str_contains($renderer, '#')
            || str_contains($renderer, '\\')) {
            throw new ProjectionException('Invalid Projector renderer binding.');
        }

        $suffix = substr($renderer, strlen($logicalPrefix));
        if (!preg_match('/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.js$/', $suffix)) {
            throw new ProjectionException('Invalid Projector renderer module path.');
        }

        if (!is_array($record['projection'] ?? null)) {
            throw new ProjectionException('Projector projection payload must be an object.');
        }

        $this->validateDeclarative($record['projection'], 0);
    }

    private function validateDeclarative(mixed $value, int $depth): void
    {
        if ($depth > 64) {
            throw new ProjectionException('Projector projection exceeds maximum structure depth.');
        }

        if ($value === null || is_string($value) || is_bool($value) || is_int($value)) {
            return;
        }

        if (is_float($value)) {
            if (!is_finite($value)) {
                throw new ProjectionException('Projector projection contains non-finite number.');
            }
            return;
        }

        if (!is_array($value)) {
            throw new ProjectionException('Projector projection contains non-declarative value.');
        }

        foreach ($value as $key => $child) {
            if (is_string($key) && in_array($key, ['__proto__', 'prototype', 'constructor'], true)) {
                throw new ProjectionException('Projector projection contains forbidden key.');
            }
            $this->validateDeclarative($child, $depth + 1);
        }
    }
}

<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class ContentProjector
{
    public const SYMBOL_PATTERN = '/^#CONTENT:([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/';

    private const TYPES = ['text', 'image', 'svg', 'video', 'embed', 'file'];

    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function project(string $symbol, array $matches, array $context = []): array
    {
        $document = $this->source->load();
        $records = $document['data'];

        if (!array_key_exists($symbol, $records) || !is_array($records[$symbol])) {
            throw new ProjectionNotFoundException('Content projection not found.');
        }

        $record = $records[$symbol];
        $this->validate($record, $matches[1], $matches[2]);

        return [
            'data' => $record,
            'revision' => $document['revision'],
        ];
    }

    private function validate(array $record, string $domain, string $id): void
    {
        $keys = array_keys($record);
        sort($keys);
        $expected = ['content', 'domain', 'id', 'provider', 'type'];
        sort($expected);

        if ($keys !== $expected) {
            throw new ProjectionException('Invalid Content projection fields.');
        }

        if (($record['domain'] ?? null) !== $domain || ($record['id'] ?? null) !== $id) {
            throw new ProjectionException('Content symbol/record identity mismatch.');
        }

        if (!is_string($record['provider']) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/', $record['provider'])) {
            throw new ProjectionException('Invalid Content provider.');
        }

        if (!is_string($record['type']) || !in_array($record['type'], self::TYPES, true)) {
            throw new ProjectionException('Invalid Content type.');
        }

        if (!is_string($record['content'])) {
            throw new ProjectionException('Invalid Content payload.');
        }
    }
}

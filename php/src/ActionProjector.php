<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class ActionProjector
{
    public const SYMBOL_PATTERN = '/^#ACTION:([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/';

    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function project(string $symbol, array $matches, array $context = []): array
    {
        $document = $this->source->load();
        $records = $document['data'];

        if (!array_key_exists($symbol, $records) || !is_array($records[$symbol])) {
            throw new ProjectionNotFoundException('Action projection not found.');
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
        $expected = ['action', 'id', 'label'];
        sort($expected);

        if ($keys !== $expected) {
            throw new ProjectionException('Invalid Action projection fields.');
        }

        if (($record['id'] ?? null) !== $id) {
            throw new ProjectionException('Action symbol/record identity mismatch.');
        }

        if (!is_string($record['label']) || trim($record['label']) === '' || trim($record['label']) !== $record['label']) {
            throw new ProjectionException('Invalid Action label.');
        }

        if (!is_string($record['action'])
            || !preg_match('/^([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/', $record['action'], $actionMatch)
            || $actionMatch[1] !== $domain) {
            throw new ProjectionException('Action reference domain mismatch.');
        }
    }
}

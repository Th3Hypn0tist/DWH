<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class MetaModuleCatalogProjector
{
    public const SYMBOL = '#METAMODULE:CATALOG';

    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function project(array $context = []): array
    {
        $document = $this->source->load();
        $data = $document['data'];

        $this->validate($data);

        return [
            'data' => $data,
            'revision' => $document['revision'],
        ];
    }

    private function validate(array $data): void
    {
        foreach (['families', 'groups', 'members', 'gaps'] as $required) {
            if (!array_key_exists($required, $data) || !is_array($data[$required])) {
                throw new ProjectionException("MetaModule catalog missing required array: {$required}");
            }
        }

        if (($data['symbol'] ?? null) !== self::SYMBOL) {
            throw new ProjectionException('MetaModule catalog symbol mismatch.');
        }

        foreach ($data['families'] as $family) {
            if (!is_array($family) || !isset($family['id'], $family['members']) || !is_array($family['members'])) {
                throw new ProjectionException('Invalid MetaModule family projection.');
            }

            if (isset($family['member_count']) && $family['member_count'] !== count($family['members'])) {
                throw new ProjectionException('MetaModule family member_count mismatch.');
            }
        }

        foreach ($data['groups'] as $group) {
            if (!is_array($group) || !isset($group['id'], $group['member_count'])) {
                throw new ProjectionException('Invalid MetaModule group projection.');
            }

            if (($group['event_status'] ?? null) !== 'NOT_EVENT_OWNER') {
                throw new ProjectionException('MetaModule grouping abstraction must be NOT_EVENT_OWNER.');
            }
        }
    }
}

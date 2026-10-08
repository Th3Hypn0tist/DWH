<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class SiteProjector
{
    public const SYMBOL = '#SITE';

    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function project(array $context = []): array
    {
        $document = $this->source->load();
        $data = $document['data'];

        $this->validateTree($data);

        return [
            'data' => $data,
            'revision' => $document['revision'],
        ];
    }

    private function validateTree(array $root): void
    {
        $ids = [];
        $paths = [];
        $this->validateNode($root, $ids, $paths);
    }

    private function validateNode(array $node, array &$ids, array &$paths): void
    {
        $allowed = ['id', 'label', 'path', 'children'];

        foreach (array_keys($node) as $key) {
            if (!in_array($key, $allowed, true)) {
                throw new ProjectionException("Unknown #SITE node field: {$key}");
            }
        }

        $id = $node['id'] ?? null;
        $label = $node['label'] ?? null;

        if (!is_string($id) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/', $id)) {
            throw new ProjectionException('Invalid #SITE node id.');
        }

        if (!is_string($label) || trim($label) === '' || trim($label) !== $label) {
            throw new ProjectionException('Invalid #SITE node label.');
        }

        if (isset($ids[$id])) {
            throw new ProjectionException('Duplicate #SITE node id.');
        }
        $ids[$id] = true;

        if (array_key_exists('path', $node)) {
            $path = $node['path'];

            if (!is_string($path) || $path === '' || trim($path) !== $path || $path[0] !== '/') {
                throw new ProjectionException('Invalid #SITE node path.');
            }

            if (str_contains($path, '?') || str_contains($path, '#')) {
                throw new ProjectionException('Invalid #SITE node path.');
            }

            if (isset($paths[$path])) {
                throw new ProjectionException('Duplicate #SITE node path.');
            }
            $paths[$path] = true;
        }

        $children = $node['children'] ?? [];
        if (!is_array($children)) {
            throw new ProjectionException('#SITE children must be an array.');
        }

        foreach ($children as $child) {
            if (!is_array($child)) {
                throw new ProjectionException('#SITE child must be an object.');
            }
            $this->validateNode($child, $ids, $paths);
        }
    }
}

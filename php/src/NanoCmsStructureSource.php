<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class NanoCmsStructureSource
{
    public function __construct(private readonly JsonDocumentSource $source)
    {
    }

    public function load(): array
    {
        $document = $this->source->load();
        $data = $document['data'];

        $this->validateDocument($data);

        return [
            'data' => $data,
            'revision' => $document['revision'],
        ];
    }

    public function projectSiteTree(): array
    {
        $document = $this->load();
        $data = $document['data'];
        $routesByPage = [];

        foreach ($data['routes'] as $path => $pageId) {
            $routesByPage[$pageId] = $path;
        }

        $build = function(string $pageId) use (&$build, $data, $routesByPage): array {
            $page = $data['pages'][$pageId];

            $node = [
                'id' => $page['id'],
                'label' => $page['menuitem'],
                'children' => [],
            ];

            if (isset($routesByPage[$pageId])) {
                $node['path'] = $routesByPage[$pageId];
            }

            foreach ($page['children'] as $childId) {
                $node['children'][] = $build($childId);
            }

            return $node;
        };

        return [
            'data' => $build($data['root']),
            'revision' => $document['revision'],
        ];
    }

    public function projectPageByPath(string $path): array
    {
        $document = $this->load();
        $data = $document['data'];

        if (!array_key_exists($path, $data['routes'])) {
            throw new ProjectionNotFoundException('nanoCMS Page route not found.');
        }

        $pageId = $data['routes'][$path];
        $page = $data['pages'][$pageId];

        $children = [];
        foreach ($page['children'] as $childId) {
            $child = $data['pages'][$childId];
            $childPath = array_search($childId, $data['routes'], true);

            $ref = [
                'id' => $child['id'],
                'title' => $child['title'],
                'menuitem' => $child['menuitem'],
                'description' => $child['description'],
            ];

            if ($childPath !== false) {
                $ref['path'] = $childPath;
            }

            $children[] = $ref;
        }

        $placements = $page['placements'];
        usort(
            $placements,
            static fn(array $a, array $b): int => ($a['order'] <=> $b['order'])
        );

        return [
            'data' => [
                'page' => [
                    'id' => $page['id'],
                    'title' => $page['title'],
                    'menuitem' => $page['menuitem'],
                    'description' => $page['description'],
                ],
                'children' => $children,
                'placements' => $placements,
            ],
            'revision' => $document['revision'],
        ];
    }

    private function validateDocument(array $data): void
    {
        if (!isset($data['root']) || !is_string($data['root'])) {
            throw new ProjectionException('nanoCMS structure requires root page id.');
        }
        if (!isset($data['pages']) || !is_array($data['pages'])) {
            throw new ProjectionException('nanoCMS structure requires pages map.');
        }
        if (!isset($data['routes']) || !is_array($data['routes'])) {
            throw new ProjectionException('nanoCMS structure requires routes map.');
        }
        if (!isset($data['pages'][$data['root']])) {
            throw new ProjectionException('nanoCMS root page does not exist.');
        }

        $ids = [];

        foreach ($data['pages'] as $key => $page) {
            if (!is_array($page)) {
                throw new ProjectionException('nanoCMS Page must be an object.');
            }

            $expected = ['children', 'description', 'id', 'menuitem', 'placements', 'title'];
            $keys = array_keys($page);
            sort($keys);
            sort($expected);

            if ($keys !== $expected) {
                throw new ProjectionException('nanoCMS Page fields do not match canonical structure.');
            }

            if (!is_string($page['id'])
                || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/', $page['id'])
                || $page['id'] !== $key) {
                throw new ProjectionException('Invalid nanoCMS Page id.');
            }

            if (isset($ids[$page['id']])) {
                throw new ProjectionException('Duplicate nanoCMS Page id.');
            }
            $ids[$page['id']] = true;

            foreach (['title', 'menuitem', 'description'] as $field) {
                if (!is_string($page[$field])) {
                    throw new ProjectionException("nanoCMS Page {$field} must be a string.");
                }
            }

            if ($page['title'] === '' || trim($page['title']) !== $page['title']) {
                throw new ProjectionException('nanoCMS Page title must be non-empty and trimmed.');
            }

            if ($page['menuitem'] === '' || trim($page['menuitem']) !== $page['menuitem']) {
                throw new ProjectionException('nanoCMS Page menuitem must be non-empty and trimmed.');
            }

            if (!is_array($page['children']) || !is_array($page['placements'])) {
                throw new ProjectionException('nanoCMS Page children/placements must be arrays.');
            }

            $orders = [];
            foreach ($page['placements'] as $placement) {
                $this->validatePlacement($placement);

                if (isset($orders[$placement['order']])) {
                    throw new ProjectionException('Duplicate placement order within nanoCMS Page.');
                }
                $orders[$placement['order']] = true;
            }
        }

        foreach ($data['pages'] as $page) {
            foreach ($page['children'] as $childId) {
                if (!is_string($childId) || !isset($data['pages'][$childId])) {
                    throw new ProjectionException('nanoCMS Page child reference does not resolve.');
                }
            }
        }

        $seenRoutes = [];
        foreach ($data['routes'] as $path => $pageId) {
            if (!is_string($path)
                || $path === ''
                || $path[0] !== '/'
                || trim($path) !== $path
                || str_contains($path, '?')
                || str_contains($path, '#')) {
                throw new ProjectionException('Invalid nanoCMS route path.');
            }

            if (!is_string($pageId) || !isset($data['pages'][$pageId])) {
                throw new ProjectionException('nanoCMS route target does not resolve.');
            }

            if (isset($seenRoutes[$pageId])) {
                throw new ProjectionException('nanoCMS Page has more than one canonical route.');
            }
            $seenRoutes[$pageId] = true;
        }

        $this->validateTree($data, $data['root'], []);
    }

    private function validateTree(array $data, string $pageId, array $ancestors): void
    {
        if (in_array($pageId, $ancestors, true)) {
            throw new ProjectionException('nanoCMS Page hierarchy contains a cycle.');
        }

        $next = [...$ancestors, $pageId];
        foreach ($data['pages'][$pageId]['children'] as $childId) {
            $this->validateTree($data, $childId, $next);
        }
    }

    private function validatePlacement(mixed $placement): void
    {
        if (!is_array($placement)) {
            throw new ProjectionException('nanoCMS placement must be an object.');
        }

        $expected = ['id', 'kind', 'order', 'ref', 'title'];
        $keys = array_keys($placement);
        sort($keys);
        sort($expected);

        if ($keys !== $expected) {
            throw new ProjectionException('Invalid nanoCMS placement fields.');
        }

        if (!is_string($placement['id'])
            || !preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]*$/', $placement['id'])) {
            throw new ProjectionException('Invalid nanoCMS placement id.');
        }

        if ($placement['kind'] !== 'projector') {
            throw new ProjectionException('Unsupported nanoCMS placement kind.');
        }

        if (!is_int($placement['order']) || $placement['order'] < 0) {
            throw new ProjectionException('nanoCMS placement order must be a non-negative integer.');
        }

        if (!is_string($placement['ref'])
            || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*(?::[A-Za-z0-9][A-Za-z0-9_-]*)+$/', $placement['ref'])) {
            throw new ProjectionException('Invalid nanoCMS projector placement reference.');
        }

        if ($placement['title'] !== null
            && (!is_string($placement['title'])
                || trim($placement['title']) === ''
                || trim($placement['title']) !== $placement['title'])) {
            throw new ProjectionException('nanoCMS placement title must be null or a trimmed non-empty string.');
        }
    }
}

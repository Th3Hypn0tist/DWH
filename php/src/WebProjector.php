<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class WebProjector
{
    public const SYMBOL = '#WEB';

    public function __construct(private readonly NanoCmsStructureSource $source)
    {
    }

    public function project(array $context = []): array
    {
        $path = $context['path'] ?? null;

        if (!is_string($path) || $path === '') {
            throw new ProjectionException('#WEB projection requires context.path.');
        }

        return $this->source->projectPageByPath($path);
    }
}

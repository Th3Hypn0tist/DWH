<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class SiteProjector
{
    public const SYMBOL = '#SITE';

    public function __construct(private readonly NanoCmsStructureSource $source)
    {
    }

    public function project(array $context = []): array
    {
        return $this->source->projectSiteTree();
    }
}

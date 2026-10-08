<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class JsonDocumentSource
{
    public function __construct(private readonly string $path)
    {
    }

    public function load(): array
    {
        if ($this->path === '' || !is_file($this->path) || !is_readable($this->path)) {
            throw new ProjectionException('DWH projection source is not readable.');
        }

        $raw = file_get_contents($this->path);
        if ($raw === false || $raw === '') {
            throw new ProjectionException('DWH projection source is empty or unreadable.');
        }

        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new ProjectionException('DWH projection source contains invalid JSON.', 0, $e);
        }

        if (!is_array($data)) {
            throw new ProjectionException('DWH projection source must decode to an object.');
        }

        return [
            'data' => $data,
            'revision' => hash('sha256', $raw),
        ];
    }
}

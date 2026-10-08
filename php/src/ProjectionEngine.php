<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class ProjectionEngine
{
    private const SYMBOL_PATTERN = '/^#[A-Za-z][A-Za-z0-9_:-]*$/';

    /** @var array<string, callable> */
    private array $projectors = [];

    public function register(string $symbol, callable $projector): void
    {
        $this->assertSymbol($symbol);

        if (isset($this->projectors[$symbol])) {
            throw new ProjectionException('DWH symbol already registered.');
        }

        $this->projectors[$symbol] = $projector;
    }

    public function project(string $symbol, array $context = []): array
    {
        $this->assertSymbol($symbol);

        if (!isset($this->projectors[$symbol])) {
            throw new ProjectionNotFoundException('DWH projection not found.');
        }

        $result = ($this->projectors[$symbol])($context);

        if (!is_array($result) || !array_key_exists('data', $result)) {
            throw new ProjectionException('DWH projector returned an invalid result.');
        }

        $envelope = [
            'symbol' => $symbol,
            'data' => $result['data'],
        ];

        if (isset($result['revision'])) {
            $envelope['revision'] = (string) $result['revision'];
        }

        $envelope['generated_at'] = isset($result['generated_at'])
            ? (string) $result['generated_at']
            : gmdate('c');

        return $envelope;
    }

    private function assertSymbol(string $symbol): void
    {
        if (!preg_match(self::SYMBOL_PATTERN, $symbol)) {
            throw new ProjectionException('Invalid DWH symbol.');
        }
    }
}

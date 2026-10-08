<?php
declare(strict_types=1);

namespace AIGM\DWH;

final class ProjectionEngine
{
    private const SYMBOL_PATTERN = '/^#[A-Za-z][A-Za-z0-9_:-]*$/';

    /** @var array<string, callable> */
    private array $projectors = [];

    /** @var array<int, array{pattern:string, projector:callable}> */
    private array $patternProjectors = [];

    public function register(string $symbol, callable $projector): void
    {
        $this->assertSymbol($symbol);

        if (isset($this->projectors[$symbol])) {
            throw new ProjectionException('DWH symbol already registered.');
        }

        $this->projectors[$symbol] = $projector;
    }

    public function registerPattern(string $pattern, callable $projector): void
    {
        if ($pattern === '' || @preg_match($pattern, '') === false) {
            throw new ProjectionException('Invalid DWH symbol pattern.');
        }

        foreach ($this->patternProjectors as $registered) {
            if ($registered['pattern'] === $pattern) {
                throw new ProjectionException('DWH symbol pattern already registered.');
            }
        }

        $this->patternProjectors[] = [
            'pattern' => $pattern,
            'projector' => $projector,
        ];
    }

    public function project(string $symbol, array $context = []): array
    {
        $this->assertSymbol($symbol);

        if (isset($this->projectors[$symbol])) {
            $result = ($this->projectors[$symbol])($context);
            return $this->envelope($symbol, $result);
        }

        foreach ($this->patternProjectors as $registered) {
            $matches = [];
            if (preg_match($registered['pattern'], $symbol, $matches) === 1) {
                $result = ($registered['projector'])($symbol, $matches, $context);
                return $this->envelope($symbol, $result);
            }
        }

        throw new ProjectionNotFoundException('DWH projection not found.');
    }

    private function envelope(string $symbol, mixed $result): array
    {
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

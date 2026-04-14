<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use DateTimeInterface;
use InvalidArgumentException;
use PDO;

final class CampaignModel
{
    private const GRANULARITIES = ['day', 'hour', 'week', 'month'];

    /**
     * @return list<array{bucket: string, total: int}>
     */
    public function countAcuerdosGrouped(
        string $campaignKey,
        DateTimeInterface $from,
        DateTimeInterface $to,
        string $granularity
    ): array {
        if (!in_array($granularity, self::GRANULARITIES, true)) {
            throw new InvalidArgumentException('invalid_granularity');
        }

        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        if (!isset($map[$campaignKey])) {
            throw new InvalidArgumentException('invalid_campaign');
        }

        $table = $this->assertSqlIdentifier((string) $map[$campaignKey]['acuerdos_table']);
        $col = $this->assertSqlIdentifier((string) $map[$campaignKey]['acuerdos_date_column']);

        $groupExpr = match ($granularity) {
            'day' => "DATE(`{$col}`)",
            'hour' => "DATE_FORMAT(`{$col}`, '%Y-%m-%d %H:00:00')",
            'week' => "DATE_FORMAT(`{$col}`, '%x-%v')",
            'month' => "DATE_FORMAT(`{$col}`, '%Y-%m')",
        };

        $entry = $map[$campaignKey];
        [$filterSql, $filterBind] = $this->filterSqlClause($entry);

        $pdo = Database::getCampaignPdo($campaignKey);
        $sql = "SELECT {$groupExpr} AS bucket, COUNT(*) AS total
                FROM `{$table}`
                WHERE `{$col}` BETWEEN :from AND :to{$filterSql}
                GROUP BY {$groupExpr}
                ORDER BY {$groupExpr}";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':from', $from->format('Y-m-d H:i:s'));
        $stmt->bindValue(':to', $to->format('Y-m-d H:i:s'));
        foreach ($filterBind as $param => $value) {
            $stmt->bindValue(':' . $param, $value);
        }
        $stmt->execute();

        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = [
                'bucket' => (string) ($row['bucket'] ?? ''),
                'total' => (int) ($row['total'] ?? 0),
            ];
        }
        return $out;
    }

    public function countAcuerdosTotal(string $campaignKey, DateTimeInterface $from, DateTimeInterface $to): int
    {
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        if (!isset($map[$campaignKey])) {
            throw new InvalidArgumentException('invalid_campaign');
        }

        $entry = $map[$campaignKey];
        $table = $this->assertSqlIdentifier((string) $entry['acuerdos_table']);
        $col = $this->assertSqlIdentifier((string) $entry['acuerdos_date_column']);
        [$filterSql, $filterBind] = $this->filterSqlClause($entry);

        $pdo = Database::getCampaignPdo($campaignKey);
        $sql = "SELECT COUNT(*) AS c FROM `{$table}` WHERE `{$col}` BETWEEN :from AND :to{$filterSql}";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':from', $from->format('Y-m-d H:i:s'));
        $stmt->bindValue(':to', $to->format('Y-m-d H:i:s'));
        foreach ($filterBind as $param => $value) {
            $stmt->bindValue(':' . $param, $value);
        }
        $stmt->execute();
        $v = $stmt->fetchColumn();

        return $v !== false ? (int) $v : 0;
    }

    /**
     * Filtro opcional por columna = valor (valor enlazado, no interpolado).
     *
     * @param array<string, mixed> $entry
     * @return array{0: string, 1: array<string, string>}
     */
    private function filterSqlClause(array $entry): array
    {
        $fcol = $entry['acuerdos_filter_column'] ?? null;
        $fval = $entry['acuerdos_filter_value'] ?? null;
        if ($fcol === null || $fval === null) {
            return ['', []];
        }
        $fcol = trim((string) $fcol);
        $fval = trim((string) $fval);
        if ($fcol === '' || $fval === '') {
            return ['', []];
        }
        $safeCol = $this->assertSqlIdentifier($fcol);

        return [
            " AND `{$safeCol}` = :acuerdos_filter_val",
            ['acuerdos_filter_val' => $fval],
        ];
    }

    private function assertSqlIdentifier(string $name): string
    {
        if ($name === '' || !preg_match('/^[A-Za-z0-9_]+$/', $name)) {
            throw new InvalidArgumentException('invalid_identifier');
        }
        return $name;
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

final class AdminModel
{
    private const ROLES = ['admin', 'gestor', 'visualizador'];

    public function isValidRole(string $name): bool
    {
        return in_array($name, self::ROLES, true);
    }

    /**
     * @return list<array{id: int, username: string, is_active: int, role_name: string, campaign_keys: list<string>}>
     */
    public function listUsersWithCampaigns(): array
    {
        $sql = 'SELECT u.id, u.username, u.is_active, u.role AS role_name,
                (SELECT GROUP_CONCAT(uca.campaign_key ORDER BY uca.campaign_key SEPARATOR ",")
                 FROM user_campaign_access uca WHERE uca.user_id = u.id) AS campaign_keys_csv
                FROM users u
                ORDER BY u.id ASC';
        $stmt = Database::getMasterPdo()->prepare($sql);
        $stmt->execute();
        $out = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $csv = (string) ($row['campaign_keys_csv'] ?? '');
            $keys = $csv === '' ? [] : explode(',', $csv);
            $active = (string) ($row['is_active'] ?? '') === 'activo';
            $out[] = [
                'id' => (int) $row['id'],
                'username' => (string) $row['username'],
                'is_active' => $active ? 1 : 0,
                'role_name' => (string) $row['role_name'],
                'campaign_keys' => array_values(array_filter($keys, static fn ($k) => $k !== '')),
            ];
        }
        return $out;
    }

    public function usernameExists(string $username, ?int $excludeUserId = null): bool
    {
        if ($excludeUserId === null) {
            $stmt = Database::getMasterPdo()->prepare('SELECT 1 FROM users WHERE username = :u LIMIT 1');
            $stmt->execute(['u' => $username]);
        } else {
            $stmt = Database::getMasterPdo()->prepare(
                'SELECT 1 FROM users WHERE username = :u AND id != :id LIMIT 1'
            );
            $stmt->execute(['u' => $username, 'id' => $excludeUserId]);
        }
        return (bool) $stmt->fetchColumn();
    }

    public function createUser(string $username, string $passwordHash, string $role, string $isActive = 'activo'): int
    {
        if (!$this->isValidRole($role)) {
            throw new \InvalidArgumentException('invalid_role');
        }
        if ($isActive !== 'activo' && $isActive !== 'inactivo') {
            throw new \InvalidArgumentException('invalid_is_active');
        }
        $pdo = Database::getMasterPdo();
        $stmt = $pdo->prepare(
            'INSERT INTO users (username, password_hash, role, is_active) VALUES (:u, :p, :r, :a)'
        );
        $stmt->execute([
            'u' => $username,
            'p' => $passwordHash,
            'r' => $role,
            'a' => $isActive,
        ]);
        return (int) $pdo->lastInsertId();
    }

    public function getUserRoleName(int $userId): ?string
    {
        $stmt = Database::getMasterPdo()->prepare('SELECT role FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $v = $stmt->fetchColumn();
        return $v !== false ? (string) $v : null;
    }

    public function updateUser(int $userId, ?string $isActive = null, ?string $role = null): void
    {
        if ($isActive !== null && $isActive !== 'activo' && $isActive !== 'inactivo') {
            throw new \InvalidArgumentException('invalid_is_active');
        }
        if ($role !== null && !$this->isValidRole($role)) {
            throw new \InvalidArgumentException('invalid_role');
        }

        $pdo = Database::getMasterPdo();
        if ($isActive !== null && $role !== null) {
            $stmt = $pdo->prepare('UPDATE users SET is_active = :a, role = :r WHERE id = :id');
            $stmt->execute(['a' => $isActive, 'r' => $role, 'id' => $userId]);
            return;
        }
        if ($isActive !== null) {
            $stmt = $pdo->prepare('UPDATE users SET is_active = :a WHERE id = :id');
            $stmt->execute(['a' => $isActive, 'id' => $userId]);
            return;
        }
        if ($role !== null) {
            $stmt = $pdo->prepare('UPDATE users SET role = :r WHERE id = :id');
            $stmt->execute(['r' => $role, 'id' => $userId]);
        }
    }

    /**
     * @param list<string> $campaignKeys validados contra whitelist por el controlador
     */
    public function replaceUserCampaignAccess(int $userId, array $campaignKeys): void
    {
        $pdo = Database::getMasterPdo();
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare('DELETE FROM user_campaign_access WHERE user_id = :id');
            $del->execute(['id' => $userId]);
            $ins = $pdo->prepare('INSERT INTO user_campaign_access (user_id, campaign_key) VALUES (:u, :c)');
            foreach ($campaignKeys as $key) {
                if ($key === '') {
                    continue;
                }
                $ins->execute(['u' => $userId, 'c' => $key]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
